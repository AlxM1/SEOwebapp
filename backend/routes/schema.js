const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const router = express.Router();

router.post('/validate', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(normalizedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SchemaValidator/1.0)' },
      timeout: 10000,
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Parse all JSON-LD blocks
    const schemas = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html() || '';
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        items.forEach(item => {
          const type = item['@type'] || 'Unknown';
          const warnings = [];
          const props = Object.keys(item);

          // Validate required fields by type
          if (type === 'Article' || type === 'BlogPosting') {
            if (!item.headline) warnings.push('Missing: headline');
            if (!item.author) warnings.push('Missing: author');
            if (!item.datePublished) warnings.push('Missing: datePublished');
            if (!item.image) warnings.push('Missing: image');
          }
          if (type === 'FAQPage') {
            if (!item.mainEntity || !Array.isArray(item.mainEntity)) warnings.push('Missing: mainEntity array of Questions');
            else {
              item.mainEntity.forEach((q, i) => {
                if (!q.name) warnings.push(`Q${i+1}: missing name (the question)`);
                if (!q.acceptedAnswer?.text) warnings.push(`Q${i+1}: missing acceptedAnswer.text`);
              });
            }
          }
          if (type === 'Product') {
            if (!item.name) warnings.push('Missing: name');
            if (!item.offers) warnings.push('Missing: offers (price)');
            if (!item.image) warnings.push('Missing: image');
          }
          if (type === 'Organization' || type === 'LocalBusiness') {
            if (!item.name) warnings.push('Missing: name');
            if (!item.url) warnings.push('Missing: url');
            if (!item.logo) warnings.push('Missing: logo');
          }
          if (type === 'HowTo') {
            if (!item.step) warnings.push('Missing: step array');
            if (!item.name) warnings.push('Missing: name');
          }

          schemas.push({ type, properties: props, warnings, valid: warnings.length === 0, raw: item });
        });
      } catch (e) {
        schemas.push({ type: 'INVALID', error: `JSON parse error: ${e.message}`, valid: false });
      }
    });

    // Featured snippet readiness
    const firstPara = $('p').first().text().trim();
    const listCount = $('ul li, ol li').length;
    const tableCount = $('table').length;
    const hasFaqContent = $('h2, h3').toArray().some(el => $(el).text().trim().endsWith('?'));
    const hasDefinition = /\b(is a|is the|refers to|defined as)\b/i.test(firstPara);

    const snippetTypes = [];
    const snippetWarnings = [];

    if (listCount >= 5) snippetTypes.push('List snippet — eligible');
    else snippetWarnings.push('Add a list with 5+ items to target list featured snippets');

    if (tableCount > 0) snippetTypes.push('Table snippet — eligible');
    if (hasDefinition) snippetTypes.push('Definition snippet — eligible');
    else snippetWarnings.push('Add a clear definition in the first paragraph to target definition snippets');
    if (hasFaqContent) snippetTypes.push('FAQ snippet — eligible');
    else snippetWarnings.push('Add FAQ-format headings (questions ending with ?) for FAQ featured snippets');

    return res.json({
      url: response.url,
      schemas,
      totalSchemas: schemas.length,
      validSchemas: schemas.filter(s => s.valid).length,
      invalidSchemas: schemas.filter(s => !s.valid).length,
      featuredSnippet: {
        eligibleTypes: snippetTypes,
        warnings: snippetWarnings,
        listCount,
        tableCount,
        hasDefinition,
        hasFaqContent,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: `Schema validation failed: ${error.message}` });
  }
});

module.exports = router;
