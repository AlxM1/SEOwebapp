const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-mini';

const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'twitter', 'x.com', 'linkedin', 'youtube', 'tiktok', 'pinterest'];

/**
 * POST /api/social/score
 * Analyze a website's social media presence.
 * Returns: per-platform scores, overall social score, and recommendations.
 */
router.post('/score', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    // Step 1: Crawl the page to find social media links
    const pageRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOhBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await pageRes.text();
    const $ = cheerio.load(html);

    // Extract all links
    const allLinks = [];
    $('a[href]').each((_, el) => {
      allLinks.push($(el).attr('href'));
    });

    // Find social media links
    const socialLinks = {};
    for (const link of allLinks) {
      if (!link) continue;
      const lower = link.toLowerCase();
      if (lower.includes('facebook.com') && !socialLinks.facebook) socialLinks.facebook = link;
      if (lower.includes('instagram.com') && !socialLinks.instagram) socialLinks.instagram = link;
      if ((lower.includes('twitter.com') || lower.includes('x.com')) && !socialLinks.twitter) socialLinks.twitter = link;
      if (lower.includes('linkedin.com') && !socialLinks.linkedin) socialLinks.linkedin = link;
      if (lower.includes('youtube.com') && !socialLinks.youtube) socialLinks.youtube = link;
      if (lower.includes('tiktok.com') && !socialLinks.tiktok) socialLinks.tiktok = link;
      if (lower.includes('pinterest.com') && !socialLinks.pinterest) socialLinks.pinterest = link;
    }

    // Also check meta tags for social profiles
    const ogUrl = $('meta[property="og:url"]').attr('content') || '';
    const siteName = $('meta[property="og:site_name"]').attr('content') || $('title').text() || '';

    // Check for social meta tags (indicates social awareness)
    const hasOgTags = $('meta[property^="og:"]').length > 0;
    const hasTwitterCards = $('meta[name^="twitter:"]').length > 0;
    const hasSchemaOrg = html.includes('schema.org');

    // Step 2: Use Grok to analyze social presence and estimate scores
    const analysisPrompt = `Analyze the social media presence for: ${url}
Business/Site name: ${siteName}

Social links found on website:
${Object.entries(socialLinks).map(([platform, link]) => `- ${platform}: ${link}`).join('\n') || 'No social links found on the website'}

Website social signals:
- Open Graph tags: ${hasOgTags ? 'Yes' : 'No'}
- Twitter Cards: ${hasTwitterCards ? 'Yes' : 'No'}  
- Schema.org markup: ${hasSchemaOrg ? 'Yes' : 'No'}

Based on the social links found and your knowledge of these businesses/profiles, analyze their social media presence.

Return ONLY valid JSON:
{
  "overallScore": <0-100>,
  "grade": "<A/B/C/D/F>",
  "platforms": {
    "facebook": {
      "found": <true/false>,
      "url": "<url or null>",
      "score": <0-100>,
      "presence": "<strong/moderate/weak/none>",
      "notes": "Brief assessment"
    },
    "instagram": { "found": <bool>, "url": "<url>", "score": <0-100>, "presence": "<level>", "notes": "..." },
    "twitter": { "found": <bool>, "url": "<url>", "score": <0-100>, "presence": "<level>", "notes": "..." },
    "linkedin": { "found": <bool>, "url": "<url>", "score": <0-100>, "presence": "<level>", "notes": "..." },
    "youtube": { "found": <bool>, "url": "<url>", "score": <0-100>, "presence": "<level>", "notes": "..." },
    "tiktok": { "found": <bool>, "url": "<url>", "score": <0-100>, "presence": "<level>", "notes": "..." }
  },
  "socialMetaTags": {
    "score": <0-100>,
    "openGraph": ${hasOgTags},
    "twitterCards": ${hasTwitterCards},
    "schemaOrg": ${hasSchemaOrg}
  },
  "recommendations": [
    {
      "platform": "<platform name>",
      "priority": "<high/medium/low>",
      "recommendation": "Specific actionable recommendation"
    }
  ],
  "summary": "One paragraph summary of overall social media health"
}`;

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_API_KEY}` },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert social media analyst. Provide realistic assessments based on available data. Score conservatively — if no profile is found, score is 0. Return only valid JSON.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    const grokData = await grokRes.json();
    const raw = grokData.choices?.[0]?.message?.content || '';
    let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let socialData;
    try {
      socialData = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Failed to parse social analysis', raw });
    }

    // Add the links we actually found to the response
    socialData.detectedLinks = socialLinks;
    socialData.linksFound = Object.keys(socialLinks).length;
    socialData.totalPlatforms = 6;
    socialData.tokensUsed = grokData.usage?.total_tokens || 0;

    res.json(socialData);

  } catch (err) {
    console.error('Social scoring error:', err);
    res.status(500).json({ error: 'Social media analysis failed', details: err.message });
  }
});

module.exports = router;
