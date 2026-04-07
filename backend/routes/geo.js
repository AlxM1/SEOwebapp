const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const router = express.Router();

/**
 * GEO Score — Generative Engine Optimization
 * Measures how well a page is optimized for AI search engines
 * (ChatGPT, Perplexity, Gemini, Claude) to cite and reference it.
 *
 * Scoring dimensions:
 * 1. Answer-readiness (40pts) — Does the page directly answer questions?
 * 2. Structured data (20pts) — Schema.org markup AI engines trust
 * 3. Content authority signals (20pts) — Author, date, citations
 * 4. AI-parseable structure (20pts) — Headings, lists, clear sections
 */
router.post('/score', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(normalizedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GEOScorer/1.0)' },
      timeout: 10000,
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    const signals = {};
    const recommendations = [];
    let totalScore = 0;

    // === DIMENSION 1: Answer-Readiness (40 points) ===
    let answerScore = 0;

    // FAQ schema or FAQ-like content
    const hasFaqSchema = html.includes('"FAQPage"') || html.includes('"Question"');
    const faqHeadingCount = $('h2, h3, h4').toArray().filter(el => {
      const text = $(el).text().trim();
      return text.endsWith('?') || /^(what|how|why|when|where|who|which|can|do|does|is|are|should|will)\b/i.test(text);
    }).length;
    if (hasFaqSchema) { answerScore += 15; signals.faqSchema = true; }
    else if (faqHeadingCount >= 5) { answerScore += 12; signals.faqHeadings = faqHeadingCount; }
    else if (faqHeadingCount >= 2) { answerScore += 8; signals.faqHeadings = faqHeadingCount; }
    else if (faqHeadingCount >= 1) { answerScore += 4; signals.faqHeadings = faqHeadingCount; }
    else recommendations.push('Add FAQ section with Q&A format — AI engines love direct answers');

    // Definition/explanation patterns ("X is a...", "X refers to...")
    // Check first 8 paragraphs and heading text for definition/service patterns
    const allParaText = $('p, h1, h2').toArray().slice(0, 8).map(el => $(el).text().toLowerCase()).join(' ');
    const hasDefinitionPattern = /\b(is a|is the|refers to|defined as|means that|we are|we help|we provide|we offer|we make|we handle|we optimize|seo is|geo is|aeo is|agency|services)\b/.test(allParaText);
    if (hasDefinitionPattern) { answerScore += 8; signals.definitionPattern = true; }
    else recommendations.push('Start content with a clear definition or direct answer to the page topic');

    // Lists (AI engines cite structured lists heavily)
    const listCount = $('ul li, ol li').length;
    if (listCount >= 3) { answerScore += 10; signals.richLists = true; }
    else if (listCount > 0) { answerScore += 4; }
    else recommendations.push('Add bullet-point lists — AI engines frequently cite structured lists');

    // Tables (data AI can reference)
    const tableCount = $('table').length;
    if (tableCount > 0) { answerScore += 7; signals.tables = true; }

    signals.answerScore = answerScore;
    totalScore += Math.min(40, answerScore);

    // === DIMENSION 2: Structured Data (20 points) ===
    let structuredScore = 0;
    const schemas = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const d = JSON.parse($(el).html() || '{}');
        if (d['@graph'] && Array.isArray(d['@graph'])) {
          d['@graph'].forEach(item => { if (item['@type']) schemas.push(item['@type']); });
        } else if (d['@type']) {
          schemas.push(d['@type']);
        }
      } catch {}
    });

    const highValueSchemas = ['Article', 'FAQPage', 'HowTo', 'Product', 'Review', 'Person', 'Organization', 'BreadcrumbList'];
    const foundHighValue = schemas.filter(s => highValueSchemas.includes(s));

    if (foundHighValue.length >= 2) structuredScore += 20;
    else if (foundHighValue.length === 1) structuredScore += 12;
    else if (schemas.length > 0) structuredScore += 6;
    else recommendations.push('Add JSON-LD structured data (Article, FAQPage, HowTo) — critical for AI citations');

    signals.schemas = schemas;
    signals.structuredScore = structuredScore;
    totalScore += structuredScore;

    // === DIMENSION 3: Authority Signals (20 points) ===
    let authorityScore = 0;

    // Author information
    const hasAuthor = html.includes('"author"') ||
      $('[rel="author"], .author, .byline, [itemprop="author"]').length > 0;
    if (hasAuthor) { authorityScore += 7; signals.hasAuthor = true; }
    else recommendations.push('Add author markup (byline or JSON-LD author field) to establish content authority');

    // Publication/updated date
    const hasDate = html.includes('"datePublished"') || html.includes('"dateModified"') ||
      $('time[datetime], [itemprop="datePublished"]').length > 0;
    if (hasDate) { authorityScore += 6; signals.hasDate = true; }
    else recommendations.push('Add publication and last-updated dates — AI engines prefer fresh, dated content');

    // External citations/references
    const pageHostname = new URL(response.url).hostname;
    const externalLinks = $('a[href^="http"]').toArray()
      .filter(el => !$(el).attr('href')?.includes(pageHostname));
    if (externalLinks.length >= 2) { authorityScore += 7; signals.hasCitations = true; }
    else recommendations.push('Cite external authoritative sources — AI engines trust content with references');

    signals.authorityScore = authorityScore;
    totalScore += authorityScore;

    // === DIMENSION 4: AI-Parseable Structure (20 points) ===
    let structureScore = 0;

    // Heading hierarchy (H2s and H3s for clear sections)
    const h2Count = $('h2').length;
    if (h2Count >= 3) { structureScore += 8; signals.richHeadings = true; }
    else if (h2Count >= 1) { structureScore += 4; }
    else recommendations.push('Add H2 subheadings to break content into clear sections AI can parse');

    // Content length (AI engines prefer comprehensive content)
    const wordCount = $('body').text().replace(/\s+/g, ' ').split(' ').length;
    if (wordCount >= 800) { structureScore += 7; signals.comprehensiveContent = true; }
    else if (wordCount >= 600) { structureScore += 4; }
    else recommendations.push(`Content is short (${wordCount} words) — AI engines prefer 600+ words for citations`);

    // Clear page title and meta description
    const title = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    if (title && metaDesc && metaDesc.length >= 100) { structureScore += 5; }
    else if (title && metaDesc) { structureScore += 3; }
    else recommendations.push('Ensure title and meta description are set — AI uses these to understand page context');

    signals.structureScore = structureScore;
    totalScore += structureScore;

    // Final GEO score (0-100)
    const geoScore = Math.min(100, Math.max(0, totalScore));

    // Grade
    let grade, grading;
    if (geoScore >= 80) { grade = 'A'; grading = 'Excellent — highly optimized for AI search'; }
    else if (geoScore >= 60) { grade = 'B'; grading = 'Good — likely cited by AI engines'; }
    else if (geoScore >= 40) { grade = 'C'; grading = 'Fair — some AI visibility, gaps remain'; }
    else if (geoScore >= 20) { grade = 'D'; grading = 'Poor — low AI search visibility'; }
    else { grade = 'F'; grading = 'Not optimized — unlikely to appear in AI answers'; }

    return res.json({
      url: response.url,
      geoScore,
      grade,
      grading,
      breakdown: {
        answerReadiness: { score: Math.min(40, answerScore), max: 40 },
        structuredData: { score: structuredScore, max: 20 },
        authoritySignals: { score: authorityScore, max: 20 },
        parseableStructure: { score: structureScore, max: 20 },
      },
      signals,
      recommendations: recommendations.slice(0, 6),
      wordCount,
      schemas,
    });
  } catch (error) {
    console.error('GEO score error:', error);
    return res.status(500).json({ error: `GEO analysis failed: ${error.message}` });
  }
});

module.exports = router;
