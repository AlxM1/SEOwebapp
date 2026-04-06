const express = require('express');
const { pool } = require('../db');
const { syncToQuickBooks } = require('../services/quickbooks');

const router = express.Router();

// Stripe price ID → tier mapping
function getPriceTier(priceId) {
  const map = {
    [process.env.STRIPE_PRICE_STARTER]: 'starter',
    [process.env.STRIPE_PRICE_PRO]: 'pro',
    [process.env.STRIPE_PRICE_AGENCY]: 'agency',
  };
  return map[priceId] || null;
}

// Stripe webhook — raw body required for signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not configured — rejecting all webhooks');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.warn('[webhook] Stripe signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log(`[webhook] Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          // Retrieve subscription to get the price ID (authoritative tier source)
          let tier = null;
          if (session.subscription) {
            try {
              const sub = await stripe.subscriptions.retrieve(session.subscription);
              const priceId = sub.items?.data?.[0]?.price?.id;
              tier = getPriceTier(priceId);
            } catch (e) {
              console.warn('[webhook] Could not retrieve subscription for tier resolution:', e.message);
            }
          }
          // Fallback to metadata only if price lookup fails
          if (!tier) tier = session.metadata?.tier;
          // Validate tier is a known value
          if (tier && !['starter', 'pro', 'agency'].includes(tier)) {
            console.warn(`[webhook] Invalid tier from metadata: ${tier}`);
            tier = null;
          }
          const email = session.customer_email || session.metadata?.email;
          const agencyId = session.metadata?.agency_id ? parseInt(session.metadata.agency_id) : null;
          if (tier && (email || agencyId)) {
            await handleSubscriptionActive(tier, email, agencyId, session.subscription);
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = getPriceTier(priceId) || sub.metadata?.tier;
        const agencyId = sub.metadata?.agency_id ? parseInt(sub.metadata.agency_id) : null;

        if (sub.status === 'active' || sub.status === 'trialing') {
          // Get customer email from Stripe
          let email = null;
          if (sub.customer) {
            try {
              const customer = await stripe.customers.retrieve(sub.customer);
              email = customer.email;
            } catch (e) {
              console.warn('[webhook] Could not fetch customer:', e.message);
            }
          }
          if (tier) {
            await handleSubscriptionActive(tier, email, agencyId, sub.id);
          }
        } else if (['canceled', 'unpaid', 'past_due', 'incomplete_expired'].includes(sub.status)) {
          let email = null;
          if (sub.customer) {
            try {
              const customer = await stripe.customers.retrieve(sub.customer);
              email = customer.email;
            } catch (e) {}
          }
          await handleSubscriptionInactive(email, agencyId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const agencyId = sub.metadata?.agency_id ? parseInt(sub.metadata.agency_id) : null;
        let email = null;
        if (sub.customer) {
          try {
            const stripe2 = require('stripe')(process.env.STRIPE_SECRET_KEY);
            const customer = await stripe2.customers.retrieve(sub.customer);
            email = customer.email;
          } catch (e) {}
        }
        await handleSubscriptionInactive(email, agencyId);

        // QB: log cancellation as a journal note via sync log metadata
        const cancelId = `cancel_${sub.id}_${Date.now()}`;
        syncToQuickBooks({
          id: cancelId,
          _type: 'cancellation',
          customer_email: email,
          amount_paid: 0,
          total: 0,
          currency: 'usd',
          created: Math.floor(Date.now() / 1000),
          lines: { data: [] },
          _note: `Subscription cancelled: ${sub.id}`,
        }).catch(err =>
          console.error('[webhook] QB cancellation note failed:', err.message)
        );
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log(`[webhook] Payment succeeded for invoice ${invoice.id}, customer ${invoice.customer}`);
        // Async QB sync — don't block webhook response
        syncToQuickBooks(invoice).catch(err =>
          console.error('[webhook] QB sync failed:', err.message)
        );
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(`[webhook] Payment failed for customer ${invoice.customer}, subscription ${invoice.subscription}`);
        // Stripe handles retry logic automatically. After final retry fails,
        // subscription.deleted event fires and we downgrade then.
        break;
      }

      default:
        console.log(`[webhook] Unhandled event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[webhook] Error processing event:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

async function handleSubscriptionActive(tier, email, agencyId, subscriptionId) {
  // Find agency
  let agency;
  if (agencyId) {
    const result = await pool.query('SELECT * FROM agencies WHERE id = $1', [agencyId]);
    agency = result.rows[0];
  }
  if (!agency && email) {
    const result = await pool.query('SELECT * FROM agencies WHERE email = $1', [email]);
    agency = result.rows[0];
  }
  if (!agency && email) {
    // Auto-create agency for new paying customer
    const result = await pool.query(
      'INSERT INTO agencies (name, email, tier) VALUES ($1, $2, $3) RETURNING *',
      [email.split('@')[0], email, tier]
    );
    agency = result.rows[0];
  }

  if (!agency) {
    console.warn(`[webhook] Could not find/create agency for email: ${email}`);
    return;
  }

  // Get tier limits
  const tierLimits = await pool.query('SELECT monthly_analyses FROM tier_limits WHERE tier = $1', [tier]);
  const monthlyLimit = tierLimits.rows[0]?.monthly_analyses || 50;

  // Update agency tier
  await pool.query(
    `UPDATE agencies SET
      tier = $1,
      active = true,
      notes = CONCAT(COALESCE(notes, ''), ' | Stripe sub:', $2)
    WHERE id = $3`,
    [tier, subscriptionId || 'unknown', agency.id]
  );

  // Update all active API keys for this agency
  await pool.query(
    `UPDATE api_keys SET
      tier = $1,
      monthly_limit = $2,
      usage_reset_at = CASE WHEN usage_reset_at < NOW() THEN DATE_TRUNC('month', NOW()) + INTERVAL '1 month' ELSE usage_reset_at END
    WHERE agency_id = $3 AND active = true`,
    [tier, monthlyLimit, agency.id]
  );

  console.log(`[webhook] Upgraded agency ${agency.id} (${agency.email}) to ${tier}`);
}

async function handleSubscriptionInactive(email, agencyId) {
  let agency;
  if (agencyId) {
    const result = await pool.query('SELECT * FROM agencies WHERE id = $1', [agencyId]);
    agency = result.rows[0];
  }
  if (!agency && email) {
    const result = await pool.query('SELECT * FROM agencies WHERE email = $1', [email]);
    agency = result.rows[0];
  }
  if (!agency) return;

  // Downgrade to free
  await pool.query("UPDATE agencies SET tier = 'free' WHERE id = $1", [agency.id]);
  await pool.query("UPDATE api_keys SET tier = 'free', monthly_limit = 50 WHERE agency_id = $1 AND active = true", [agency.id]);

  console.log(`[webhook] Downgraded agency ${agency.id} (${agency.email}) to free`);
}

module.exports = router;
