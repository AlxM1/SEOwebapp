# SEO Analyzer — Framer Code Component

A native Framer component that runs live SEO + GEO analysis directly inside your Framer site.

## Install in Framer

1. In your Framer project, go to **Assets → Code → +**
2. Name it `SEOAnalyzer`
3. Paste the contents of `SEOAnalyzer.tsx`
4. Click **Done**
5. The component appears in your Assets panel — drag it onto any page

## Configure in Framer Sidebar

| Property | Description |
|---|---|
| API Key | Your `seoh_...` API key from app.seoh.ca |
| API URL | Leave as `https://analysis.seoh.ca` (or your self-hosted URL) |
| Accent Color | Primary color — matches your brand |
| Background | Component background color |
| Show GEO Score | Toggle GEO visibility score tab |
| Show Performance | Toggle LCP/FCP/CLS/TTFB metrics |
| Show Issues Tab | Toggle SEO issues list |
| Button Text | Customize the analyze button label |
| Width | Component width in px |

## Get an API Key

Sign up at [app.seoh.ca](https://app.seoh.ca) — free tier included.

## Tabs

- **Overview** — SEO score ring, GEO score ring, performance metrics, strengths
- **GEO Score** — AI search visibility breakdown (Answer Readiness, Structured Data, Authority Signals, Parseable Structure)
- **Issues** — Critical/warning/info issues with severity indicators
