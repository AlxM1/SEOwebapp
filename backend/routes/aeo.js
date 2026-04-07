const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const router = express.Router();

/**
 * AEO Score — Answer Engine Optimization
 * Measures how well a page is optimized for direct-answer selection
 * by Google Featured Snippets, AI Overviews, voice assistants (Siri, Alexa),
 * and People Also Ask boxes.
 *
 * Distinct from GEO: GEO measures AI citation likelihood (ChatGPT, Perplexity).
 * AEO measures answer-selection likelihood (Google snippets, voice, PAA).
 *
 * Scoring dimensions:
 * 1. Direct answer blocks (30pts) — Concise, snippet-ready answer paragraphs
 * 2. Question-answer structure (25pts) — PAA alignment, Q&A pairs, conversational
 * 3. Featured snippet formats (20pts) — Paragraph, list, table snippet readiness
 * 4. Voice search readiness (15pts) — Conversational, concise, speakable
 * 5. Answer schema signals (10pts) — Schema types that trigger answer selection
 */
router.post('/score', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(normalizedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AEOScorer/1.0)' },
      timeout: 10000,
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    const signals = {};
    const recommendations = [];
    let totalScore = 0;

    // Helper: get all paragraph texts
    const paragraphs = $('p').toArray().map(el => $(el).text().trim()).filter(t => t.length > 0);
    const allText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = allText.split(' ').length;

    // === DIMENSION 1: Direct Answer Blocks (30 points) ===
    // Google snippets pull concise answer paragraphs (40-60 words ideal)
    let directAnswerScore = 0;

    // Check for concise answer paragraphs (30-60 words — snippet sweet spot)
    const snippetReadyParagraphs = paragraphs.filter(p => {
      const words = p.split(/\s+/).length;
      return words >= 20 && words <= 60;
    });
    if (snippetReadyParagraphs.length >= 3) {
      directAnswerScore += 12;
      signals.snippetReadyParagraphs = snippetReadyParagraphs.length;
    } else if (snippetReadyParagraphs.length >= 1) {
      directAnswerScore += 6;
      signals.snippetReadyParagraphs = snippetReadyParagraphs.length;
    } else {
      recommendations.push('Add concise answer paragraphs (30-60 words) — this is the exact length Google pulls for Featured Snippets');
    }

    // "What is X" / "How to" / definition patterns right after headings
    const headings = $('h1, h2, h3').toArray();
    let answerAfterHeading = 0;
    headings.forEach(h => {
      const headingText = $(h).text().trim().toLowerCase();
      const nextP = $(h).nextAll('p').first().text().trim();
      const nextPWords = nextP.split(/\s+/).length;
      // Check if heading is a question or definition trigger, and answer follows immediately
      if ((headingText.includes('what') || headingText.includes('how') ||
           headingText.includes('why') || headingText.includes('when') ||
           headingText.includes('?')) && nextPWords >= 15 && nextPWords <= 80) {
        answerAfterHeading++;
      }
    });
    if (answerAfterHeading >= 2) {
      directAnswerScore += 10;
      signals.answerAfterHeading = answerAfterHeading;
    } else if (answerAfterHeading >= 1) {
      directAnswerScore += 5;
      signals.answerAfterHeading = answerAfterHeading;
    } else {
      recommendations.push('Place direct answer paragraphs immediately after question-style headings (What is..., How to...)');
    }

    // "Is" / "are" / "means" definition sentence in first 300 words
    const first300 = allText.split(/\s+/).slice(0, 300).join(' ').toLowerCase();
    const hasQuickDefinition = /\b(is a|is the|is an|are the|refers to|defined as|means|involves|we are|we help|we provide|we offer|we specialize)\b/.test(first300);
    if (hasQuickDefinition) {
      directAnswerScore += 8;
      signals.quickDefinition = true;
    } else {
      recommendations.push('Include a clear definition sentence in the first 200 words — answer engines extract these first');
    }

    signals.directAnswerScore = directAnswerScore;
    totalScore += Math.min(30, directAnswerScore);

    // === DIMENSION 2: Question-Answer Structure (25 points) ===
    // PAA alignment — pages with Q&A pairs rank in People Also Ask
    let qaScore = 0;

    // Count question-style headings
    const questionHeadings = headings.filter(h => {
      const text = $(h).text().trim();
      return text.endsWith('?') || /^(what|how|why|when|where|who|which|can|do|does|is|are|should|will)\b/i.test(text);
    });
    if (questionHeadings.length >= 3) {
      qaScore += 12;
      signals.questionHeadings = questionHeadings.length;
    } else if (questionHeadings.length >= 2) {
      qaScore += 8;
      signals.questionHeadings = questionHeadings.length;
    } else if (questionHeadings.length >= 1) {
      qaScore += 4;
      signals.questionHeadings = questionHeadings.length;
    } else {
      recommendations.push('Add question-style headings (H2/H3) — these align with People Also Ask boxes');
    }

    // Q&A pair density (question heading followed by answer paragraph)
    let qaPairs = 0;
    questionHeadings.forEach(h => {
      const nextEl = $(h).next();
      if (nextEl.is('p, ul, ol') && $(nextEl).text().trim().length > 30) {
        qaPairs++;
      }
    });
    // Also count FAQ schema Q&A pairs
    let schemaQaPairs = 0;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const d = JSON.parse($(el).html() || '{}');
        const graph = d['@graph'] || [d];
        graph.forEach((item) => {
          if (item['@type'] === 'FAQPage' && Array.isArray(item.mainEntity)) {
            schemaQaPairs += item.mainEntity.length;
          }
        });
      } catch {}
    });
    const totalQaPairs = qaPairs + Math.min(5, Math.floor(schemaQaPairs / 2));
    if (totalQaPairs >= 3) {
      qaScore += 8;
      signals.qaPairs = totalQaPairs;
    } else if (totalQaPairs >= 1) {
      qaScore += 4;
      signals.qaPairs = totalQaPairs;
    } else {
      recommendations.push('Ensure each question heading is immediately followed by a direct answer paragraph or list');
    }

    // Conversational tone (first-person, second-person presence)
    const conversationalMarkers = (allText.match(/\b(you|your|we|our|you'll|we'll|here's|let's)\b/gi) || []).length;
    const conversationalDensity = conversationalMarkers / (wordCount || 1) * 100;
    if (conversationalDensity >= 0.8) {
      qaScore += 5;
      signals.conversationalTone = true;
    } else if (conversationalDensity >= 0.3) {
      qaScore += 2;
    } else {
      recommendations.push('Use conversational language (you, your, we) — voice assistants prefer natural, spoken-style content');
    }

    signals.qaScore = qaScore;
    totalScore += Math.min(25, qaScore);

    // === DIMENSION 3: Featured Snippet Formats (20 points) ===
    // Google pulls 3 formats: paragraph snippets, list snippets, table snippets
    let snippetFormatScore = 0;

    // Paragraph snippet readiness (already partially measured, check for bold/strong key terms)
    const boldTerms = $('strong, b').length;
    if (boldTerms >= 3) {
      snippetFormatScore += 4;
      signals.boldKeyTerms = boldTerms;
    }

    // List snippet readiness (ordered or unordered lists with 3-8 items)
    const lists = $('ul, ol').toArray();
    const snippetReadyLists = lists.filter(list => {
      const items = $(list).children('li').length;
      return items >= 3 && items <= 8;
    });
    if (snippetReadyLists.length >= 1) {
      snippetFormatScore += 8;
      signals.snippetReadyLists = snippetReadyLists.length;
    } else if (snippetReadyLists.length >= 1) {
      snippetFormatScore += 4;
      signals.snippetReadyLists = snippetReadyLists.length;
    } else {
      recommendations.push('Add structured lists with 3-8 items — Google favors these for list-type Featured Snippets');
    }

    // Table snippet readiness
    const tables = $('table').toArray();
    const snippetReadyTables = tables.filter(t => {
      const rows = $(t).find('tr').length;
      const hasHeader = $(t).find('th').length > 0;
      return rows >= 2 && rows <= 10 && hasHeader;
    });
    if (snippetReadyTables.length >= 1) {
      snippetFormatScore += 5;
      signals.snippetReadyTables = snippetReadyTables.length;
    }

    // Step-by-step / numbered instructions
    const numberedSteps = $('ol li').length;
    const hasStepPattern = /\b(step\s?\d|first|second|third|finally|next,)\b/i.test(allText);
    if (numberedSteps >= 3 || hasStepPattern) {
      snippetFormatScore += 3;
      signals.stepByStep = true;
    }

    signals.snippetFormatScore = snippetFormatScore;
    totalScore += Math.min(20, snippetFormatScore);

    // === DIMENSION 4: Voice Search Readiness (15 points) ===
    // Voice assistants prefer: short answers, natural language, speakable content
    let voiceScore = 0;

    // Speakable content — sentences under 20 words (easy to read aloud)
    const sentences = allText.match(/[^.!?]+[.!?]/g) || [];
    const shortSentences = sentences.filter(s => s.trim().split(/\s+/).length <= 20);
    const shortRatio = shortSentences.length / (sentences.length || 1);
    if (shortRatio >= 0.35) {
      voiceScore += 5;
      signals.speakableContent = true;
    } else if (shortRatio >= 0.2) {
      voiceScore += 3;
    } else {
      recommendations.push('Shorten sentences to under 20 words where possible — voice assistants prefer speakable content');
    }

    // Speakable schema (explicit markup for voice)
    const hasSpeakable = html.includes('"speakable"') || html.includes('"SpeakableSpecification"') || html.includes('speakable');
    // Also credit pages with WebPage schema + clear heading structure (implied speakability)
    const hasWebPageSchema = schemas.includes('WebPage') || schemas.includes('WebSite');
    if (hasSpeakable) {
      voiceScore += 4;
      signals.speakableSchema = true;
    } else if (hasWebPageSchema && $('h1, h2').length >= 2) {
      voiceScore += 2;
      signals.impliedSpeakable = true;
    } else {
      recommendations.push('Add SpeakableSpecification schema to mark content voice assistants should read aloud');
    }

    // Local intent signals (for "near me" voice queries)
    const hasLocalSignals = html.includes('"LocalBusiness"') ||
      html.includes('"GeoCoordinates"') ||
      html.includes('address') ||
      $('[itemprop="address"], [itemprop="telephone"], .address, .phone, [href^="tel:"]').length > 0;
    if (hasLocalSignals) {
      voiceScore += 3;
      signals.localIntent = true;
    }

    // Page speed indicator (voice answers prefer fast pages)
    // We check for performance hints: preconnect, async/defer scripts
    const preconnects = $('link[rel="preconnect"]').length;
    const asyncScripts = $('script[async], script[defer]').length;
    if (preconnects >= 1 || asyncScripts >= 1) {
      voiceScore += 3;
      signals.performanceHints = true;
    }

    signals.voiceScore = voiceScore;
    totalScore += Math.min(15, voiceScore);

    // === DIMENSION 5: Answer Schema Signals (10 points) ===
    // Specific schemas that trigger answer engine selection
    let answerSchemaScore = 0;

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

    // Answer-triggering schemas
    const answerSchemas = ['FAQPage', 'HowTo', 'QAPage', 'Question', 'Answer'];
    const foundAnswerSchemas = schemas.filter(s => answerSchemas.includes(s));
    // Also check for FAQ-like HTML content as partial credit
    const hasFaqHtml = html.includes('faq') || html.includes('FAQ') || 
      $('[class*="faq"], [id*="faq"], [class*="accordion"]').length > 0;
    if (foundAnswerSchemas.length >= 2) {
      answerSchemaScore += 5;
      signals.answerSchemas = foundAnswerSchemas;
    } else if (foundAnswerSchemas.length >= 1) {
      answerSchemaScore += 4;
      signals.answerSchemas = foundAnswerSchemas;
    } else if (hasFaqHtml) {
      answerSchemaScore += 2;
      signals.faqHtml = true;
      recommendations.push('Add FAQPage schema to your existing FAQ content — this directly triggers Featured Snippets');
    } else {
      recommendations.push('Add FAQPage or HowTo schema — these directly trigger Featured Snippets and PAA inclusion');
    }

    // Breadcrumb schema (helps answer engines understand page context)
    if (schemas.includes('BreadcrumbList')) {
      answerSchemaScore += 2;
      signals.breadcrumbs = true;
    }

    // Article or WebPage schema with dateModified (freshness signal)
    const hasFreshness = html.includes('"dateModified"') && (schemas.includes('Article') || schemas.includes('WebPage'));
    if (hasFreshness) {
      answerSchemaScore += 3;
      signals.freshnessSignal = true;
    } else {
      recommendations.push('Add dateModified to your Article/WebPage schema — answer engines prioritize fresh content');
    }

    signals.answerSchemaScore = answerSchemaScore;
    totalScore += Math.min(10, answerSchemaScore);

    // Final AEO score (0-100)
    const aeoScore = Math.min(100, Math.max(0, totalScore));

    // Grade
    let grade, grading;
    if (aeoScore >= 80) { grade = 'A'; grading = 'Excellent — high probability of Featured Snippet and voice answer selection'; }
    else if (aeoScore >= 60) { grade = 'B'; grading = 'Good — likely to appear in People Also Ask and some snippets'; }
    else if (aeoScore >= 40) { grade = 'C'; grading = 'Fair — some answer engine visibility, significant gaps remain'; }
    else if (aeoScore >= 20) { grade = 'D'; grading = 'Poor — unlikely to be selected as a direct answer'; }
    else { grade = 'F'; grading = 'Not optimized — invisible to answer engines'; }

    return res.json({
      url: response.url,
      aeoScore,
      grade,
      grading,
      breakdown: {
        directAnswerBlocks: { score: Math.min(30, directAnswerScore), max: 30 },
        questionAnswerStructure: { score: Math.min(25, qaScore), max: 25 },
        featuredSnippetFormats: { score: Math.min(20, snippetFormatScore), max: 20 },
        voiceSearchReadiness: { score: Math.min(15, voiceScore), max: 15 },
        answerSchemaSignals: { score: Math.min(10, answerSchemaScore), max: 10 },
      },
      signals,
      recommendations: recommendations.slice(0, 6),
      wordCount,
      schemas,
    });
  } catch (error) {
    console.error('AEO score error:', error);
    return res.status(500).json({ error: `AEO analysis failed: ${error.message}` });
  }
});

module.exports = router;
