const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const router = express.Router();

const STOP_WORDS = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','as','is','was','are','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','need','dare','ought','used','this','that','these','those','it','its','we','i','you','he','she','they','me','him','her','us','them','my','your','his','her','our','their','what','which','who','when','where','how','all','each','every','both','few','more','most','other','some','such','no','not','only','same','so','than','too','very','just','about','above','after','before','between','into','through','during','if','then','there']);

router.post('/analyze', async (req, res) => {
  const { url, targetKeyword } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(normalizedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KeywordAnalyzer/1.0)' },
      timeout: 10000,
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract text from key SEO zones separately
    const titleText = $('title').text().toLowerCase();
    const h1Text = $('h1').map((_, el) => $(el).text()).get().join(' ').toLowerCase();
    const h2Text = $('h2').map((_, el) => $(el).text()).get().join(' ').toLowerCase();
    const metaDesc = ($('meta[name="description"]').attr('content') || '').toLowerCase();

    // Clean body text
    $('script, style, nav, footer, header').remove();
    const bodyText = $('body').text().toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
    
    const words = bodyText.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
    const totalWords = bodyText.split(' ').filter(w => w.length > 0).length;

    // Word frequency
    const freq = {};
    words.forEach(word => { freq[word] = (freq[word] || 0) + 1; });

    // Bigrams (two-word phrases)
    const bigrams = {};
    for (let i = 0; i < words.length - 1; i++) {
      if (!STOP_WORDS.has(words[i]) && !STOP_WORDS.has(words[i+1])) {
        const bigram = `${words[i]} ${words[i+1]}`;
        bigrams[bigram] = (bigrams[bigram] || 0) + 1;
      }
    }

    // Top keywords
    const topKeywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({
        word,
        count,
        density: Math.round((count / totalWords) * 1000) / 10,
        inTitle: titleText.includes(word),
        inH1: h1Text.includes(word),
        inH2: h2Text.includes(word),
        inMeta: metaDesc.includes(word),
      }));

    const topBigrams = Object.entries(bigrams)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase, count]) => ({
        phrase,
        count,
        density: Math.round((count / totalWords) * 1000) / 10,
      }));

    // Keyword stuffing detection
    const stuffedWords = topKeywords.filter(k => k.density > 3);
    
    // Target keyword analysis
    let targetAnalysis = null;
    if (targetKeyword) {
      const kw = targetKeyword.toLowerCase().trim();
      const kwCount = (bodyText.match(new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'g')) || []).length;
      targetAnalysis = {
        keyword: targetKeyword,
        count: kwCount,
        density: Math.round((kwCount / totalWords) * 1000) / 10,
        inTitle: titleText.includes(kw),
        inH1: h1Text.includes(kw),
        inH2: h2Text.includes(kw),
        inMeta: metaDesc.includes(kw),
        recommendation: kwCount === 0 ? 'Keyword not found on page — add it naturally to content, title, and headings'
          : kwCount < 3 ? 'Low keyword frequency — consider adding it to more sections'
          : kwCount / totalWords > 0.03 ? 'Possible keyword stuffing — reduce frequency for natural reading'
          : 'Good keyword usage',
      };
    }

    const warnings = [
      ...stuffedWords.map(k => `"${k.word}" appears ${k.count} times (${k.density}%) — may be over-optimized`),
      ...(topKeywords.length > 0 && !topKeywords[0].inTitle ? [`Top keyword "${topKeywords[0].word}" not in title tag`] : []),
    ];

    return res.json({
      url: response.url,
      totalWords,
      topKeywords,
      topBigrams,
      targetAnalysis,
      warnings,
    });
  } catch (error) {
    return res.status(500).json({ error: `Keyword analysis failed: ${error.message}` });
  }
});

module.exports = router;
