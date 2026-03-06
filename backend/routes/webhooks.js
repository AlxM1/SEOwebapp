const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');

const router = express.Router();

// LemonSqueezy tier mapping — set your actual variant IDs in .env
// LEMON_VARIANT_STARTER, LEMON_VARIANT_PRO, LEMON_VARIANT_AGENCY
function getVariantTier(variantId) {
  const variantStr = String(variantId);
  const map = {
    [process.env.LEMON_VARIANT_STARTER]: 'starter',
    [process.env.LEMON_VARIANT_PRO]: 'pro',
    [process.env.LEMON_VARIANT_AGENCY]: 'agency',
  };
  return map[variantStr] || null;
}

// Verify LemonSqueezy webhook signature
function verifySignature(rawBody, signature) {
  if (!process.env.LEMON_WEBHOOK_SECRET) return true; // skip in dev
  const hmac = crypto.createHmac('sha256', process.env.LEMON_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

// LemonSqueezy sends raw JSON body — need raw body for signature verification
router.post('/lemonsqueezy', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-signature'] || '';
  const rawBody = req.body;

  if (!verifySignature(rawBody, signature)) {
    console.warn('[webhook] Invalid LemonSqueezy signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const eventName = event.meta?.event_name;
  const data = event.data?.attributes;
  const customData = event.meta?.custom_data || {};

  console.log(`[webhook] LemonSqueezy event: ${eventName}`);

  try {
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_resumed':
      case 'subscription_unpaused': {
        await handleSubscriptionActive(event, data, customData);
        break;
      }

      case 'subscription_updated': {
        // Handle plan changes (upgrade/downgrade)
        await handleSubscriptionActive(event, data, customData);
        break;
      }

      case 'subscription_cancelled':
      case 'subscription_expired':
      case 'subscription_paused': {
        await handleSubscriptionInactive(data, customData);
        break;
      }

      default:
        console.log(`[webhook] Unhandled event: ${eventName}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[webhook] Error processing event:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

async function handleSubscriptionActive(event, data, customData) {
  const variantId = data?.variant_id;
  const tier = getVariantTier(variantId);
  if (!tier) {
    console.warn(`[webhook] Unknown variant ID: ${variantId}`);
    return;
  }

  const email = data?.user_email || customData?.email;
  const agencyId = customData?.agency_id ? parseInt(customData.agency_id) : null;
  const lsSubscriptionId = event.data?.id;
  const status = data?.status;

  if (!email && !agencyId) {
    console.warn('[webhook] No email or agency_id in webhook data');
    return;
  }

  // Find or create agency
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
      notes = CONCAT(COALESCE(notes, ''), ' | LS sub:', $2, ' status:', $3)
    WHERE id = $4`,
    [tier, lsSubscriptionId, status, agency.id]
  );

  // Update all active API keys for this agency to new tier limits
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

async function handleSubscriptionInactive(data, customData) {
  const email = data?.user_email || customData?.email;
  const agencyId = customData?.agency_id ? parseInt(customData.agency_id) : null;

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
  await pool.query(
    "UPDATE agencies SET tier = 'free' WHERE id = $1",
    [agency.id]
  );

  await pool.query(
    "UPDATE api_keys SET tier = 'free', monthly_limit = 50 WHERE agency_id = $1 AND active = true",
    [agency.id]
  );

  console.log(`[webhook] Downgraded agency ${agency.id} (${agency.email}) to free (subscription inactive)`);
}

module.exports = router;
