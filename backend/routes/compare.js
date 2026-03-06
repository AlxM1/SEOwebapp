const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

// Compare two URLs — calls our crawl + geo for each
router.post('/', async (req, res) => {
  const { urlA, urlB } = req.body;
  if (!urlA || !urlB) return res.status(400).json({ error: 'Both urlA and urlB required' });

  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;

  try {
    const [crawlA, crawlB, geoA, geoB] = await Promise.all([
      fetch(`${baseUrl}/api/crawl/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: urlA }) }).then(r => r.json()),
      fetch(`${baseUrl}/api/crawl/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: urlB }) }).then(r => r.json()),
      fetch(`${baseUrl}/api/geo/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: urlA }) }).then(r => r.json()),
      fetch(`${baseUrl}/api/geo/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: urlB }) }).then(r => r.json()),
    ]);

    const compare = (a, b, label, higherIsBetter = true) => ({
      label,
      a,
      b,
      winner: higherIsBetter ? (a >= b ? 'A' : 'B') : (a <= b ? 'A' : 'B'),
    });

    return res.json({
      urlA: crawlA.url || urlA,
      urlB: crawlB.url || urlB,
      comparison: [
        compare(crawlA.seoScore, crawlB.seoScore, 'SEO Score'),
        compare(geoA.geoScore, geoB.geoScore, 'GEO Score'),
        compare(crawlA.content?.wordCount || 0, crawlB.content?.wordCount || 0, 'Word Count'),
        compare(crawlA.links?.internal || 0, crawlB.links?.internal || 0, 'Internal Links'),
        compare(crawlA.images?.withAlt || 0, crawlB.images?.withAlt || 0, 'Images with Alt'),
        compare(crawlA.structuredData?.length || 0, crawlB.structuredData?.length || 0, 'Schema Types'),
      ],
      details: {
        A: { crawl: crawlA, geo: geoA },
        B: { crawl: crawlB, geo: geoB },
      },
    });
  } catch (error) {
    console.error('Compare error:', error);
    return res.status(500).json({ error: `Comparison failed: ${error.message}` });
  }
});

module.exports = router;
