const express = require('express');
const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');

const router = express.Router();

// Fetch image buffer from URL for logo embedding
function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

router.post('/pdf', async (req, res) => {
  const { url, crawlData, geoData, pageSpeedData, branding } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  // Branding — per-request overrides env fallback
  const brandName = branding?.name || process.env.BRAND_NAME || 'SEO Analytics';
  const brandColor = branding?.color || '#111111';
  const brandTagline = branding?.tagline || 'SEO & GEO Analysis Report';
  const brandWebsite = branding?.website || process.env.BRAND_CTA_URL || '';
  const brandLogoUrl = branding?.logoUrl || null;

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="seo-report-${Date.now()}.pdf"`);
  doc.pipe(res);

  // ── Header ────────────────────────────────────────────────────────────────
  // Top color bar
  doc.rect(0, 0, 595, 8).fill(brandColor);

  doc.moveDown(0.5);

  // Logo (if provided)
  if (brandLogoUrl) {
    try {
      const logoBuffer = await fetchImageBuffer(brandLogoUrl);
      doc.image(logoBuffer, { fit: [120, 60], align: 'center' });
      doc.moveDown(0.5);
    } catch (e) {
      // Logo failed — fall back to text
      doc.fontSize(24).font('Helvetica-Bold').fillColor(brandColor).text(brandName, { align: 'center' });
    }
  } else {
    doc.fontSize(24).font('Helvetica-Bold').fillColor(brandColor).text(brandName, { align: 'center' });
  }

  doc.fontSize(12).font('Helvetica').fillColor('#666').text(brandTagline, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#333').text(`URL: ${url}`, { align: 'center' });
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
  doc.moveDown(2);

  // ── Score Summary ─────────────────────────────────────────────────────────
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#111').text('Score Summary');
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(brandColor);
  doc.moveDown(0.5);

  const scores = [
    ['Overall SEO Score', crawlData?.seoScore ?? '—'],
    ['GEO Score', geoData?.geoScore ?? '—'],
    ['Performance', pageSpeedData?.performance ?? '—'],
    ['Accessibility', pageSpeedData?.accessibility ?? '—'],
  ];

  scores.forEach(([label, score]) => {
    doc.fontSize(11).font('Helvetica').fillColor('#444').text(`${label}:`, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#111').text(` ${score}/100`);
  });

  doc.moveDown(1.5);

  // ── Issues ────────────────────────────────────────────────────────────────
  if (crawlData?.issues?.length) {
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#111').text('Issues Found');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(brandColor);
    doc.moveDown(0.5);
    crawlData.issues.slice(0, 10).forEach(issue => {
      doc.fontSize(10).font('Helvetica').fillColor('#cc0000').text(`• ${issue}`);
    });
    doc.moveDown(1.5);
  }

  // ── Strengths ─────────────────────────────────────────────────────────────
  if (crawlData?.strengths?.length) {
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#111').text('Strengths');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(brandColor);
    doc.moveDown(0.5);
    crawlData.strengths.forEach(strength => {
      doc.fontSize(10).font('Helvetica').fillColor('#007700').text(`\u2713 ${strength}`);
    });
    doc.moveDown(1.5);
  }

  // ── GEO Recommendations ───────────────────────────────────────────────────
  if (geoData?.recommendations?.length) {
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#111').text('GEO Recommendations');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(brandColor);
    doc.moveDown(0.5);
    geoData.recommendations.forEach((rec, i) => {
      doc.fontSize(10).font('Helvetica').fillColor('#333').text(`${i + 1}. ${rec}`);
      doc.moveDown(0.3);
    });
    doc.moveDown(1.5);
  }

  // ── Page Details ──────────────────────────────────────────────────────────
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#111').text('Page Details');
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(brandColor);
  doc.moveDown(0.5);
  if (crawlData) {
    const details = [
      ['Title', crawlData.title || 'Missing'],
      ['Meta Description', crawlData.metaDescription ? `${crawlData.metaDescription.slice(0, 80)}...` : 'Missing'],
      ['H1 Tags', crawlData.headings?.h1?.join(', ') || 'None'],
      ['Word Count', crawlData.content?.wordCount?.toLocaleString() || '—'],
      ['Internal Links', crawlData.links?.internal?.toString() || '—'],
      ['Images', `${crawlData.images?.total || 0} total, ${crawlData.images?.withoutAlt || 0} missing alt`],
      ['Schema Types', crawlData.structuredData?.join(', ') || 'None'],
      ['HTTPS', crawlData.isHttps ? 'Yes' : 'No'],
    ];
    details.forEach(([label, value]) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#444').text(`${label}: `, { continued: true });
      doc.font('Helvetica').fillColor('#111').text(value);
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.moveDown(2);
  doc.rect(0, doc.page.height - 30, 595, 30).fill(brandColor);
  const footerText = brandWebsite
    ? `${brandName}  •  ${brandWebsite}`
    : brandName;
  doc.fontSize(9).font('Helvetica').fillColor('#ffffff').text(footerText, 50, doc.page.height - 20, { align: 'center' });

  doc.end();
});

module.exports = router;
