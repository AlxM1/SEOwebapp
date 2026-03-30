const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const TIER_PRICES = {
  starter: { price: '$59.99/mo', analyses: '500', priceEnv: 'STRIPE_PRICE_STARTER' },
  pro:     { price: '$109.99/mo', analyses: '2,000', priceEnv: 'STRIPE_PRICE_PRO' },
  agency:  { price: '$399.99/mo', analyses: '10,000', priceEnv: 'STRIPE_PRICE_AGENCY' },
};

// Get Stripe Checkout URL for a tier (authenticated)
router.get('/checkout/:tier', authenticateToken, async (req, res) => {
  const { tier } = req.params;
  if (!TIER_PRICES[tier]) return res.status(400).json({ error: 'Invalid tier' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      error: 'Billing not configured',
      message: 'Contact alex@seoh.ca to upgrade your plan'
    });
  }

  const priceId = process.env[TIER_PRICES[tier].priceEnv];
  if (!priceId) {
    return res.status(503).json({ error: `Price not configured for ${tier} tier` });
  }

  const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
  if (!userRows.length) return res.status(404).json({ error: 'User not found' });
  const user = userRows[0];

  const agencyResult = await pool.query('SELECT id FROM agencies WHERE email = $1', [user.email]);
  const agencyId = agencyResult.rows[0]?.id;

  try {
    // Find or create Stripe customer
    let customerId;
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { agency_id: String(agencyId || '') }
      });
      customerId = customer.id;
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin || 'https://analysis.seoh.ca'}/billing?success=true`,
      cancel_url: `${req.headers.origin || 'https://analysis.seoh.ca'}/billing?cancelled=true`,
      metadata: {
        agency_id: String(agencyId || ''),
        email: user.email,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          agency_id: String(agencyId || ''),
          tier: tier,
        }
      }
    });

    res.json({ checkoutUrl: session.url, tier, price: TIER_PRICES[tier].price });
  } catch (err) {
    console.error('[billing] Stripe checkout error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe Customer Portal (manage subscription — upgrade/downgrade/cancel)
router.get('/portal', authenticateToken, async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Billing not configured' });
  }

  const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
  if (!userRows.length) return res.status(404).json({ error: 'User not found' });
  const user = userRows[0];

  try {
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'No billing account found. Subscribe first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${req.headers.origin || 'https://analysis.seoh.ca'}/billing`,
    });

    res.json({ portalUrl: session.url });
  } catch (err) {
    console.error('[billing] Portal error:', err.message);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Get pricing info (public)
router.get('/pricing', async (req, res) => {
  const { rows: tiers } = await pool.query('SELECT * FROM tier_limits ORDER BY monthly_analyses');

  res.json({
    tiers: tiers.map(t => ({
      ...t,
      price: { free: '$0', starter: '$59.99', pro: '$109.99', agency: '$399.99' }[t.tier] || 'Custom',
    })),
  });
});

module.exports = router;
