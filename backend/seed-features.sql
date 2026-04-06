-- =============================================================
-- Seed: feature_changelog — initial baseline entries
-- Run AFTER migration-feature-changelog.sql
-- All 18 endpoints × their applicable tiers = 55 rows
-- =============================================================

INSERT INTO feature_changelog (feature_id, tier, action, action_date, description, created_by) VALUES

-- SEO Crawl (free+)
('crawl_analyze',    'free',    'added', '2026-02-15', 'Full SEO audit with title, meta, headings, images, links, and schema detection',              'system'),
('crawl_analyze',    'starter', 'added', '2026-02-15', 'Full SEO audit with title, meta, headings, images, links, and schema detection',              'system'),
('crawl_analyze',    'pro',     'added', '2026-02-15', 'Full SEO audit with title, meta, headings, images, links, and schema detection',              'system'),
('crawl_analyze',    'agency',  'added', '2026-02-15', 'Full SEO audit with title, meta, headings, images, links, and schema detection',              'system'),

-- GEO Score (free+)
('geo_score',        'free',    'added', '2026-02-15', 'Generative Engine Optimization score — AI search engine visibility (0–100)',                  'system'),
('geo_score',        'starter', 'added', '2026-02-15', 'Generative Engine Optimization score — AI search engine visibility (0–100)',                  'system'),
('geo_score',        'pro',     'added', '2026-02-15', 'Generative Engine Optimization score — AI search engine visibility (0–100)',                  'system'),
('geo_score',        'agency',  'added', '2026-02-15', 'Generative Engine Optimization score — AI search engine visibility (0–100)',                  'system'),

-- AEO Score (starter+) — NEW as of 2026-04-06
('aeo_score',        'starter', 'added', '2026-04-06', 'NEW: Answer Engine Optimization score — Featured Snippets, PAA, voice search readiness',      'system'),
('aeo_score',        'pro',     'added', '2026-04-06', 'NEW: Answer Engine Optimization score — Featured Snippets, PAA, voice search readiness',      'system'),
('aeo_score',        'agency',  'added', '2026-04-06', 'NEW: Answer Engine Optimization score — Featured Snippets, PAA, voice search readiness',      'system'),

-- Keyword Analysis (starter+)
('keywords_analyze', 'starter', 'added', '2026-02-15', 'Keyword density, frequency, and bigram analysis for SEO optimization',                        'system'),
('keywords_analyze', 'pro',     'added', '2026-02-15', 'Keyword density, frequency, and bigram analysis for SEO optimization',                        'system'),
('keywords_analyze', 'agency',  'added', '2026-02-15', 'Keyword density, frequency, and bigram analysis for SEO optimization',                        'system'),

-- Competitor Compare (starter+)
('compare',          'starter', 'added', '2026-02-15', 'Side-by-side SEO comparison between two URLs',                                                'system'),
('compare',          'pro',     'added', '2026-02-15', 'Side-by-side SEO comparison between two URLs',                                                'system'),
('compare',          'agency',  'added', '2026-02-15', 'Side-by-side SEO comparison between two URLs',                                                'system'),

-- Technical SEO (free+)
('technical_check',  'free',    'added', '2026-02-15', 'Robots.txt validation, sitemap detection, redirect chain analysis',                            'system'),
('technical_check',  'starter', 'added', '2026-02-15', 'Robots.txt validation, sitemap detection, redirect chain analysis',                            'system'),
('technical_check',  'pro',     'added', '2026-02-15', 'Robots.txt validation, sitemap detection, redirect chain analysis',                            'system'),
('technical_check',  'agency',  'added', '2026-02-15', 'Robots.txt validation, sitemap detection, redirect chain analysis',                            'system'),

-- Schema Validation (free+)
('schema_validate',  'free',    'added', '2026-02-15', 'JSON-LD schema validator with rich snippet eligibility checker',                               'system'),
('schema_validate',  'starter', 'added', '2026-02-15', 'JSON-LD schema validator with rich snippet eligibility checker',                               'system'),
('schema_validate',  'pro',     'added', '2026-02-15', 'JSON-LD schema validator with rich snippet eligibility checker',                               'system'),
('schema_validate',  'agency',  'added', '2026-02-15', 'JSON-LD schema validator with rich snippet eligibility checker',                               'system'),

-- SERP Preview (free+)
('preview_analyze',  'free',    'added', '2026-02-15', 'Google SERP preview, social card preview, and readability score',                             'system'),
('preview_analyze',  'starter', 'added', '2026-02-15', 'Google SERP preview, social card preview, and readability score',                             'system'),
('preview_analyze',  'pro',     'added', '2026-02-15', 'Google SERP preview, social card preview, and readability score',                             'system'),
('preview_analyze',  'agency',  'added', '2026-02-15', 'Google SERP preview, social card preview, and readability score',                             'system'),

-- Site Crawl (agency only)
('sitecrawl_crawl',  'agency',  'added', '2026-02-15', 'Full site-wide crawl — up to 50 pages with per-page SEO scoring',                             'system'),

-- Bulk Analysis (pro+)
('bulk_analyze',     'pro',     'added', '2026-02-15', 'Analyze up to 50 URLs in a single API call',                                                  'system'),
('bulk_analyze',     'agency',  'added', '2026-02-15', 'Analyze up to 50 URLs in a single API call',                                                  'system'),

-- PDF Reports (starter+)
('report_pdf',       'starter', 'added', '2026-02-15', 'Generate branded white-label PDF reports for any analysis',                                   'system'),
('report_pdf',       'pro',     'added', '2026-02-15', 'Generate branded white-label PDF reports for any analysis',                                   'system'),
('report_pdf',       'agency',  'added', '2026-02-15', 'Generate branded white-label PDF reports for any analysis',                                   'system'),

-- Site Monitoring (pro+) — NOW PROTECTED
('monitor',          'pro',     'added', '2026-04-06', 'Automated SEO score monitoring — now API-key protected',                                       'system'),
('monitor',          'agency',  'added', '2026-04-06', 'Automated SEO score monitoring — now API-key protected',                                       'system'),

-- AI Recommendations (starter+)
('ai_recommendations','starter','added', '2026-03-01', 'GPT-powered SEO recommendations with prioritized action items',                                'system'),
('ai_recommendations','pro',    'added', '2026-03-01', 'GPT-powered SEO recommendations with prioritized action items',                                'system'),
('ai_recommendations','agency', 'added', '2026-03-01', 'GPT-powered SEO recommendations with prioritized action items',                                'system'),

-- Analytics Summary (free+)
('analytics_summary','free',    'added', '2026-02-15', 'Usage analytics — API call history, endpoint breakdown, response times',                       'system'),
('analytics_summary','starter', 'added', '2026-02-15', 'Usage analytics — API call history, endpoint breakdown, response times',                       'system'),
('analytics_summary','pro',     'added', '2026-02-15', 'Usage analytics — API call history, endpoint breakdown, response times',                       'system'),
('analytics_summary','agency',  'added', '2026-02-15', 'Usage analytics — API call history, endpoint breakdown, response times',                       'system'),

-- Admin (admin role only)
('admin',            'admin',   'added', '2026-02-15', 'Platform administration — user management, tier overrides, system config',                     'system'),

-- Billing Checkout (public)
('billing_checkout', 'free',    'added', '2026-02-15', 'Stripe checkout session creation for tier upgrades',                                          'system'),
('billing_checkout', 'starter', 'added', '2026-02-15', 'Stripe checkout session creation for tier upgrades',                                          'system'),
('billing_checkout', 'pro',     'added', '2026-02-15', 'Stripe checkout session creation for tier upgrades',                                          'system'),
('billing_checkout', 'agency',  'added', '2026-02-15', 'Stripe checkout session creation for tier upgrades',                                          'system'),

-- Account Me (auth)
('account_me',       'free',    'added', '2026-02-15', 'Retrieve agency profile, active API keys, tier, and feature access',                          'system'),
('account_me',       'starter', 'added', '2026-02-15', 'Retrieve agency profile, active API keys, tier, and feature access',                          'system'),
('account_me',       'pro',     'added', '2026-02-15', 'Retrieve agency profile, active API keys, tier, and feature access',                          'system'),
('account_me',       'agency',  'added', '2026-02-15', 'Retrieve agency profile, active API keys, tier, and feature access',                          'system'),

-- Account Usage (auth)
('account_usage',    'free',    'added', '2026-02-15', 'Per-endpoint API usage history for the past 30 days',                                         'system'),
('account_usage',    'starter', 'added', '2026-02-15', 'Per-endpoint API usage history for the past 30 days',                                         'system'),
('account_usage',    'pro',     'added', '2026-02-15', 'Per-endpoint API usage history for the past 30 days',                                         'system'),
('account_usage',    'agency',  'added', '2026-02-15', 'Per-endpoint API usage history for the past 30 days',                                         'system');

-- Verify row count
SELECT COUNT(*) AS total_rows, COUNT(DISTINCT feature_id) AS distinct_features FROM feature_changelog;
