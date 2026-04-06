const { pool } = require('../db');
const crypto = require('crypto');

// Endpoints that require an API key (public SaaS endpoints)
const PROTECTED_ENDPOINTS = ['/api/crawl', '/api/geo', '/api/aeo', '/api/preview', '/api/technical', '/api/keywords', '/api/sitecrawl', '/api/schema', '/api/compare', '/api/bulk', '/api/report', '/api/monitor'];

// Feature → endpoint mapping for tier gating
const ENDPOINT_FEATURE_MAP = {
  '/api/crawl': 'crawl',
  '/api/geo': 'geo',
  '/api/preview': 'crawl',
  '/api/technical': 'crawl',
  '/api/keywords': 'crawl',
  '/api/schema': 'crawl',
  '/api/compare': 'compare',
  '/api/bulk': 'bulk',
  '/api/sitecrawl': 'sitecrawl',
  '/api/report': 'pdf',
  '/api/monitor': 'monitor',
  '/api/aeo': 'aeo',
};

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function apiKeyMiddleware(req, res, next) {
  // Skip if not a protected endpoint
  const isProtected = PROTECTED_ENDPOINTS.some(ep => req.path.startsWith(ep));
  if (!isProtected) return next();

  // Skip if internal JWT auth (existing user auth still works)
  if (req.headers.authorization?.startsWith('Bearer ') && !req.headers['x-api-key']) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required', 
      message: 'Include X-Api-Key header or api_key query parameter',
      docs: 'https://app.seoh.ca/docs'
    });
  }

  const keyHash = hashKey(apiKey);

  try {
    // Look up the key
    const { rows } = await pool.query(`
      SELECT k.*, a.name as agency_name, a.email as agency_email, a.active as agency_active,
             t.features as tier_features
      FROM api_keys k
      JOIN agencies a ON a.id = k.agency_id
      JOIN tier_limits t ON t.tier = k.tier
      WHERE k.key_hash = $1
    `, [keyHash]);

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const keyRecord = rows[0];

    if (!keyRecord.active || !keyRecord.agency_active) {
      return res.status(403).json({ error: 'API key or account is disabled' });
    }

    // Reset monthly usage if needed
    if (new Date() > new Date(keyRecord.usage_reset_at)) {
      await pool.query(`
        UPDATE api_keys SET usage_this_month = 0, usage_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
        WHERE id = $1
      `, [keyRecord.id]);
      keyRecord.usage_this_month = 0;
    }

    // Check quota
    if (keyRecord.usage_this_month >= keyRecord.monthly_limit) {
      return res.status(429).json({ 
        error: 'Monthly quota exceeded',
        used: keyRecord.usage_this_month,
        limit: keyRecord.monthly_limit,
        tier: keyRecord.tier,
        resets_at: keyRecord.usage_reset_at,
      });
    }

    // Check feature access
    const endpoint = PROTECTED_ENDPOINTS.find(ep => req.path.startsWith(ep));
    const feature = ENDPOINT_FEATURE_MAP[endpoint];
    if (feature && keyRecord.tier_features && !keyRecord.tier_features[feature]) {
      return res.status(403).json({
        error: `Feature not available on ${keyRecord.tier} tier`,
        feature,
        upgrade: 'https://app.seoh.ca/pricing',
      });
    }

    // Increment usage
    await pool.query(`
      UPDATE api_keys SET usage_this_month = usage_this_month + 1, last_used_at = NOW()
      WHERE id = $1
    `, [keyRecord.id]);

    // Log usage
    const startTime = Date.now();
    res.on('finish', () => {
      pool.query(`
        INSERT INTO usage_log (api_key_id, agency_id, endpoint, url_analyzed, response_time_ms, success)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [keyRecord.id, keyRecord.agency_id, endpoint, req.body?.url || null, Date.now() - startTime, res.statusCode < 400])
      .catch(() => {});
    });

    // Attach to request
    req.apiKey = keyRecord;
    req.agency = { id: keyRecord.agency_id, name: keyRecord.agency_name, email: keyRecord.agency_email };

    // Add usage headers to response
    res.set({
      'X-RateLimit-Limit': keyRecord.monthly_limit,
      'X-RateLimit-Remaining': keyRecord.monthly_limit - keyRecord.usage_this_month - 1,
      'X-RateLimit-Reset': keyRecord.usage_reset_at,
    });

    next();
  } catch (error) {
    console.error('API key middleware error:', error);
    return res.status(500).json({ error: 'Internal error checking API key' });
  }
}

// Generate a new API key
function generateApiKey() {
  const prefix = 'seoh';
  const random = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${random}`;
}

module.exports = { apiKeyMiddleware, generateApiKey, hashKey };
