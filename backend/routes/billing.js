const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const TIER_PRICES = {
  starter: { price: '$59.99/mo', analyses: '500', variantEnv: 'LEMON_VARIANT_STARTER' },
  pro:     { price: '$109.99/mo', analyses: '2,000', variantEnv: 'LEMON_VARIANT_PRO' },
  agency:  { price: '$399.99/mo', analyses: '10,000', variantEnv: 'LEMON_VARIANT_AGENCY' },
};

// Get checkout URL for a tier (authenticated)
router.get('/checkout/:tier', authenticateToken, async (req, res) => {
  const { tier } = req.params;
  if (!TIER_PRICES[tier]) return res.status(400).json({ error: 'Invalid tier' });

  const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
  if (!userRows.length) return res.status(404).json({ error: 'User not found' });
  const user = userRows[0];

  const agencyResult = await pool.query('SELECT id FROM agencies WHERE email = $1', [user.email]);
  const agencyId = agencyResult.rows[0]?.id;

  const variantId = process.env[TIER_PRICES[tier].variantEnv];
  const storeSlug = process.env.LEMON_STORE_SLUG;

  if (!variantId || !storeSlug) {
    return res.status(503).json({ 
      error: 'Billing not configured',
      message: 'Contact alex@00raiser.com to upgrade your plan'
    });
  }

  // Build LemonSqueezy checkout URL
  const params = new URLSearchParams({
    'checkout[email]': user.email,
    'checkout[custom][agency_id]': agencyId || '',
    'checkout[custom][email]': user.email,
  });

  const checkoutUrl = `https://${storeSlug}.lemonsqueezy.com/buy/${variantId}?${params.toString()}`;

  res.json({ checkoutUrl, tier, price: TIER_PRICES[tier].price });
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

// Customer portal (manage subscription)
router.get('/portal', authenticateToken, async (req, res) => {
  const storeSlug = process.env.LEMON_STORE_SLUG;
  if (!storeSlug) return res.status(503).json({ error: 'Billing not configured' });
  
  // LemonSqueezy customer portal
  res.json({ portalUrl: `https://${storeSlug}.lemonsqueezy.com/billing` });
});

module.exports = router;
