/**
 * services/email.js
 * Email service for SEOh! feature notifications.
 *
 * Transport priority:
 *   1. Resend API (RESEND_API_KEY)           — preferred
 *   2. SMTP via nodemailer (SMTP_HOST etc.)  — fallback
 *   3. Console log only                       — dev/test fallback
 *
 * Feature metadata is looked up from tier_limits.features
 * and a static descriptor map — no external call needed.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { pool } = require('../db');

// ── Feature descriptors ──────────────────────────────────────────────────────
// Maps feature key → { name, description, endpoint }
const FEATURE_META = {
  aeo:         { name: 'AEO Scoring',        description: 'Answer Engine Optimization — optimize for Featured Snippets, People Also Ask, and voice search', endpoint: 'POST /api/aeo/score' },
  geo:         { name: 'GEO Scoring',        description: 'GEO score — AI search engine visibility rating (0–100)', endpoint: 'POST /api/geo/score' },
  crawl:       { name: 'Site Crawl',         description: 'Deep crawl of title tags, meta descriptions, headings, links, and schema', endpoint: 'POST /api/crawl/analyze' },
  pdf:         { name: 'PDF Reports',        description: 'Generate branded, client-ready PDF reports for any analysis', endpoint: 'POST /api/report/pdf' },
  bulk:        { name: 'Bulk Analysis',      description: 'Analyze up to 50 URLs in a single API call', endpoint: 'POST /api/bulk' },
  compare:     { name: 'URL Comparison',     description: 'Side-by-side SEO comparison between two URLs', endpoint: 'POST /api/compare' },
  monitor:     { name: 'Site Monitoring',    description: 'Track SEO metrics over time and get alerted on drops', endpoint: 'POST /api/monitor/check' },
  sitecrawl:   { name: 'Full Site Crawl',   description: 'Site-wide crawl up to 50 pages with issue detection', endpoint: 'POST /api/sitecrawl/crawl' },
  performance: { name: 'Performance Check', description: 'Core Web Vitals and page speed analysis', endpoint: 'POST /api/technical/check' },
};

// ── Template loader ──────────────────────────────────────────────────────────
const TEMPLATE_PATH = path.join(__dirname, '../emails/feature-notification.html');
let _templateCache = null;

function loadTemplate() {
  if (!_templateCache) {
    _templateCache = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  }
  return _templateCache;
}

// ── Build feature cards HTML ─────────────────────────────────────────────────
function buildFeatureCards(featureIds) {
  return featureIds.map(id => {
    const meta = FEATURE_META[id] || { name: id, description: 'Newly unlocked feature', endpoint: '' };
    const endpointHtml = meta.endpoint
      ? `<span class="feature-endpoint">${meta.endpoint}</span>`
      : '';
    return `
      <div class="feature-card">
        <div class="feature-name">${meta.name}</div>
        <div class="feature-desc">${meta.description}</div>
        ${endpointHtml}
      </div>`;
  }).join('\n');
}

// ── Render HTML email ────────────────────────────────────────────────────────
function renderEmail({ agencyName, agencyId, tierName, featureIds }) {
  const template    = loadTemplate();
  const featureCards = buildFeatureCards(featureIds);
  const count       = featureIds.length;

  return template
    .replace(/{{AGENCY_NAME}}/g,   agencyName || 'there')
    .replace(/{{AGENCY_ID}}/g,     agencyId   || '')
    .replace(/{{TIER_NAME}}/g,     tierName   || 'your')
    .replace(/{{FEATURE_COUNT}}/g, count)
    .replace(/{{FEATURE_PLURAL}}/g, count === 1 ? '' : 's')
    .replace(/{{FEATURE_CARDS}}/g,  featureCards);
}

// ── Transport: Resend ────────────────────────────────────────────────────────
async function sendViaResend({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    process.env.EMAIL_FROM || 'SEOh! <noreply@seoh.ca>',
      to:      [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }
  return await res.json();
}

// ── Transport: nodemailer SMTP ───────────────────────────────────────────────
async function sendViaSMTP({ to, subject, html }) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return await transporter.sendMail({
    from:    process.env.EMAIL_FROM || `"SEOh!" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

// ── Transport: console fallback ──────────────────────────────────────────────
function sendViaConsole({ to, subject, html }) {
  console.log('[email.js] EMAIL FALLBACK (no transport configured)');
  console.log(`  To:      ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Body:    [HTML, ${html.length} chars]`);
  return { id: `console-${Date.now()}`, simulated: true };
}

// ── Pick transport ────────────────────────────────────────────────────────────
async function dispatchEmail(payload) {
  if (process.env.RESEND_API_KEY) {
    return await sendViaResend(payload);
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return await sendViaSMTP(payload);
  }
  return sendViaConsole(payload);
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * sendFeatureNotification(agencyId, featureIds, tierName)
 *
 * Fetches agency email + name from DB, renders the HTML template,
 * dispatches via available transport, and returns { sent, messageId }.
 * Never throws — logs errors and returns { sent: false, error }.
 */
async function sendFeatureNotification(agencyId, featureIds, tierName) {
  try {
    if (!featureIds || featureIds.length === 0) {
      throw new Error('featureIds must be a non-empty array');
    }

    // Look up agency
    const { rows } = await pool.query(
      'SELECT name, email FROM agencies WHERE id = $1',
      [agencyId]
    );

    if (!rows.length) {
      throw new Error(`Agency ${agencyId} not found`);
    }

    const agency     = rows[0];
    const agencyName = agency.name || agency.email.split('@')[0];
    const to         = agency.email;

    // Feature names for subject line
    const featureLabels = featureIds
      .slice(0, 2)
      .map(id => FEATURE_META[id]?.name || id)
      .join(' + ');
    const subject = featureIds.length > 2
      ? `New Features Unlocked for ${agencyName} — ${featureLabels} + more`
      : `New Features Unlocked for ${agencyName} — ${featureLabels}`;

    const html = renderEmail({ agencyName, agencyId, tierName, featureIds });

    const result = await dispatchEmail({ to, subject, html });

    console.log(`[email.js] Feature notification sent → ${to} (agency ${agencyId}, tier ${tierName})`);
    return { sent: true, messageId: result?.id || null };

  } catch (err) {
    // Never break the caller — log and return
    console.error('[email.js] sendFeatureNotification failed:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendFeatureNotification, FEATURE_META };
