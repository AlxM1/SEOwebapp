'use strict';

/**
 * QuickBooks Online Integration Service
 * Handles OAuth 2.0, token management, and QB entity creation.
 *
 * Required env vars:
 *   QB_CLIENT_ID, QB_CLIENT_SECRET, QB_REDIRECT_URI
 *   QB_ENVIRONMENT    — "sandbox" or "production" (default: sandbox)
 *   QB_INCOME_ACCOUNT_ID — QB account ref (default: "Sales")
 */

const OAuthClient = require('intuit-oauth');
const QuickBooks = require('node-quickbooks');
const { pool } = require('../db');

// ---------------------------------------------------------------------------
// OAuth client factory
// ---------------------------------------------------------------------------

function buildOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID,
    clientSecret: process.env.QB_CLIENT_SECRET,
    environment: process.env.QB_ENVIRONMENT || 'sandbox',
    redirectUri: process.env.QB_REDIRECT_URI,
    logging: false,
  });
}

/**
 * Load stored tokens from DB and return a ready-to-use OAuthClient.
 * Auto-refreshes the access token if it has expired.
 * Throws if no tokens are stored (QB not connected).
 */
async function getClient() {
  const result = await pool.query(
    'SELECT * FROM qb_tokens ORDER BY id DESC LIMIT 1'
  );
  if (!result.rows.length) {
    throw new Error('QuickBooks not connected — no tokens in database');
  }

  const row = result.rows[0];
  const oauthClient = buildOAuthClient();

  // Restore token state into the client
  oauthClient.setToken({
    token_type: 'bearer',
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    x_refresh_token_expires_in: 8726400, // 101 days (QB default)
    expires_in: 3600,
    createdAt: row.expires_at
      ? new Date(row.expires_at).getTime() - 3600 * 1000 // reconstruct createdAt
      : Date.now() - 3600 * 1000,
  });

  // Refresh if expired (or within 5 minutes of expiry)
  const expiresAt = new Date(row.expires_at);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    console.log('[QB] Access token expired or expiring soon — refreshing...');
    try {
      const refreshed = await oauthClient.refresh();
      const newToken = refreshed.getJson();

      const newExpiresAt = new Date(Date.now() + (newToken.expires_in || 3600) * 1000);

      await pool.query(
        `UPDATE qb_tokens
           SET access_token = $1,
               refresh_token = $2,
               expires_at = $3,
               updated_at = NOW()
         WHERE id = $4`,
        [newToken.access_token, newToken.refresh_token, newExpiresAt, row.id]
      );

      console.log('[QB] Token refreshed and stored');
    } catch (err) {
      console.error('[QB] Token refresh failed:', err.message);
      throw new Error(`QuickBooks token refresh failed: ${err.message}`);
    }
  }

  return { oauthClient, realmId: row.realm_id };
}

/**
 * Return a configured node-quickbooks client instance.
 */
async function getQBClient() {
  const { oauthClient, realmId } = await getClient();
  const token = oauthClient.getToken();
  const isSandbox = (process.env.QB_ENVIRONMENT || 'sandbox') !== 'production';

  return new QuickBooks(
    process.env.QB_CLIENT_ID,
    process.env.QB_CLIENT_SECRET,
    token.access_token,
    false,         // no OAuth1 token secret
    realmId,
    isSandbox,     // useSandbox
    false,         // debug
    null,          // minorversion
    '2.0',         // oauthversion
    token.refresh_token
  );
}

// ---------------------------------------------------------------------------
// Idempotency helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a Stripe invoice was already synced to QB.
 * Returns true if a sync log entry exists.
 */
async function isAlreadySynced(stripeInvoiceId) {
  const result = await pool.query(
    'SELECT id FROM qb_sync_log WHERE stripe_id = $1 LIMIT 1',
    [stripeInvoiceId]
  );
  return result.rows.length > 0;
}

/**
 * Record a successful sync to prevent duplicates.
 */
async function recordSync(stripeId, qbEntityType, qbEntityId, metadata = {}) {
  await pool.query(
    `INSERT INTO qb_sync_log (stripe_id, qb_entity_type, qb_entity_id, metadata, synced_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (stripe_id) DO NOTHING`,
    [stripeId, qbEntityType, qbEntityId, JSON.stringify(metadata)]
  );
}

// ---------------------------------------------------------------------------
// QB entity helpers
// ---------------------------------------------------------------------------

/**
 * Resolve QB Income account reference.
 * Uses QB_INCOME_ACCOUNT_ID env var or defaults to account named "Sales".
 */
function getIncomeAccountRef() {
  const accountId = process.env.QB_INCOME_ACCOUNT_ID;
  if (accountId) {
    return { value: accountId, name: 'Sales' };
  }
  // Default: rely on account name lookup — QB will match by name
  return { value: '1', name: 'Sales' };
}

/**
 * Derive subscription tier from a Stripe invoice.
 * Checks line items description or metadata.
 */
function extractTierFromInvoice(invoice) {
  const priceId = invoice.lines?.data?.[0]?.price?.id || '';
  const desc = (invoice.lines?.data?.[0]?.description || '').toLowerCase();

  if (desc.includes('agency') || priceId === process.env.STRIPE_PRICE_AGENCY) return 'Agency';
  if (desc.includes('pro') || priceId === process.env.STRIPE_PRICE_PRO) return 'Pro';
  if (desc.includes('starter') || priceId === process.env.STRIPE_PRICE_STARTER) return 'Starter';
  return 'Subscription';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a QuickBooks Sales Receipt from a Stripe invoice.
 * Idempotent — skips if already synced.
 *
 * @param {Object} invoice  Stripe invoice object (from webhook event.data.object)
 */
async function createSalesReceipt(invoice) {
  const stripeId = invoice.id;

  if (await isAlreadySynced(stripeId)) {
    console.log(`[QB] Sales receipt already synced for invoice ${stripeId} — skipping`);
    return;
  }

  const qb = await getQBClient();

  const amountTotal = (invoice.amount_paid || invoice.total || 0) / 100;
  const currency = (invoice.currency || 'usd').toUpperCase();
  const customerEmail = invoice.customer_email || invoice.customer_details?.email || 'unknown@unknown.com';
  const tier = extractTierFromInvoice(invoice);
  const txnDate = invoice.created
    ? new Date(invoice.created * 1000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const receipt = {
    TxnDate: txnDate,
    CurrencyRef: { value: currency },
    CustomerRef: { name: customerEmail },
    Line: [
      {
        Amount: amountTotal,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { name: 'Services' },
          UnitPrice: amountTotal,
          Qty: 1,
          TaxCodeRef: { value: 'NON' },
        },
        Description: `SEO Analytics subscription - ${tier}`,
      },
    ],
    DepositToAccountRef: getIncomeAccountRef(),
    PrivateNote: `Stripe Invoice: ${stripeId} | Customer: ${customerEmail} | Amount: ${currency} ${amountTotal.toFixed(2)}`,
  };

  return new Promise((resolve, reject) => {
    qb.createSalesReceipt(receipt, async (err, result) => {
      if (err) {
        console.error('[QB] Failed to create Sales Receipt:', JSON.stringify(err?.Fault || err?.message || err));
        return reject(new Error(`QB createSalesReceipt failed: ${err?.Fault?.Error?.[0]?.Message || err?.message || 'Unknown error'}`));
      }

      const qbId = result?.SalesReceipt?.Id || result?.Id || 'unknown';
      console.log(`[QB] Sales Receipt created: QB#${qbId} for Stripe invoice ${stripeId}`);

      await recordSync(stripeId, 'SalesReceipt', qbId, {
        amount: amountTotal,
        currency,
        customerEmail,
        tier,
      });

      resolve(result);
    });
  });
}

/**
 * Create a QuickBooks Credit Memo from a Stripe refund.
 * Idempotent — skips if already synced.
 *
 * @param {Object} refund  Stripe refund object (charge.refunded or refund object)
 */
async function createRefundReceipt(refund) {
  const stripeId = refund.id;

  if (await isAlreadySynced(stripeId)) {
    console.log(`[QB] Credit Memo already synced for refund ${stripeId} — skipping`);
    return;
  }

  const qb = await getQBClient();

  const amountRefunded = (refund.amount || 0) / 100;
  const currency = (refund.currency || 'usd').toUpperCase();
  const txnDate = refund.created
    ? new Date(refund.created * 1000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const creditMemo = {
    TxnDate: txnDate,
    CurrencyRef: { value: currency },
    Line: [
      {
        Amount: amountRefunded,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { name: 'Services' },
          UnitPrice: amountRefunded,
          Qty: 1,
          TaxCodeRef: { value: 'NON' },
        },
        Description: 'SEO Analytics subscription refund',
      },
    ],
    PrivateNote: `Stripe Refund: ${stripeId} | Charge: ${refund.charge || 'unknown'} | Amount: ${currency} ${amountRefunded.toFixed(2)}`,
  };

  return new Promise((resolve, reject) => {
    qb.createCreditMemo(creditMemo, async (err, result) => {
      if (err) {
        console.error('[QB] Failed to create Credit Memo:', JSON.stringify(err?.Fault || err?.message || err));
        return reject(new Error(`QB createCreditMemo failed: ${err?.Fault?.Error?.[0]?.Message || err?.message || 'Unknown error'}`));
      }

      const qbId = result?.CreditMemo?.Id || result?.Id || 'unknown';
      console.log(`[QB] Credit Memo created: QB#${qbId} for Stripe refund ${stripeId}`);

      await recordSync(stripeId, 'CreditMemo', qbId, {
        amount: amountRefunded,
        currency,
      });

      resolve(result);
    });
  });
}

/**
 * Sync a Stripe invoice to QuickBooks.
 * Wrapper called from the webhook handler — catches and logs all errors.
 */
async function syncToQuickBooks(invoice) {
  try {
    await createSalesReceipt(invoice);
  } catch (err) {
    console.error('[QB] syncToQuickBooks error:', err.message);
    throw err; // re-throw so the caller's .catch() sees it
  }
}

module.exports = {
  buildOAuthClient,
  getClient,
  createSalesReceipt,
  createRefundReceipt,
  syncToQuickBooks,
};
