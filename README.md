# SEO & GEO Analysis Tool

A self-hosted website analysis platform for marketing agencies. Analyzes any website for SEO signals, GEO (Generative Engine Optimization) visibility, Core Web Vitals, and provides actionable AI-powered recommendations.

## Features

- **Real SEO Crawling** — actual page analysis (not estimates): title, meta tags, headings, images, links, schema markup
- **GEO Scoring** — measures AI search engine visibility (ChatGPT, Perplexity, Gemini citations)
- **Performance Analysis** — Google PageSpeed Insights integration (Core Web Vitals, FCP, LCP, CLS)
- **AI Recommendations** — powered by your own Grok or OpenAI key
- **Competitor Comparison** — side-by-side analysis of two URLs
- **Bulk Analysis** — analyze up to 50 URLs at once via API
- **PDF Report Generation** — client-ready branded reports
- **White-Label Config** — set your brand name, logo, colors, and CTA
- **User Accounts** — save analysis history, JWT auth
- **Admin Dashboard** — usage overview

## Self-Hosted Setup

### Prerequisites
- Docker + Docker Compose
- Your own API keys (see below)

### Quick Start

```bash
git clone https://github.com/AlxM1/SEOwebapp.git
cd SEOwebapp

# Create your .env file
cp backend/.env.example backend/.env
# Edit backend/.env with your values

docker-compose up -d
```

### Required API Keys (your own — free)

| Key | Where to get it | Cost |
|-----|----------------|------|
| `GOOGLE_PAGESPEED_API_KEY` | Google Cloud Console → PageSpeed API | Free |
| `JWT_SECRET` | Any random 64-char string | Free |
| `OPENAI_API_KEY` or `GROK_API_KEY` | OpenAI / xAI dashboard | Pay-per-use (your account) |

### White-Label Configuration

In `backend/.env`:
```
BRAND_NAME=Your Agency Name
BRAND_LOGO_URL=https://yourdomain.com/logo.png
BRAND_PRIMARY_COLOR=#3b82f6
BRAND_CTA_TEXT=Book a free consultation
BRAND_CTA_URL=https://youragency.com/contact
```

## API Reference

### Analyze a page
`POST /api/crawl/analyze` → `{ url }` → Real SEO data

### GEO Score
`POST /api/geo/score` → `{ url }` → GEO score + recommendations

### Compare two URLs
`POST /api/compare` → `{ urlA, urlB }` → Side-by-side comparison

### Bulk analysis
`POST /api/bulk` → `{ urls: ["url1", "url2", ...] }` → Batch results (max 50)

### Generate PDF report
`POST /api/report/pdf` → `{ url, crawlData, geoData, pageSpeedData }` → PDF download

### White-label config
`GET /api/config` → Brand settings for frontend

### SERP + Social + Readability Preview
`POST /api/preview/analyze` → `{ url }` → SERP preview data, social share previews, Flesch readability score

### Robots.txt + Sitemap + Redirect Check
`POST /api/technical/check` → `{ url }` → robots.txt parsed, sitemap validated, redirect chain traced

### Keyword Density Analysis
`POST /api/keywords/analyze` → `{ url, targetKeyword? }` → top keywords, bigrams, keyword density, stuffing detection

### Site-Wide Crawl
`POST /api/sitecrawl/crawl` → `{ url, maxPages? }` → crawls up to 50 pages, finds broken links, duplicate titles/metas, thin content

### Monitoring + Email Alerts
`POST /api/monitor/add` → `{ url, alertEmail, alertThreshold, checkFrequency }` — requires auth
`GET /api/monitor/list` — list monitored URLs
`POST /api/monitor/:id/check` — run manual check
`GET /api/monitor/:id/history` — score history

### Schema Validation + Featured Snippet Checker
`POST /api/schema/validate` → `{ url }` → validates JSON-LD schemas, checks featured snippet eligibility

## Billing (LemonSqueezy)

The hosted API product uses LemonSqueezy for subscription billing.

### Setup

1. Create a LemonSqueezy store at lemonsqueezy.com
2. Create 3 products (Starter $99, Pro $199, Agency $499)
3. Copy variant IDs to your `.env`:
   ```
   LEMON_STORE_SLUG=your-store-slug
   LEMON_WEBHOOK_SECRET=from-LemonSqueezy-webhook-settings
   LEMON_VARIANT_STARTER=123456
   LEMON_VARIANT_PRO=123457
   LEMON_VARIANT_AGENCY=123458
   ```
4. Add webhook in LemonSqueezy dashboard:
   - URL: `https://analysis.seoh.ca/api/webhooks/lemonsqueezy`
   - Events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_resumed`

### Subscription Flow

1. Agency registers → auto-created with free tier
2. Dashboard shows pricing cards with Upgrade buttons
3. Click Upgrade → LemonSqueezy hosted checkout (pre-filled email + agency ID)
4. Payment succeeds → webhook fires → tier upgraded automatically → API key limits updated
5. Cancel → webhook fires → downgraded to free automatically

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `subscription_created` | Upgrade agency to purchased tier |
| `subscription_updated` | Sync tier if plan changed |
| `subscription_resumed` | Re-activate after pause |
| `subscription_cancelled` | Downgrade to free |
| `subscription_expired` | Downgrade to free |
