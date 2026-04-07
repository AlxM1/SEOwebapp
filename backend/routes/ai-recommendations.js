const express = require('express');
const router = express.Router();
const pool = require('../db');

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-mini';

/**
 * POST /api/ai-recommendations/analyze
 * Accepts pre-crawled SEO + GEO data, returns Grok-powered recommendations.
 * Gated: Starter tier and above only.
 */
router.post('/analyze', async (req, res) => {
  // Tier check — require Starter or above
  const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'];
  
  // Also accept Bearer token (from dashboard)
  const authHeader = req.headers['authorization'];
  if (!apiKey && authHeader && authHeader.startsWith('Bearer ')) {
    // Dashboard user - skip tier check for now (dashboard handles tier display)
  } else if (apiKey) {
    try {
      const tierResult = await pool.query(
        `SELECT a.tier FROM agencies a
         JOIN api_keys ak ON ak.agency_id = a.id
         WHERE ak.key_hash = encode(digest($1, 'sha256'), 'hex')
            OR ak.key_prefix = LEFT($1, 8)
         LIMIT 1`,
        [apiKey]
      );
      if (tierResult.rows.length > 0 && tierResult.rows[0].tier === 'free') {
        return res.status(403).json({
          error: 'AI recommendations require Starter plan or above',
          upgrade: 'https://analysis.seoh.ca',
        });
      }
    } catch (dbErr) {
      console.error('Tier check error:', dbErr.message);
      // Non-fatal: proceed if DB check fails (don't block paid users)
    }
  }

  if (!GROK_API_KEY) {
    return res.status(503).json({ error: 'AI recommendations not configured' });
  }

  const { url, seo, geo } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }
  // Allow url-only - use empty objects if seo/geo not provided
  const seoData = (typeof seo === 'object' && seo) ? seo : {};
  const geoData = (typeof geo === 'object' && geo) ? geo : {};

  const h2List = (seoData.headings?.h2 || []).slice(0, 5).join(' | ') || 'None';
  const h1List = (seoData.headings?.h1 || []).join(', ') || 'None';
  const schemaList = (geoData.schemas || []).join(', ') || 'None';
  const seoIssues = (seoData.issues || []).join('; ') || 'None';
  const algoRecs = (geoData.recommendations || []).join('; ') || 'None';
  const metaSnippet = seoData.metaDescription ? seoData.metaDescription.slice(0, 200) : 'Missing';
  const geoBreakdown = `Answer Readiness ${geo.breakdown?.answerReadiness?.score}/${geo.breakdown?.answerReadiness?.max}, Structured Data ${geo.breakdown?.structuredData?.score}/${geo.breakdown?.structuredData?.max}, Authority ${geo.breakdown?.authoritySignals?.score}/${geo.breakdown?.authoritySignals?.max}, Structure ${geo.breakdown?.parseableStructure?.score}/${geo.breakdown?.parseableStructure?.max}`;

  const context = [
    'URL: ' + url,
    'Title: ' + (seoData.title || 'N/A') + ' (' + (seoData.titleLength || 0) + ' chars)',
    'Meta description: ' + metaSnippet,
    'Word count: ' + (seoData.content?.wordCount || 0),
    'H1: ' + h1List,
    'H2s: ' + h2List,
    'Internal links: ' + (seoData.links?.internal || 0) + ', External: ' + (seo.links?.external || 0),
    'Images missing alt: ' + (seoData.images?.withoutAlt || 0) + ' of ' + (seo.images?.total || 0),
    'Schema types: ' + schemaList,
    'GEO score: ' + (geoData.geoScore || 0) + '/100 (Grade ' + (geoData.grade || 'N/A') + ') — ' + (geoData.grading || ''),
    'GEO breakdown: ' + geoBreakdown,
    'SEO issues: ' + seoIssues,
    'Existing algorithmic GEO recs: ' + algoRecs,
  ].join('\n');

  const prompt = `You are a senior SEO and GEO (Generative Engine Optimization) strategist. A client wants their website to appear in ChatGPT, Perplexity, and Google AI Overviews.

Here is the technical data from their website crawl:
${context}

Give exactly 5 specific, high-impact recommendations to improve this site's AI search visibility and SEO. Each recommendation must:
- Be specific to THIS website's actual data (not generic advice)
- Explain WHY it matters for AI engines like ChatGPT/Perplexity
- Be immediately actionable

Format as a JSON array of objects with these keys:
- "title": short label (5 words max)
- "impact": "high", "medium", or "low"
- "recommendation": 2-3 sentences, specific and actionable
- "why_it_matters": 1 sentence about AI visibility specifically

Return ONLY the JSON array, no markdown, no other text.`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROK_API_KEY,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Grok API error:', response.status, err);
      return res.status(502).json({ error: 'AI service error', details: err.error?.message });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';

    let recommendations = [];
    try {
      const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      recommendations = JSON.parse(cleaned);
    } catch {
      recommendations = [{ title: 'AI Analysis', impact: 'high', recommendation: raw, why_it_matters: '' }];
    }

    return res.json({
      url,
      model: GROK_MODEL,
      recommendations,
      tokensUsed: data.usage?.total_tokens || 0,
    });

  } catch (error) {
    console.error('AI recommendations error:', error);
    return res.status(500).json({ error: 'AI analysis failed', details: error.message });
  }
});

module.exports = router;
