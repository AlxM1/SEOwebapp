const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

const router = express.Router();

// Add URL to monitoring
router.post('/add', authenticateToken, async (req, res) => {
  const { url, alertEmail, alertThreshold = 10, checkFrequency = 'weekly' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const result = await pool.query(
    `INSERT INTO monitored_urls (user_id, url, alert_email, alert_threshold, check_frequency)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user.userId, url, alertEmail || req.user.email, alertThreshold, checkFrequency]
  );
  res.json(result.rows[0]);
});

// List monitored URLs
router.get('/list', authenticateToken, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM monitored_urls WHERE user_id = $1 AND active = true ORDER BY created_at DESC',
    [req.user.userId]
  );
  res.json(result.rows);
});

// Delete monitored URL
router.delete('/:id', authenticateToken, async (req, res) => {
  await pool.query('UPDATE monitored_urls SET active = false WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
  res.json({ ok: true });
});

// Manual check for a monitored URL
router.post('/:id/check', authenticateToken, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM monitored_urls WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  
  const result = await checkUrl(rows[0]);
  res.json(result);
});

// Get history for a monitored URL
router.get('/:id/history', authenticateToken, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM monitoring_history WHERE monitored_url_id = $1 ORDER BY checked_at DESC LIMIT 30',
    [req.params.id]
  );
  res.json(result.rows);
});

async function checkUrl(monitoredUrl) {
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
  
  const [crawlRes, geoRes] = await Promise.all([
    fetch(`${baseUrl}/api/crawl/analyze`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ url: monitoredUrl.url }) }).then(r => r.json()).catch(() => ({})),
    fetch(`${baseUrl}/api/geo/score`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ url: monitoredUrl.url }) }).then(r => r.json()).catch(() => ({})),
  ]);

  const seoScore = crawlRes.seoScore || 0;
  const geoScore = geoRes.geoScore || 0;
  const issuesCount = crawlRes.issues?.length || 0;

  // Save to history
  await pool.query(
    'INSERT INTO monitoring_history (monitored_url_id, seo_score, geo_score, issues_count, checked_at) VALUES ($1, $2, $3, $4, NOW())',
    [monitoredUrl.id, seoScore, geoScore, issuesCount]
  );

  // Check if alert needed
  if (monitoredUrl.last_seo_score !== null) {
    const drop = monitoredUrl.last_seo_score - seoScore;
    if (drop >= monitoredUrl.alert_threshold && monitoredUrl.alert_email) {
      await sendAlertEmail(monitoredUrl, seoScore, geoScore, drop, crawlRes.issues || []);
    }
  }

  // Update last scores
  await pool.query(
    'UPDATE monitored_urls SET last_seo_score = $1, last_geo_score = $2, last_checked_at = NOW() WHERE id = $3',
    [seoScore, geoScore, monitoredUrl.id]
  );

  return { seoScore, geoScore, issuesCount };
}

async function sendAlertEmail(monitoredUrl, seoScore, geoScore, drop, issues) {
  if (!process.env.SMTP_HOST) return;
  
  const brandName = process.env.BRAND_NAME || 'SEO Analytics';
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `alerts@${process.env.BRAND_NAME || 'seoanalytics'}.com`,
    to: monitoredUrl.alert_email,
    subject: `SEO Alert: Score dropped ${drop} points — ${monitoredUrl.url}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#dc2626">SEO Score Alert</h2>
        <p><strong>${monitoredUrl.url}</strong> dropped <strong>${drop} points</strong></p>
        <p>Current SEO Score: <strong>${seoScore}/100</strong> | GEO Score: <strong>${geoScore}/100</strong></p>
        ${issues.length ? `<h3>Issues detected:</h3><ul>${issues.slice(0,5).map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
        <p style="color:#666;font-size:12px">Sent by ${brandName}</p>
      </div>
    `,
  }).catch(e => console.warn('Alert email failed:', e.message));
}

// Export checkUrl for use by scheduler
module.exports = router;
module.exports.checkUrl = checkUrl;
