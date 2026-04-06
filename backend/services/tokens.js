/**
 * services/tokens.js
 * Password reset token generation and validation.
 *
 * Token design:
 *   - Plain token: crypto.randomBytes(32).toString("hex") — 64-char hex string sent in email
 *   - Stored hash: SHA-256(plain token) — deterministic, safe for DB storage
 *   - bcrypt is NOT used here: it is non-deterministic (new salt each call),
 *     making DB lookup impossible. SHA-256 is the correct pattern for tokens
 *     (same as api_keys table uses). bcrypt is for passwords only.
 *   - Expiry: 24 hours
 */

"use strict";

const crypto = require("crypto");
const { pool } = require("../db");

/**
 * Hash a token for DB storage/lookup.
 * @param {string} token — plain 64-char hex token
 * @returns {string} SHA-256 hex digest
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * generatePasswordResetToken(userId, email)
 * Creates a new reset token, invalidates any prior unused tokens for this user,
 * stores the hash in DB, and returns the plain token (to embed in email link).
 *
 * @param {number} userId
 * @param {string} email — stored for cross-validation at redemption time
 * @returns {Promise<string>} plain token
 */
async function generatePasswordResetToken(userId, email) {
  const plain = crypto.randomBytes(32).toString("hex"); // 64-char hex
  const hash  = hashToken(plain);
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // NOW + 24h

  // Invalidate any prior unused tokens for this user (single-token policy)
  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [userId]
  );

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, email, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, hash, email.toLowerCase(), expiry]
  );

  return plain;
}

/**
 * validateResetToken(token, email)
 * Looks up the token hash, checks expiry, used_at, and email match.
 * Returns the token DB row on success, or throws an error with a status code.
 *
 * @param {string} token — plain token from query/body
 * @param {string} email — submitted email for cross-check
 * @returns {Promise<object>} token record from DB
 */
async function validateResetToken(token, email) {
  if (!token || !email) {
    const err = new Error("Token and email are required");
    err.status = 400;
    throw err;
  }

  const hash = hashToken(token);

  // Fetch token record (expired or used rows included so we can give specific errors)
  const { rows } = await pool.query(
    `SELECT * FROM password_reset_tokens WHERE token_hash = $1`,
    [hash]
  );

  if (!rows.length) {
    const err = new Error("Token invalid or expired");
    err.status = 400;
    throw err;
  }

  const record = rows[0];

  // Email mismatch (check before other errors to avoid enumeration)
  if (record.email !== email.toLowerCase()) {
    const err = new Error("Email mismatch");
    err.status = 400;
    throw err;
  }

  // Already used
  if (record.used_at !== null) {
    const err = new Error("This link has already been used");
    err.status = 400;
    throw err;
  }

  // Expired
  if (new Date(record.expires_at) < new Date()) {
    const err = new Error("Token invalid or expired");
    err.status = 400;
    throw err;
  }

  return record;
}

module.exports = { generatePasswordResetToken, validateResetToken, hashToken };
