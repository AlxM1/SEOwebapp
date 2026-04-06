const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Master feature registry — 18 documented endpoints
const ALL_FEATURES = [
  {
    id: 'crawl_analyze',
    name: 'SEO Crawl',
    description: 'Full SEO audit with title, meta, headings, images, links, and schema detection',
    category: 'Analysis',
    method: 'POST',
    endpoint: '/api/crawl/analyze',
    tiers: ['free', 'starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/crawl/analyze \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`,
  },
  {
    id: 'geo_score',
    name: 'GEO Score',
    description: 'Generative Engine Optimization score — measures AI search engine visibility (0–100)',
    category: 'Analysis',
    method: 'POST',
    endpoint: '/api/geo/score',
    tiers: ['free', 'starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/geo/score \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`,
  },
  {
    id: 'aeo_score',
    name: 'AEO Score',
    description: 'Answer Engine Optimization score — Featured Snippets, PAA, voice search readiness (0–100)',
    category: 'Analysis',
    method: 'POST',
    endpoint: '/api/aeo/score',
    tiers: ['starter', 'pro', 'agency'],
    added_date: '2026-04-06',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/aeo/score \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`,
  },
  {
    id: 'keywords_analyze',
    name: 'Keyword Analysis',
    description: 'Keyword density, frequency, and bigram analysis for SEO optimization',
    category: 'Analysis',
    method: 'POST',
    endpoint: '/api/keywords/analyze',
    tiers: ['starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/keywords/analyze \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`,
  },
  {
    id: 'compare',
    name: 'Competitor Compare',
    description: 'Side-by-side SEO comparison between two URLs',
    category: 'Analysis',
    method: 'POST',
    endpoint: '/api/compare',
    tiers: ['starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/compare \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url1":"https://example.com","url2":"https://competitor.com"}'`,
  },
  {
    id: 'technical_check',
    name: 'Technical SEO',
    description: 'Robots.txt validation, sitemap detection, redirect chain analysis',
    category: 'Technical',
    method: 'POST',
    endpoint: '/api/technical/check',
    tiers: ['free', 'starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/technical/check \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`,
  },
  {
    id: 'schema_validate',
    name: 'Schema Validation',
    description: 'JSON-LD schema validator with rich snippet eligibility checker',
    category: 'Technical',
    method: 'POST',
    endpoint: '/api/schema/validate',
    tiers: ['free', 'starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/schema/validate \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`,
  },
  {
    id: 'preview_analyze',
    name: 'SERP Preview',
    description: 'Google SERP preview, social card preview, and readability score',
    category: 'Analysis',
    method: 'POST',
    endpoint: '/api/preview/analyze',
    tiers: ['free', 'starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/preview/analyze \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`,
  },
  {
    id: 'sitecrawl_crawl',
    name: 'Site Crawl',
    description: 'Full site-wide crawl — up to 50 pages with per-page SEO scoring',
    category: 'Crawling',
    method: 'POST',
    endpoint: '/api/sitecrawl/crawl',
    tiers: ['agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/sitecrawl/crawl \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","maxPages":50}'`,
  },
  {
    id: 'bulk_analyze',
    name: 'Bulk Analysis',
    description: 'Analyze up to 50 URLs in a single API call',
    category: 'Analysis',
    method: 'POST',
    endpoint: '/api/bulk/analyze',
    tiers: ['pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/bulk/analyze \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"urls":["https://example.com","https://example.com/page2"]}'`,
  },
  {
    id: 'report_pdf',
    name: 'PDF Reports',
    description: 'Generate branded white-label PDF reports for any analysis',
    category: 'Reporting',
    method: 'POST',
    endpoint: '/api/report/pdf',
    tiers: ['starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/report/pdf \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","reportType":"seo"}' \\
  --output report.pdf`,
  },
  {
    id: 'monitor',
    name: 'Site Monitoring',
    description: 'Automated SEO score monitoring with alert notifications on regression',
    category: 'Monitoring',
    method: 'POST',
    endpoint: '/api/monitor',
    tiers: ['pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/monitor \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","alertEmail":"you@example.com","frequency":"weekly"}'`,
  },
  {
    id: 'ai_recommendations',
    name: 'AI Recommendations',
    description: 'GPT-powered SEO recommendations with prioritized action items',
    category: 'AI',
    method: 'POST',
    endpoint: '/api/ai-recommendations/analyze',
    tiers: ['starter', 'pro', 'agency'],
    added_date: '2026-03-01',
    curl_example: `curl -X POST https://analysis.seoh.ca/api/ai-recommendations/analyze \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`,
  },
  {
    id: 'analytics_summary',
    name: 'Analytics Summary',
    description: 'Usage analytics — API call history, endpoint breakdown, response times',
    category: 'Account',
    method: 'GET',
    endpoint: '/api/analytics/summary',
    tiers: ['free', 'starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X GET https://analysis.seoh.ca/api/analytics/summary \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
  },
  {
    id: 'admin',
    name: 'Admin Endpoints',
    description: 'Platform administration — user management, tier overrides, system config',
    category: 'Admin',
    method: 'GET/POST',
    endpoint: '/api/admin',
    tiers: ['admin'],
    added_date: '2026-02-15',
    curl_example: `curl -X GET https://analysis.seoh.ca/api/admin/users \\
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"`,
  },
  {
    id: 'billing_checkout',
    name: 'Billing Checkout',
    description: 'Stripe checkout session creation for tier upgrades',
    category: 'Billing',
    method: 'GET',
    endpoint: '/api/billing/checkout/:tier',
    tiers: ['free', 'starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X GET "https://analysis.seoh.ca/api/billing/checkout/starter?agency_id=123" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
  },
  {
    id: 'account_me',
    name: 'Account Info',
    description: 'Retrieve agency profile, active API keys, tier, and feature access',
    category: 'Account',
    method: 'GET',
    endpoint: '/api/account/me',
    tiers: ['free', 'starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X GET https://analysis.seoh.ca/api/account/me \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
  },
  {
    id: 'account_usage',
    name: 'Usage Tracking',
    description: 'Per-endpoint API usage history for the past 30 days',
    category: 'Account',
    method: 'GET',
    endpoint: '/api/account/usage',
    tiers: ['free', 'starter', 'pro', 'agency'],
    added_date: '2026-02-15',
    curl_example: `curl -X GET https://analysis.seoh.ca/api/account/usage \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`,
  },
];

// Tier hierarchy for filtering
const TIER_RANK = { free: 0, starter: 1, pro: 2, agency: 3, admin: 99 };

/**
 * GET /api/account/features
 * Returns the feature list filtered to the authenticated user's tier.
 * Auth: JWT Bearer token (same as /api/account/me)
 */
router.get('/features', authenticateToken, async (req, res) => {
  try {
    // Look up the user's agency + tier
    const { rows: userRows } = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (!userRows.length) return res.status(404).json({ error: 'User not found' });

    const agencyResult = await pool.query(
      'SELECT tier FROM agencies WHERE email = $1',
      [userRows[0].email]
    );

    // Default to free if no agency record exists yet
    const tier = agencyResult.rows[0]?.tier || 'free';
    const tierRank = TIER_RANK[tier] ?? 0;

    // Filter: include features the user's tier has access to
    // Admin sees everything; all others see only their tier and below
    const accessible = tier === 'admin'
      ? ALL_FEATURES
      : ALL_FEATURES.filter(f =>
          f.tiers.some(t => TIER_RANK[t] !== undefined && TIER_RANK[t] <= tierRank)
        );

    res.json({
      tier,
      total_features: accessible.length,
      features: accessible,
    });
  } catch (err) {
    console.error('Features endpoint error:', err);
    res.status(500).json({ error: 'Failed to load features' });
  }
});

/**
 * GET /api/account/features/all
 * Returns all features regardless of tier (useful for pricing/docs pages).
 * Auth: JWT Bearer token
 */
router.get('/features/all', authenticateToken, async (req, res) => {
  res.json({
    total_features: ALL_FEATURES.length,
    features: ALL_FEATURES,
  });
});

module.exports = router;
module.exports.ALL_FEATURES = ALL_FEATURES;
