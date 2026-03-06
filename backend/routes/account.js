const express = require('express');
const { pool } = require('../db');
const { generateApiKey, hashKey } = require('../middleware/apiKey');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get agency account info (for logged-in agency users)
router.get('/me', authenticateToken, async (req, res) => {
  const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
  if (!userRows.length) return res.status(404).json({ error: 'User not found' });
  
  const user = userRows[0];
  const agencyEmail = user.email;
  
  // Find or create agency record for this user
  let agencyResult = await pool.query('SELECT * FROM agencies WHERE email = $1', [agencyEmail]);
  
  if (!agencyResult.rows.length) {
    agencyResult = await pool.query(
      'INSERT INTO agencies (name, email, tier) VALUES ($1, $2, $3) RETURNING *',
      [user.email.split('@')[0], agencyEmail, 'free']
    );
  }
  
  const agency = agencyResult.rows[0];
  const { rows: keys } = await pool.query(
    'SELECT id, key_prefix, label, tier, monthly_limit, usage_this_month, usage_reset_at, last_used_at, active, created_at FROM api_keys WHERE agency_id = $1 ORDER BY created_at DESC',
    [agency.id]
  );
  
  const tierLimits = await pool.query('SELECT * FROM tier_limits WHERE tier = $1', [agency.tier]);
  
  res.json({ agency, keys, tierFeatures: tierLimits.rows[0]?.features || {} });
});

// Generate new API key (self-service)
router.post('/keys', authenticateToken, async (req, res) => {
  const { label } = req.body;
  const { rows: userRows } = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
  
  const agencyResult = await pool.query('SELECT * FROM agencies WHERE email = $1', [userRows[0].email]);
  if (!agencyResult.rows.length) return res.status(404).json({ error: 'Agency not found' });
  const agency = agencyResult.rows[0];

  // Max 2 active keys per agency on free tier, 10 on paid
  const { rows: existingKeys } = await pool.query('SELECT COUNT(*) as count FROM api_keys WHERE agency_id = $1 AND active = true', [agency.id]);
  const maxKeys = agency.tier === 'free' ? 2 : 10;
  if (parseInt(existingKeys[0].count) >= maxKeys) {
    return res.status(400).json({ error: `Maximum ${maxKeys} active keys for ${agency.tier} tier` });
  }

  const tierLimits = await pool.query('SELECT * FROM tier_limits WHERE tier = $1', [agency.tier]);
  const monthlyLimit = tierLimits.rows[0]?.monthly_analyses || 50;

  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.split('_')[0] + '_' + rawKey.split('_')[1].slice(0, 6);

  const { rows } = await pool.query(
    'INSERT INTO api_keys (agency_id, key_hash, key_prefix, label, tier, monthly_limit) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [agency.id, keyHash, keyPrefix, label || 'My API Key', agency.tier, monthlyLimit]
  );

  res.json({ ...rows[0], raw_key: rawKey, warning: 'Save this key — it cannot be shown again' });
});

// Usage history
router.get('/usage', authenticateToken, async (req, res) => {
  const { rows: userRows } = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
  const agencyResult = await pool.query('SELECT id FROM agencies WHERE email = $1', [userRows[0].email]);
  if (!agencyResult.rows.length) return res.json({ calls: [], total: 0 });

  const { rows } = await pool.query(`
    SELECT endpoint, COUNT(*) as calls, AVG(response_time_ms)::int as avg_ms, 
      DATE_TRUNC('day', created_at) as date
    FROM usage_log WHERE agency_id = $1 AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY endpoint, DATE_TRUNC('day', created_at)
    ORDER BY date DESC
  `, [agencyResult.rows[0].id]);

  res.json({ calls: rows, total: rows.reduce((s, r) => s + parseInt(r.calls), 0) });
});

module.exports = router;
