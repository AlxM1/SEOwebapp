const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const router = express.Router();

// Real page crawl — extracts actual SEO signals from a URL
router.post('/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOAnalyzer/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
      redirect: 'follow',
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const finalUrl = response.url;
    const isHttps = finalUrl.startsWith('https://');

    // --- Meta Tags ---
    const title = $('title').first().text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
    const canonical = $('link[rel="canonical"]').attr('href') || '';
    const robots = $('meta[name="robots"]').attr('content') || 'index, follow';

    // --- Open Graph ---
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogType = $('meta[property="og:type"]').attr('content') || '';

    // --- Headings ---
    const h1s = [];
    const h2s = [];
    const h3s = [];
    $('h1').each((_, el) => h1s.push($(el).text().trim()));
    $('h2').each((_, el) => h2s.push($(el).text().trim()));
    $('h3').each((_, el) => h3s.push($(el).text().trim()));

    // --- Images ---
    let totalImages = 0;
    let imagesWithAlt = 0;
    let imagesWithoutAlt = 0;
    $('img').each((_, el) => {
      totalImages++;
      const alt = $(el).attr('alt');
      if (alt && alt.trim()) imagesWithAlt++;
      else imagesWithoutAlt++;
    });

    // --- Links ---
    const domain = new URL(finalUrl).hostname;
    let internalLinks = 0;
    let externalLinks = 0;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.startsWith('/') || href.includes(domain)) internalLinks++;
      else if (href.startsWith('http')) externalLinks++;
    });

    // --- Structured Data (Schema.org) ---
    const schemaScripts = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || '{}');
        schemaScripts.push(parsed['@type'] || 'Unknown');
      } catch {}
    });

    // --- Content Quality ---
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').filter(w => w.length > 0).length;

    // --- Mobile viewport ---
    const hasViewport = $('meta[name="viewport"]').length > 0;

    // --- Issues Detection ---
    const issues = [];
    if (!title) issues.push('Missing page title');
    else if (title.length > 60) issues.push(`Title too long (${title.length} chars, max 60)`);
    else if (title.length < 10) issues.push('Title too short');

    if (!metaDescription) issues.push('Missing meta description');
    else if (metaDescription.length > 160) issues.push(`Meta description too long (${metaDescription.length} chars, max 160)`);
    else if (metaDescription.length < 50) issues.push('Meta description too short');

    if (h1s.length === 0) issues.push('No H1 tag found');
    else if (h1s.length > 1) issues.push(`Multiple H1 tags found (${h1s.length})`);

    if (imagesWithoutAlt > 0) issues.push(`${imagesWithoutAlt} image(s) missing alt text`);
    if (!hasViewport) issues.push('Missing viewport meta tag (not mobile-friendly)');
    if (!isHttps) issues.push('Site not using HTTPS');
    if (!canonical) issues.push('No canonical URL specified');
    if (schemaScripts.length === 0) issues.push('No structured data (Schema.org) found');
    if (wordCount < 300) issues.push(`Low word count (${wordCount} words) — aim for 300+`);
    if (internalLinks < 3) issues.push('Few internal links — improve site structure');
    if (!ogTitle && !ogImage) issues.push('Missing Open Graph tags (affects social sharing)');

    // --- Strengths ---
    const strengths = [];
    if (isHttps) strengths.push('HTTPS secured');
    if (hasViewport) strengths.push('Mobile viewport configured');
    if (h1s.length === 1) strengths.push('Proper H1 structure');
    if (metaDescription && metaDescription.length >= 50 && metaDescription.length <= 160) strengths.push('Good meta description');
    if (schemaScripts.length > 0) strengths.push(`Structured data present (${schemaScripts.join(', ')})`);
    if (ogImage) strengths.push('Open Graph image set');
    if (wordCount >= 500) strengths.push(`Solid content length (${wordCount} words)`);
    if (internalLinks >= 5) strengths.push('Good internal linking');

    // --- SEO Score Calculation ---
    let seoScore = 100;
    if (!title) seoScore -= 15;
    else if (title.length > 60 || title.length < 10) seoScore -= 5;
    if (!metaDescription) seoScore -= 15;
    else if (metaDescription.length > 160 || metaDescription.length < 50) seoScore -= 5;
    if (h1s.length === 0) seoScore -= 15;
    else if (h1s.length > 1) seoScore -= 8;
    if (imagesWithoutAlt > 0) seoScore -= Math.min(10, imagesWithoutAlt * 2);
    if (!hasViewport) seoScore -= 10;
    if (!isHttps) seoScore -= 20;
    if (!canonical) seoScore -= 5;
    if (schemaScripts.length === 0) seoScore -= 10;
    if (wordCount < 300) seoScore -= 8;
    seoScore = Math.max(0, Math.min(100, seoScore));

    return res.json({
      url: finalUrl,
      isHttps,
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      metaKeywords,
      canonical,
      robots,
      openGraph: { title: ogTitle, description: ogDescription, image: ogImage, type: ogType },
      headings: { h1: h1s, h2: h2s.slice(0, 10), h3: h3s.slice(0, 10) },
      images: { total: totalImages, withAlt: imagesWithAlt, withoutAlt: imagesWithoutAlt },
      links: { internal: internalLinks, external: externalLinks },
      structuredData: schemaScripts,
      content: { wordCount },
      mobileOptimized: hasViewport,
      sslCertificate: isHttps,
      seoScore,
      issues,
      strengths,
    });
  } catch (error) {
    console.error('Crawl error:', error.message);
    return res.status(500).json({ error: `Failed to crawl: ${error.message}` });
  }
});

module.exports = router;
