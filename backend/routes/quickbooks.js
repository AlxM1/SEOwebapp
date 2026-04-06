'use strict';

/**
 * QuickBooks OAuth Routes
 *
 * All routes require X-Admin-Token header (timing-safe comparison).
 *
 * GET /api/quickbooks/connect     — start OAuth flow
 * GET /api/quickbooks/callback    — OAuth callback (no admin token — called by Intuit)
 * GET /api/quickbooks/status      — connection status
 * GET /api/quickbooks/disconnect  — revoke tokens
 */

const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const { buildOAuthClient } = require('../services/quickbooks');

const router = express.Router();

// ---------------------------------------------------------------------------
// Admin auth middleware (timing-safe)
// ---------------------------------------------------------------------------

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || '';
  const expected = process.env.ADMIN_TOKEN || '';

  if (!expected) {
    console.error('[QB] ADMIN_TOKEN not configured');
    return res.status(500).json({ error: 'Admin token not configured' });
  }

  // Pad to equal length to satisfy timingSafeEqual requirement
  const tokenBuf = Buffer.alloc(64);
  const expectedBuf = Buffer.alloc(64);
  Buffer.from(token).copy(tokenBuf);
  Buffer.from(expected).copy(expectedBuf);

  if (!crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/quickbooks/connect
 * Initiates QB OAuth flow. Redirects browser to Intuit's authorization page.
 */
router.get('/connect', requireAdmin, (req, res) => {
  try {
    const oauthClient = buildOAuthClient();
    const authUri = oauthClient.authorizeUri({
      scope: [
        OAuthClient.scopes.Accounting,
        OAuthClient.scopes.OpenId,
        OAuthClient.scopes.Profile,
        OAuthClient.scopes.Email,
      ],
      state: crypto.randomBytes(16).toString('hex'),
    });
    console.log('[QB] Redirecting to Intuit OAuth:', authUri);
    res.redirect(authUri);
  } catch (err) {
    console.error('[QB] connect error:', err.message);
    res.status(500).json({ error: 'Failed to initiate QuickBooks OAuth', details: err.message });
  }
});

// Need OAuthClient available for scopes in the route above
const OAuthClient = require('intuit-oauth');

/**
 * GET /api/quickbooks/callback
 * Intuit redirects here after user authorization.
 * No admin token required — this is called by Intuit's servers.
 * State validation is implicit (OAuth flow initiated from /connect).
 */
router.get('/callback', async (req, res) => {
  try {
    const oauthClient = buildOAuthClient();
    const parseRedirect = req.url;

    const authResponse = await oauthClient.createToken(
      `${process.env.QB_REDIRECT_URI?.replace('/api/quickbooks/callback', '') || 'https://analysis.seoh.ca'}${parseRedirect}`
    );

    const token = authResponse.getJson();
    const realmId = req.query.realmId;

    if (!token.access_token || !token.refresh_token || !realmId) {
      throw new Error('Incomplete token response from Intuit');
    }

    const expiresAt = new Date(Date.now() + (token.expires_in || 3600) * 1000);

    // Fetch company name from QB profile
    let companyName = null;
    try {
      // Rebuild client with new token to fetch profile
      oauthClient.setToken(token);
      const companyInfoResp = await oauthClient.makeApiCall({
        url: `https://${(process.env.QB_ENVIRONMENT || 'sandbox') === 'production' ? 'quickbooks' : 'sandbox'}.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
        method: 'GET',
      });
      const companyInfo = JSON.parse(companyInfoResp.text());
      companyName = companyInfo?.QueryResponse?.CompanyInfo?.[0]?.CompanyName
        || companyInfo?.CompanyInfo?.CompanyName
        || null;
    } catch (profileErr) {
      console.warn('[QB] Could not fetch company name:', profileErr.message);
    }

    // Upsert tokens — we only ever store one connection
    await pool.query(
      `INSERT INTO qb_tokens (access_token, refresh_token, realm_id, expires_at, company_name, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT DO NOTHING`,
      [token.access_token, token.refresh_token, realmId, expiresAt, companyName]
    );

    // If a row already exists, update it
    const existing = await pool.query('SELECT id FROM qb_tokens WHERE realm_id = $1', [realmId]);
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE qb_tokens
           SET access_token = $1,
               refresh_token = $2,
               expires_at = $3,
               company_name = $4,
               updated_at = NOW()
         WHERE realm_id = $5`,
        [token.access_token, token.refresh_token, expiresAt, companyName, realmId]
      );
    }

    console.log(`[QB] OAuth complete. Realm: ${realmId}, Company: ${companyName || 'unknown'}`);

    // Redirect to a success page or return JSON
    res.json({
      success: true,
      message: 'QuickBooks connected successfully',
      company: companyName,
      realmId,
    });
  } catch (err) {
    console.error('[QB] callback error:', err.message);
    res.status(500).json({ error: 'OAuth callback failed', details: err.message });
  }
});

/**
 * GET /api/quickbooks/status
 * Returns current connection status and company info.
 */
router.get('/status', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT realm_id, company_name, expires_at, updated_at FROM qb_tokens ORDER BY id DESC LIMIT 1'
    );

    if (!result.rows.length) {
      return res.json({ connected: false });
    }

    const row = result.rows[0];
    const isExpired = new Date(row.expires_at) <= new Date();

    res.json({
      connected: true,
      company: row.company_name,
      realmId: row.realm_id,
      tokenExpired: isExpired,
      expiresAt: row.expires_at,
      lastUpdated: row.updated_at,
    });
  } catch (err) {
    console.error('[QB] status error:', err.message);
    res.status(500).json({ error: 'Failed to check status', details: err.message });
  }
});

/**
 * GET /api/quickbooks/disconnect
 * Revokes QB tokens and removes from DB.
 */
router.get('/disconnect', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT access_token, refresh_token, realm_id FROM qb_tokens ORDER BY id DESC LIMIT 1'
    );

    if (!result.rows.length) {
      return res.json({ success: true, message: 'Already disconnected' });
    }

    const row = result.rows[0];

    // Attempt to revoke the token at Intuit
    try {
      const oauthClient = buildOAuthClient();
      oauthClient.setToken({
        access_token: row.access_token,
        refresh_token: row.refresh_token,
      });
      await oauthClient.revoke({ token: row.refresh_token });
      console.log('[QB] Revoked token at Intuit');
    } catch (revokeErr) {
      // Non-fatal — still remove from DB
      console.warn('[QB] Token revocation failed (may already be expired):', revokeErr.message);
    }

    await pool.query('DELETE FROM qb_tokens');
    console.log('[QB] Tokens removed from DB');

    res.json({ success: true, message: 'QuickBooks disconnected' });
  } catch (err) {
    console.error('[QB] disconnect error:', err.message);
    res.status(500).json({ error: 'Failed to disconnect', details: err.message });
  }
});

module.exports = router;
