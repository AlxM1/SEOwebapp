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
