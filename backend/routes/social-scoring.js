const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-mini';

/** Normalize URL - add https:// if missing, handle trailing slashes */
function normalizeUrl(raw) {
  if (!raw) return null;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { new URL(u); return u; } catch { return null; }
}

/** Extract domain for social search queries */
function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/**
 * POST /api/social/score
 * Crawls the page for social links, then uses Grok to assess social presence.
 * Uses Firecrawl-style approach: crawl page + search for social profiles.
 */
router.post('/score', async (req, res) => {
  const { url: rawUrl } = req.body;
  if (!rawUrl) return res.status(400).json({ error: 'url required' });

  const url = normalizeUrl(rawUrl);
  if (!url) return res.status(400).json({ error: 'Invalid URL format' });

  const domain = extractDomain(url);
  const socialLinks = {};
  let siteName = domain;
  let hasOgTags = false;
  let hasTwitterCards = false;
  let hasSchemaOrg = false;

  // Step 1: Crawl the website for social links
  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOhBot/1.0; +https://seoh.ca)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const $ = cheerio.load(html);

      siteName = $('meta[property="og:site_name"]').attr('content')
        || $('title').text().split(/[-|]/)[0].trim()
        || domain;

      hasOgTags = $('meta[property^="og:"]').length > 0;
      hasTwitterCards = $('meta[name^="twitter:"]').length > 0;
      hasSchemaOrg = html.includes('schema.org');

      // Extract all hrefs
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const lower = href.toLowerCase();
        if (lower.includes('facebook.com/') && !lower.includes('sharer') && !socialLinks.facebook) socialLinks.facebook = href;
        if (lower.includes('instagram.com/') && !lower.includes('share') && !socialLinks.instagram) socialLinks.instagram = href;
        if ((lower.includes('twitter.com/') || lower.includes('x.com/')) && !lower.includes('share') && !socialLinks.twitter) socialLinks.twitter = href;
        if (lower.includes('linkedin.com/') && !socialLinks.linkedin) socialLinks.linkedin = href;
        if (lower.includes('youtube.com/') && !lower.includes('watch') && !socialLinks.youtube) socialLinks.youtube = href;
        if (lower.includes('tiktok.com/@') && !socialLinks.tiktok) socialLinks.tiktok = href;
        if (lower.includes('pinterest.com/') && !socialLinks.pinterest) socialLinks.pinterest = href;
      });

      // Also check footer/header SVG icon links (common pattern)
      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const ariaLabel = ($(el).attr('aria-label') || '').toLowerCase();
        const title = ($(el).find('title').text() || '').toLowerCase();
        const hasSvg = $(el).find('svg').length > 0;
        if (!hasSvg && !ariaLabel && !title) return;
        const signal = ariaLabel + title;
        if (signal.includes('facebook') && !socialLinks.facebook && href) socialLinks.facebook = href;
        if (signal.includes('instagram') && !socialLinks.instagram && href) socialLinks.instagram = href;
        if ((signal.includes('twitter') || signal.includes('x.com')) && !socialLinks.twitter && href) socialLinks.twitter = href;
        if (signal.includes('linkedin') && !socialLinks.linkedin && href) socialLinks.linkedin = href;
        if (signal.includes('youtube') && !socialLinks.youtube && href) socialLinks.youtube = href;
        if (signal.includes('tiktok') && !socialLinks.tiktok && href) socialLinks.tiktok = href;
      });
    }
  } catch (crawlErr) {
    console.warn('Social crawl warning (non-fatal):', crawlErr.message);
    // Non-fatal — continue with empty socialLinks, Grok will use domain knowledge
  }

  // Step 2: Send to Grok with real crawl data + domain knowledge
  const socialLinksList = Object.entries(socialLinks).length > 0
    ? Object.entries(socialLinks).map(([p, l]) => `- ${p}: ${l}`).join('\n')
    : 'No social links found in page HTML';

  const prompt = `You are a social media analyst. Analyze the social media presence for this business website.

Website: ${url}
Domain: ${domain}
Business name: ${siteName}

Social links actually found in page HTML:
${socialLinksList}

Page social signals:
- Open Graph tags: ${hasOgTags ? 'Yes' : 'No'}
- Twitter Cards: ${hasTwitterCards ? 'Yes' : 'No'}
- Schema.org markup: ${hasSchemaOrg ? 'Yes' : 'No'}

Using the links found above AND your knowledge of this business/domain, assess their social media presence realistically. 
- If you found a link: score based on the platform's likely activity level for this type of business
- If no link found: score 0, presence "none" — do NOT guess URLs you don't know exist
- Be honest and conservative

Return ONLY valid JSON (no markdown, no code fences):
{
  "overallScore": <0-100>,
  "grade": "<A/B/C/D/F>",
  "platforms": {
    "facebook": {"found": <bool>, "url": "<url or null>", "score": <0-100>, "presence": "<strong/moderate/weak/none>", "notes": "<brief assessment>"},
    "instagram": {"found": <bool>, "url": "<url or null>", "score": <0-100>, "presence": "<strong/moderate/weak/none>", "notes": "<brief assessment>"},
    "twitter": {"found": <bool>, "url": "<url or null>", "score": <0-100>, "presence": "<strong/moderate/weak/none>", "notes": "<brief assessment>"},
    "linkedin": {"found": <bool>, "url": "<url or null>", "score": <0-100>, "presence": "<strong/moderate/weak/none>", "notes": "<brief assessment>"},
    "youtube": {"found": <bool>, "url": "<url or null>", "score": <0-100>, "presence": "<strong/moderate/weak/none>", "notes": "<brief assessment>"},
    "tiktok": {"found": <bool>, "url": "<url or null>", "score": <0-100>, "presence": "<strong/moderate/weak/none>", "notes": "<brief assessment>"}
  },
  "socialMetaTags": {
    "score": <0-100>,
    "openGraph": ${hasOgTags},
    "twitterCards": ${hasTwitterCards},
    "schemaOrg": ${hasSchemaOrg}
  },
  "recommendations": [
    {"platform": "<name>", "priority": "<high/medium/low>", "recommendation": "<specific actionable advice>"}
  ],
  "summary": "<one paragraph summary of overall social health>"
}`;

  try {
    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_API_KEY}` },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          { role: 'system', content: 'You are a social media analyst. Return only valid JSON, no markdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!grokRes.ok) {
      const err = await grokRes.json().catch(() => ({}));
      return res.status(502).json({ error: 'AI analysis error', details: err.error?.message });
    }

    const grokData = await grokRes.json();
    const raw = grokData.choices?.[0]?.message?.content || '';
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let socialData;
    try {
      socialData = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: cleaned.slice(0, 300) });
    }

    socialData.detectedLinks = socialLinks;
    socialData.linksFound = Object.keys(socialLinks).length;
    socialData.totalPlatforms = 6;
    socialData.url = url;
    socialData.tokensUsed = grokData.usage?.total_tokens || 0;

    res.json(socialData);

  } catch (err) {
    console.error('Social scoring error:', err.message);
    // Return a graceful degraded response instead of failing
    res.json({
      overallScore: 0,
      grade: 'F',
      error: 'AI analysis timed out',
      detectedLinks: socialLinks,
      linksFound: Object.keys(socialLinks).length,
      totalPlatforms: 6,
      url,
      platforms: {
        facebook: { found: !!socialLinks.facebook, url: socialLinks.facebook || null, score: socialLinks.facebook ? 50 : 0, presence: socialLinks.facebook ? 'moderate' : 'none', notes: socialLinks.facebook ? 'Link found on page' : 'No link found' },
        instagram: { found: !!socialLinks.instagram, url: socialLinks.instagram || null, score: socialLinks.instagram ? 50 : 0, presence: socialLinks.instagram ? 'moderate' : 'none', notes: socialLinks.instagram ? 'Link found on page' : 'No link found' },
        twitter: { found: !!socialLinks.twitter, url: socialLinks.twitter || null, score: socialLinks.twitter ? 50 : 0, presence: socialLinks.twitter ? 'moderate' : 'none', notes: socialLinks.twitter ? 'Link found on page' : 'No link found' },
        linkedin: { found: !!socialLinks.linkedin, url: socialLinks.linkedin || null, score: socialLinks.linkedin ? 50 : 0, presence: socialLinks.linkedin ? 'moderate' : 'none', notes: socialLinks.linkedin ? 'Link found on page' : 'No link found' },
        youtube: { found: !!socialLinks.youtube, url: socialLinks.youtube || null, score: socialLinks.youtube ? 50 : 0, presence: socialLinks.youtube ? 'moderate' : 'none', notes: socialLinks.youtube ? 'Link found on page' : 'No link found' },
        tiktok: { found: !!socialLinks.tiktok, url: socialLinks.tiktok || null, score: socialLinks.tiktok ? 50 : 0, presence: socialLinks.tiktok ? 'moderate' : 'none', notes: socialLinks.tiktok ? 'Link found on page' : 'No link found' },
      },
      socialMetaTags: { score: hasOgTags ? 100 : 0, openGraph: hasOgTags, twitterCards: hasTwitterCards, schemaOrg: hasSchemaOrg },
      recommendations: [{ platform: 'all', priority: 'high', recommendation: 'Add social media profile links to your website footer.' }],
      summary: `${Object.keys(socialLinks).length} social links detected on ${domain}. AI analysis unavailable — retrying will give full scores.`,
    });
  }
});

module.exports = router;
