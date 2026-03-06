const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

router.post('/check', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const base = `${urlObj.protocol}//${urlObj.hostname}`;

    const results = {};

    // --- Robots.txt ---
    try {
      const robotsRes = await fetch(`${base}/robots.txt`, { timeout: 8000 });
      if (robotsRes.ok) {
        const robotsText = await robotsRes.text();
        const lines = robotsText.split('\n').map(l => l.trim()).filter(Boolean);
        const disallowed = lines.filter(l => l.toLowerCase().startsWith('disallow:')).map(l => l.split(':')[1]?.trim());
        const allowed = lines.filter(l => l.toLowerCase().startsWith('allow:')).map(l => l.split(':')[1]?.trim());
        const sitemapLines = lines.filter(l => l.toLowerCase().startsWith('sitemap:')).map(l => l.split(/sitemap:/i)[1]?.trim());
        const userAgents = lines.filter(l => l.toLowerCase().startsWith('user-agent:')).map(l => l.split(':')[1]?.trim());

        const isRootDisallowed = disallowed.some(d => d === '/' || d === '/*');
        const isGooglebotBlocked = userAgents.some(ua => ua === '*' || ua === 'Googlebot') && isRootDisallowed;

        results.robots = {
          exists: true,
          url: `${base}/robots.txt`,
          userAgents,
          disallowed: disallowed.slice(0, 20),
          allowed: allowed.slice(0, 20),
          sitemaps: sitemapLines,
          warnings: [
            ...(isGooglebotBlocked ? ['WARNING: Root path disallowed — entire site may be blocked from Google'] : []),
            ...(disallowed.length === 0 ? ['No Disallow rules — consider restricting admin/private paths'] : []),
            ...(sitemapLines.length === 0 ? ['No sitemap referenced in robots.txt'] : []),
          ],
          raw: robotsText.slice(0, 2000),
        };
      } else {
        results.robots = { exists: false, warnings: ['No robots.txt found — consider adding one'] };
      }
    } catch (e) {
      results.robots = { exists: false, error: e.message };
    }

    // --- Sitemap ---
    const sitemapUrls = results.robots?.sitemaps?.length
      ? results.robots.sitemaps
      : [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`];

    let sitemapFound = false;
    for (const sitemapUrl of sitemapUrls.slice(0, 3)) {
      try {
        const sitemapRes = await fetch(sitemapUrl, { timeout: 8000 });
        if (sitemapRes.ok) {
          const sitemapText = await sitemapRes.text();
          const urlMatches = sitemapText.match(/<loc>(.*?)<\/loc>/g) || [];
          const urls = urlMatches.map(m => m.replace(/<\/?loc>/g, '')).slice(0, 50);
          const lastmodMatches = sitemapText.match(/<lastmod>(.*?)<\/lastmod>/g) || [];
          const isSitemapIndex = sitemapText.includes('<sitemapindex');
          
          results.sitemap = {
            exists: true,
            url: sitemapUrl,
            isSitemapIndex,
            urlCount: urlMatches.length,
            urls: urls.slice(0, 10),
            hasLastmod: lastmodMatches.length > 0,
            warnings: [
              ...(urlMatches.length === 0 ? ['Sitemap found but contains no URLs'] : []),
              ...(!lastmodMatches.length ? ['No lastmod dates in sitemap — add them for better crawl priority'] : []),
              ...(urlMatches.length > 50000 ? ['Large sitemap (50K+ URLs) — consider splitting into sitemap index'] : []),
            ],
          };
          sitemapFound = true;
          break;
        }
      } catch {}
    }

    if (!sitemapFound) {
      results.sitemap = { exists: false, warnings: ['No sitemap found — create one at /sitemap.xml for better indexing'] };
    }

    // --- Redirect Check ---
    try {
      const chain = [];
      let currentUrl = normalizedUrl;
      let hops = 0;

      let tempRes = await fetch(normalizedUrl, { redirect: 'manual', timeout: 5000 });
      while (tempRes.status >= 300 && tempRes.status < 400 && hops < 10) {
        const location = tempRes.headers.get('location');
        if (!location) break;
        chain.push({ from: currentUrl, to: location, status: tempRes.status });
        currentUrl = location.startsWith('http') ? location : `${base}${location}`;
        hops++;
        try {
          tempRes = await fetch(currentUrl, { redirect: 'manual', timeout: 5000 });
        } catch { break; }
      }

      results.redirects = {
        chainLength: chain.length,
        chain,
        warnings: [
          ...(chain.length > 2 ? [`Long redirect chain (${chain.length} hops) — each hop adds latency and loses PageRank`] : []),
        ],
      };
    } catch (e) {
      results.redirects = { error: e.message };
    }

    return res.json({ url: normalizedUrl, ...results });
  } catch (error) {
    return res.status(500).json({ error: `Technical check failed: ${error.message}` });
  }
});

module.exports = router;
