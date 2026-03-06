const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { initializeDatabase } = require('./db');

// Define __dirname for CommonJS
const currentDir = path.dirname(require.main.filename);

const { apiKeyMiddleware } = require('./middleware/apiKey');
const adminSaasRoutes = require('./routes/admin-saas');
const accountRoutes = require('./routes/account');
const webhookRoutes = require('./routes/webhooks');
const billingRoutes = require('./routes/billing');

const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const crawlRoutes = require('./routes/crawl');
const geoRoutes = require('./routes/geo');
const compareRoutes = require('./routes/compare');
const bulkRoutes = require('./routes/bulk');
const reportRoutes = require('./routes/report');
const previewRoutes = require('./routes/preview');
const technicalRoutes = require('./routes/technical');
const keywordsRoutes = require('./routes/keywords');
const sitecrawlRoutes = require('./routes/sitecrawl');
const monitorRoutes = require('./routes/monitor');
const schemaRoutes = require('./routes/schema');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Webhooks need raw body — register BEFORE express.json()
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());
app.use(express.static('public'));

// Initialize database
initializeDatabase();

// API key middleware (SaaS — before route registrations)
app.use(apiKeyMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/crawl', crawlRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/preview', previewRoutes);
app.use('/api/technical', technicalRoutes);
app.use('/api/keywords', keywordsRoutes);
app.use('/api/sitecrawl', sitecrawlRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/schema', schemaRoutes);
app.use('/api/admin-saas', adminSaasRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/billing', billingRoutes);

// Public API docs endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'SEO & GEO Analysis API',
    version: '2.0.0',
    docs: 'https://app.seoh.ca/docs',
    endpoints: {
      'POST /api/crawl/analyze': 'Real SEO crawl — title, meta, headings, links, schema',
      'POST /api/geo/score': 'GEO score — AI search engine visibility (0-100)',
      'POST /api/preview/analyze': 'SERP + social preview + readability score',
      'POST /api/technical/check': 'Robots.txt, sitemap, redirect chain',
      'POST /api/keywords/analyze': 'Keyword density and bigram analysis',
      'POST /api/compare': 'Side-by-side URL comparison',
      'POST /api/bulk': 'Bulk analysis (up to 50 URLs)',
      'POST /api/report/pdf': 'Generate branded PDF report',
      'POST /api/schema/validate': 'JSON-LD schema validator + snippet checker',
      'POST /api/sitecrawl/crawl': 'Site-wide crawl (up to 50 pages)',
    },
    authentication: 'X-Api-Key header or ?api_key= query param',
    pricing: 'https://app.seoh.ca/pricing',
  });
});

// White-label config — safe to expose to frontend
app.get('/api/config', (req, res) => {
  res.json({
    brandName: process.env.BRAND_NAME || 'SEO Analytics',
    brandLogoUrl: process.env.BRAND_LOGO_URL || '',
    brandPrimaryColor: process.env.BRAND_PRIMARY_COLOR || '#14b8a6',
    ctaText: process.env.BRAND_CTA_TEXT || 'We fix it for less than you think',
    ctaUrl: process.env.BRAND_CTA_URL || '',
  });
});

// Admin dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(currentDir, 'public/admin.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
