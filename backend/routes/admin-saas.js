const express = require('express');
const { pool } = require('../db');
const crypto = require('crypto');
const { generateApiKey, hashKey } = require('../middleware/apiKey');

const router = express.Router();

// Simple admin token check (set ADMIN_TOKEN in .env)
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.admin_token;
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Admin token required' });
  }
  next();
}

// List all agencies
router.get('/agencies', adminAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT a.*, 
      COUNT(DISTINCT k.id) as key_count,
      SUM(k.usage_this_month) as total_usage_this_month
    FROM agencies a
    LEFT JOIN api_keys k ON k.agency_id = a.id AND k.active = true
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  res.json(rows);
});

// Create agency
router.post('/agencies', adminAuth, async (req, res) => {
  const { name, email, tier = 'free', notes } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });

  const { rows } = await pool.query(
    'INSERT INTO agencies (name, email, tier, notes) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, email, tier, notes]
  );
  res.json(rows[0]);
});

// Update agency tier
router.patch('/agencies/:id', adminAuth, async (req, res) => {
  const { tier, active, notes } = req.body;
  const { rows } = await pool.query(
    `UPDATE agencies SET 
      tier = COALESCE($1, tier), 
      active = COALESCE($2, active),
      notes = COALESCE($3, notes)
     WHERE id = $4 RETURNING *`,
    [tier, active, notes, req.params.id]
  );
  res.json(rows[0]);
});

// Generate API key for agency
router.post('/agencies/:id/keys', adminAuth, async (req, res) => {
  const { label } = req.body;
  
  const agency = await pool.query('SELECT * FROM agencies WHERE id = $1', [req.params.id]);
  if (!agency.rows.length) return res.status(404).json({ error: 'Agency not found' });

  const agencyData = agency.rows[0];
  const tierLimits = await pool.query('SELECT * FROM tier_limits WHERE tier = $1', [agencyData.tier]);
  const monthlyLimit = tierLimits.rows[0]?.monthly_analyses || 50;

  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.split('_')[0] + '_' + rawKey.split('_')[1].slice(0, 6);

  const { rows } = await pool.query(
    `INSERT INTO api_keys (agency_id, key_hash, key_prefix, label, tier, monthly_limit)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.params.id, keyHash, keyPrefix, label || 'Default', agencyData.tier, monthlyLimit]
  );

  // Return the raw key ONCE — not stored, cannot be recovered
  res.json({ ...rows[0], raw_key: rawKey, warning: 'Save this key — it cannot be shown again' });
});

// Revoke API key
router.delete('/keys/:id', adminAuth, async (req, res) => {
  await pool.query('UPDATE api_keys SET active = false WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// Usage stats
router.get('/stats', adminAuth, async (req, res) => {
  const [agencies, totalUsage, recentUsage, topEndpoints] = await Promise.all([
    pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE active) as active FROM agencies'),
    pool.query('SELECT SUM(usage_this_month) as total FROM api_keys WHERE active = true'),
    pool.query('SELECT COUNT(*) as calls FROM usage_log WHERE created_at > NOW() - INTERVAL \'24 hours\''),
    pool.query(`
      SELECT endpoint, COUNT(*) as calls, AVG(response_time_ms)::int as avg_ms
      FROM usage_log WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY endpoint ORDER BY calls DESC
    `),
  ]);

  res.json({
    agencies: agencies.rows[0],
    totalUsageThisMonth: totalUsage.rows[0]?.total || 0,
    last24hCalls: recentUsage.rows[0]?.calls || 0,
    topEndpoints: topEndpoints.rows,
  });
});

module.exports = router;
