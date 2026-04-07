const express = require('express');
const router = express.Router();
const pool = require('../db');

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_MODEL = process.env.GROK_MODEL || 'grok-3-mini';

router.post('/analyze', async (req, res) => {
  const { url, seo, geo } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  // Auth check - accept either api key or bearer token
  const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'];
  const authHeader = req.headers['authorization'] || '';

  if (apiKey) {
    try {
      const tierResult = await pool.query(
        `SELECT a.tier FROM agencies a
         JOIN api_keys ak ON ak.agency_id = a.id
         WHERE ak.key_hash = encode(digest($1, 'sha256'), 'hex') LIMIT 1`,
        [apiKey]
      );
      if (tierResult.rows.length > 0 && tierResult.rows[0].tier === 'free') {
        return res.status(403).json({ error: 'AI recommendations require Starter plan or above', upgrade: 'https://analysis.seoh.ca' });
      }
    } catch {}
  }
  // Bearer token users (dashboard) always allowed

  // Safe accessors - seo/geo may be empty or null
  const s = (typeof seo === 'object' && seo) ? seo : {};
  const g = (typeof geo === 'object' && geo) ? geo : {};

  const h1s = (s.headings?.h1 || []).join(', ') || 'None';
  const h2s = (s.headings?.h2 || []).slice(0, 5).join(' | ') || 'None';
  const schemas = (g.schemas || []).join(', ') || 'None';
  const issues = (s.issues || []).join('; ') || 'None';
  const geoRecs = (g.recommendations || []).join('; ') || 'None';
  const metaDesc = s.metaDescription ? s.metaDescription.slice(0, 200) : 'Missing';

  const context = [
    `URL: ${url}`,
    `Title: ${s.title || 'N/A'} (${s.titleLength || 0} chars)`,
    `Meta description: ${metaDesc}`,
    `Word count: ${s.content?.wordCount || 0}`,
    `H1: ${h1s}`,
    `H2s: ${h2s}`,
    `Internal links: ${s.links?.internal || 0}, External: ${s.links?.external || 0}`,
    `Images missing alt: ${s.images?.withoutAlt || 0} of ${s.images?.total || 0}`,
    `Schema types: ${schemas}`,
    `GEO score: ${g.geoScore || 0}/100 (Grade ${g.grade || 'N/A'})`,
    `SEO issues: ${issues}`,
    `Existing GEO recommendations: ${geoRecs}`,
  ].join('\n');

  const prompt = `You are a senior SEO and GEO (Generative Engine Optimization) strategist. A client wants their website to appear in ChatGPT, Perplexity, and Google AI Overviews.

Website data:
${context}

Give exactly 5 specific, high-impact recommendations. Each must be specific to this website's actual data (not generic advice), explain WHY it matters for AI engines, and be immediately actionable.

Return ONLY a JSON array (no markdown, no code fences):
[{"title":"short label","impact":"high|medium|low","recommendation":"2-3 sentences","why_it_matters":"1 sentence about AI visibility"}]`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROK_API_KEY}` },
      body: JSON.stringify({ model: GROK_MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 1500 }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(502).json({ error: 'AI service error', details: err.error?.message });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let recommendations;
    try {
      recommendations = JSON.parse(cleaned);
      if (!Array.isArray(recommendations)) throw new Error('Not array');
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: cleaned.slice(0, 200) });
    }

    res.json({ recommendations, model: GROK_MODEL, url, tokensUsed: data.usage?.total_tokens || 0 });
  } catch (err) {
    console.error('AI recommendations error:', err.message);
    res.status(500).json({ error: 'Analysis failed', details: err.message });
  }
});

module.exports = router;
