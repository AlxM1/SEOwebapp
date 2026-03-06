const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { initializeDatabase } = require('./db');

// Define __dirname for CommonJS
const currentDir = path.dirname(require.main.filename);

const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const crawlRoutes = require('./routes/crawl');
const geoRoutes = require('./routes/geo');
const compareRoutes = require('./routes/compare');
const bulkRoutes = require('./routes/bulk');
const reportRoutes = require('./routes/report');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database
initializeDatabase();

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
