const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

// Submit multiple URLs for analysis — processes sequentially to avoid overload
router.post('/', async (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: 'urls array required' });
  if (urls.length > 50) return res.status(400).json({ error: 'Maximum 50 URLs per bulk request' });

  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
  const results = [];

  for (const url of urls) {
    try {
      const [crawl, geo] = await Promise.all([
        fetch(`${baseUrl}/api/crawl/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).then(r => r.json()),
        fetch(`${baseUrl}/api/geo/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).then(r => r.json()),
      ]);
      results.push({ url, seoScore: crawl.seoScore, geoScore: geo.geoScore, issues: crawl.issues?.length || 0, grade: geo.grade, error: null });
    } catch (e) {
      results.push({ url, error: e.message });
    }
    // Small delay between requests to be polite to target servers
    await new Promise(r => setTimeout(r, 500));
  }

  return res.json({ total: urls.length, processed: results.length, results });
});

module.exports = router;
