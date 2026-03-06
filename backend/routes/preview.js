const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const router = express.Router();

// SERP + Social + Readability in one call
router.post('/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(normalizedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PreviewAnalyzer/1.0)' },
      timeout: 10000,
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    const finalUrl = response.url;

    // --- SERP Preview Data ---
    const title = $('title').first().text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const displayUrl = finalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Breadcrumb from URL path
    const urlObj = new URL(finalUrl);
    const breadcrumb = [urlObj.hostname, ...urlObj.pathname.split('/').filter(Boolean)].join(' › ');

    // SERP warnings
    const serpWarnings = [];
    if (title.length > 60) serpWarnings.push(`Title truncated in search results (${title.length}/60 chars)`);
    if (title.length < 10) serpWarnings.push('Title too short');
    if (metaDescription.length > 160) serpWarnings.push(`Description truncated (${metaDescription.length}/160 chars)`);
    if (!metaDescription) serpWarnings.push('No meta description — Google will auto-generate one');

    // --- Open Graph / Social Preview ---
    const ogTitle = $('meta[property="og:title"]').attr('content') || title;
    const ogDescription = $('meta[property="og:description"]').attr('content') || metaDescription;
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogSiteName = $('meta[property="og:site_name"]').attr('content') || urlObj.hostname;
    const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';
    const twitterTitle = $('meta[name="twitter:title"]').attr('content') || ogTitle;
    const twitterDescription = $('meta[name="twitter:description"]').attr('content') || ogDescription;
    const twitterImage = $('meta[name="twitter:image"]').attr('content') || ogImage;

    const socialWarnings = [];
    if (!ogImage) socialWarnings.push('No og:image — posts will have no preview image on LinkedIn/Facebook');
    if (!twitterCard) socialWarnings.push('No twitter:card — Twitter/X posts will look plain');
    if (!$('meta[property="og:title"]').attr('content')) socialWarnings.push('og:title missing — using page title as fallback');
    if (ogImage && !ogImage.startsWith('http')) socialWarnings.push('og:image is a relative URL — must be absolute');

    // --- Readability Score ---
    // Remove scripts, styles, nav, footer for clean text
    $('script, style, nav, footer, header, aside').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const words = bodyText.split(' ').filter(w => w.length > 0);
    const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllableCount = words.reduce((total, word) => total + countSyllables(word), 0);
    
    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllableCount / Math.max(1, wordCount);
    
    // Flesch Reading Ease (higher = easier)
    const fleschScore = Math.max(0, Math.min(100, 
      206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    ));
    
    // Flesch-Kincaid Grade Level
    const gradeLevel = Math.max(0, (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59);
    
    // Reading time (avg 200 wpm)
    const readingTimeSeconds = Math.ceil((wordCount / 200) * 60);
    const readingTimeFormatted = readingTimeSeconds < 60 
      ? `${readingTimeSeconds}s` 
      : `${Math.ceil(readingTimeSeconds / 60)} min read`;

    let readabilityLabel, readabilityColor;
    if (fleschScore >= 70) { readabilityLabel = 'Easy'; readabilityColor = 'green'; }
    else if (fleschScore >= 50) { readabilityLabel = 'Moderate'; readabilityColor = 'yellow'; }
    else if (fleschScore >= 30) { readabilityLabel = 'Difficult'; readabilityColor = 'orange'; }
    else { readabilityLabel = 'Very Difficult'; readabilityColor = 'red'; }

    const gradeLabel = gradeLevel <= 6 ? 'Elementary' : gradeLevel <= 9 ? 'Middle School' :
      gradeLevel <= 12 ? 'High School' : gradeLevel <= 16 ? 'College' : 'Graduate';

    const readabilityWarnings = [];
    if (avgWordsPerSentence > 25) readabilityWarnings.push(`Long sentences (avg ${Math.round(avgWordsPerSentence)} words) — aim for under 20`);
    if (gradeLevel > 12) readabilityWarnings.push(`Reading level is ${gradeLabel} — consider simplifying for broader audience`);
    if (wordCount < 300) readabilityWarnings.push('Short content — add more depth to improve rankings');

    return res.json({
      url: finalUrl,
      serp: {
        title,
        titleLength: title.length,
        metaDescription,
        metaDescriptionLength: metaDescription.length,
        displayUrl,
        breadcrumb,
        warnings: serpWarnings,
      },
      social: {
        linkedin: { title: ogTitle, description: ogDescription, image: ogImage, siteName: ogSiteName },
        twitter: { card: twitterCard, title: twitterTitle, description: twitterDescription, image: twitterImage },
        facebook: { title: ogTitle, description: ogDescription, image: ogImage, siteName: ogSiteName },
        warnings: socialWarnings,
      },
      readability: {
        fleschScore: Math.round(fleschScore),
        gradeLevel: Math.round(gradeLevel * 10) / 10,
        gradeLabel,
        readabilityLabel,
        readabilityColor,
        wordCount,
        sentenceCount,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        readingTime: readingTimeFormatted,
        readingTimeSeconds,
        warnings: readabilityWarnings,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: `Preview analysis failed: ${error.message}` });
  }
});

// Simple syllable counter
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

module.exports = router;
