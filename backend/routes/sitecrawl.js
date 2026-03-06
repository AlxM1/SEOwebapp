const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const router = express.Router();

router.post('/crawl', async (req, res) => {
  const { url, maxPages = 50 } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname;
    const base = `${urlObj.protocol}//${domain}`;

    const visited = new Set();
    const queue = [base + '/'];
    const pages = [];
    const brokenLinks = [];
    const duplicateTitles = {};
    const duplicateMetas = {};

    while (queue.length > 0 && pages.length < maxPages) {
      const currentUrl = queue.shift();
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const response = await fetch(currentUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteCrawler/1.0)' },
          timeout: 8000,
          redirect: 'follow',
        });

        if (!response.ok) {
          brokenLinks.push({ url: currentUrl, status: response.status });
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) continue;

        const html = await response.text();
        const $ = cheerio.load(html);
        const finalUrl = response.url;

        const title = $('title').first().text().trim();
        const metaDesc = $('meta[name="description"]').attr('content') || '';
        const h1 = $('h1').first().text().trim();
        const h1Count = $('h1').length;
        const wordCount = $('body').text().replace(/\s+/g, ' ').split(' ').length;
        const hasCanonical = $('link[rel="canonical"]').length > 0;
        const isIndexed = !($('meta[name="robots"]').attr('content') || '').includes('noindex');

        // Collect internal links
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') || '';
          if (href.startsWith('/') || href.includes(domain)) {
            let fullUrl;
            if (href.startsWith('/')) fullUrl = base + href;
            else fullUrl = href;
            try {
              const clean = new URL(fullUrl);
              clean.hash = '';
              const cleanStr = clean.toString();
              if (!visited.has(cleanStr) && !queue.includes(cleanStr)) {
                queue.push(cleanStr);
              }
            } catch {}
          }
        });

        const pageData = {
          url: finalUrl,
          title,
          titleLength: title.length,
          metaDescription: metaDesc,
          metaDescriptionLength: metaDesc.length,
          h1,
          h1Count,
          wordCount,
          hasCanonical,
          isIndexed,
          issues: [],
        };

        if (!title) pageData.issues.push('Missing title');
        else if (title.length > 60) pageData.issues.push('Title too long');
        if (!metaDesc) pageData.issues.push('Missing meta description');
        if (h1Count === 0) pageData.issues.push('No H1');
        else if (h1Count > 1) pageData.issues.push(`${h1Count} H1 tags`);
        if (!isIndexed) pageData.issues.push('Noindex set');
        if (wordCount < 300) pageData.issues.push('Thin content');

        // Track duplicates
        if (title) {
          if (!duplicateTitles[title]) duplicateTitles[title] = [];
          duplicateTitles[title].push(finalUrl);
        }
        if (metaDesc) {
          if (!duplicateMetas[metaDesc]) duplicateMetas[metaDesc] = [];
          duplicateMetas[metaDesc].push(finalUrl);
        }

        pages.push(pageData);
        await new Promise(r => setTimeout(r, 200)); // Polite crawl delay
      } catch (e) {
        brokenLinks.push({ url: currentUrl, error: e.message });
      }
    }

    const duplicateTitleGroups = Object.entries(duplicateTitles)
      .filter(([_, urls]) => urls.length > 1)
      .map(([title, urls]) => ({ title, urls }));

    const duplicateMetaGroups = Object.entries(duplicateMetas)
      .filter(([_, urls]) => urls.length > 1)
      .map(([meta, urls]) => ({ meta: meta.slice(0, 80), urls }));

    const pagesWithIssues = pages.filter(p => p.issues.length > 0).length;
    const avgWordCount = Math.round(pages.reduce((s, p) => s + p.wordCount, 0) / Math.max(1, pages.length));

    return res.json({
      domain,
      pagesCrawled: pages.length,
      pagesWithIssues,
      brokenLinks: brokenLinks.slice(0, 20),
      duplicateTitles: duplicateTitleGroups.slice(0, 10),
      duplicateMetas: duplicateMetaGroups.slice(0, 10),
      avgWordCount,
      summary: {
        missingTitles: pages.filter(p => p.issues.includes('Missing title')).length,
        missingMetas: pages.filter(p => p.issues.includes('Missing meta description')).length,
        missingH1: pages.filter(p => p.issues.includes('No H1')).length,
        thinContent: pages.filter(p => p.issues.includes('Thin content')).length,
        noindexed: pages.filter(p => !p.isIndexed).length,
      },
      pages: pages.slice(0, maxPages),
    });
  } catch (error) {
    return res.status(500).json({ error: `Site crawl failed: ${error.message}` });
  }
});

module.exports = router;
