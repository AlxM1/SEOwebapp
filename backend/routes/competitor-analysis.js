const express = require('express');
const router = express.Router();
const pool = require('../db');

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-mini';

/**
 * POST /api/competitors/analyze
 * Given a URL and optional location, find top competitors and compare scores.
 * Requires: url, location (optional - will be inferred from site content)
 * Returns: competitors[] with scores comparison
 */
router.post('/analyze', async (req, res) => {
  const { url, location, seo, geo, aeo, keywords } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    // Step 1: Use Grok to identify top 5 local competitors
    const competitorPrompt = `Analyze the business at ${url}.
${location ? `Business location: ${location}` : 'Infer the business location from the URL and any available context.'}
${seo?.title ? `Page title: ${seo.title}` : ''}
${seo?.metaDescription ? `Meta description: ${seo.metaDescription}` : ''}

Identify the top 5 local competitors for this business in the same market/location.

Return ONLY valid JSON (no markdown, no code fences):
{
  "business": {
    "name": "detected business name",
    "industry": "detected industry",
    "location": "detected or provided location"
  },
  "competitors": [
    {
      "name": "Competitor Name",
      "url": "https://competitor-website.com",
      "description": "Brief description of what they do",
      "why_competitor": "Why they compete with the analyzed business"
    }
  ]
}`;

    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_API_KEY}` },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert competitive analyst. Return only valid JSON.' },
          { role: 'user', content: competitorPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    const grokData = await grokRes.json();
    const raw = grokData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response (handle code fences)
    let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    let competitorData;
    try {
      competitorData = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: 'Failed to parse competitor data', raw });
    }

    // Step 2: For each competitor, run our scoring endpoints internally
    const scoredCompetitors = [];
    const internalBase = `http://localhost:${process.env.PORT || 4000}/api`;
    const apiKey = req.headers['x-api-key'] || '';
    const authHeader = req.headers['authorization'] || '';
    
    for (const comp of (competitorData.competitors || []).slice(0, 5)) {
      const scores = { name: comp.name, url: comp.url, description: comp.description, why_competitor: comp.why_competitor };
      
      try {
        // SEO score
        const seoRes = await fetch(`${internalBase}/crawl/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, Authorization: authHeader },
          body: JSON.stringify({ url: comp.url }),
        });
        if (seoRes.ok) {
          const seoData = await seoRes.json();
          scores.seo = { score: seoData.seoScore, grade: seoData.seoScore >= 80 ? 'A' : seoData.seoScore >= 60 ? 'B' : seoData.seoScore >= 40 ? 'C' : 'D' };
        }
      } catch {}

      try {
        // GEO score
        const geoRes = await fetch(`${internalBase}/geo/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, Authorization: authHeader },
          body: JSON.stringify({ url: comp.url }),
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          scores.geo = { score: geoData.geoScore, grade: geoData.grade };
        }
      } catch {}

      try {
        // AEO score
        const aeoRes = await fetch(`${internalBase}/aeo/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, Authorization: authHeader },
          body: JSON.stringify({ url: comp.url }),
        });
        if (aeoRes.ok) {
          const aeoData = await aeoRes.json();
          scores.aeo = { score: aeoData.aeoScore, grade: aeoData.grade };
        }
      } catch {}

      scoredCompetitors.push(scores);
    }

    // Step 3: Generate competitive insights using Grok
    const yourScores = {
      seo: seo?.seoScore || 0,
      geo: geo?.geoScore || 0,
      aeo: aeo?.aeoScore || 0,
    };

    const insightPrompt = `Compare this business against its competitors:

YOUR SITE: ${url}
Your scores: SEO=${yourScores.seo}, GEO=${yourScores.geo}, AEO=${yourScores.aeo}

COMPETITORS:
${scoredCompetitors.map(c => `- ${c.name} (${c.url}): SEO=${c.seo?.score || 'N/A'}, GEO=${c.geo?.score || 'N/A'}, AEO=${c.aeo?.score || 'N/A'}`).join('\n')}

Return ONLY valid JSON:
{
  "strengths": ["Where you outperform competitors (2-3 items)"],
  "weaknesses": ["Where competitors outperform you (2-3 items)"],
  "opportunities": ["Actionable opportunities to gain an edge (3-5 items)"],
  "threats": ["Competitive threats to watch (2-3 items)"],
  "summary": "One paragraph executive summary of competitive position"
}`;

    const insightRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_API_KEY}` },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert SEO competitive analyst. Return only valid JSON.' },
          { role: 'user', content: insightPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    const insightData = await insightRes.json();
    const insightRaw = insightData.choices?.[0]?.message?.content || '';
    let insights;
    try {
      insights = JSON.parse(insightRaw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
    } catch {
      insights = { summary: insightRaw, strengths: [], weaknesses: [], opportunities: [], threats: [] };
    }

    res.json({
      business: competitorData.business,
      yourScores,
      competitors: scoredCompetitors,
      insights,
      tokensUsed: (grokData.usage?.total_tokens || 0) + (insightData.usage?.total_tokens || 0),
    });

  } catch (err) {
    console.error('Competitor analysis error:', err);
    res.status(500).json({ error: 'Competitor analysis failed', details: err.message });
  }
});

module.exports = router;
