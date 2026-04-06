const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../db');
const { sendEmail } = require('./email');

async function createAccountFromCheckout(email, tier) {
  try {
    // 1. Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    let userId = userResult.rows[0]?.id;

    // 2. Create user if doesn't exist (with random temp password)
    if (!userId) {
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 12);
      
      const insertResult = await pool.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
        [email, hashedPassword]
      );
      userId = insertResult.rows[0].id;
      console.log('[account-creation] Created new user:', userId);
    }

    // 3. Create agency
    const agencyResult = await pool.query(
      'INSERT INTO agencies (name, email, tier, active) VALUES ($1, $2, $3, $4) RETURNING id',
      [email.split('@')[0], email, tier, true]
    );
    const agencyId = agencyResult.rows[0].id;
    console.log('[account-creation] Created agency:', agencyId, 'tier:', tier);

    // 4. Link user to agency as owner
    await pool.query(
      'INSERT INTO user_agency_roles (user_id, agency_id, role, accepted_at) VALUES ($1, $2, $3, NOW())',
      [userId, agencyId, 'owner']
    );
    console.log('[account-creation] Linked user to agency as owner');

    // 5. Generate password reset token (24h expiry)
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(plainToken, 12);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tokenResult = await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING id',
      [userId, tokenHash, expiresAt]
    );
    const tokenId = tokenResult.rows[0].id;
    console.log('[account-creation] Generated password reset token:', tokenId);

    // 6. Send email with reset link
    const resetLink = `https://analysis.seoh.ca/auth/reset-password?token=${plainToken}&email=${encodeURIComponent(email)}`;
    await sendEmail(email, 'Your SEOh Dashboard is Ready', 'first-login', {
      email,
      tier: tier.charAt(0).toUpperCase() + tier.slice(1),
      resetLink,
      expiresAt: expiresAt.toLocaleString()
    });
    console.log('[account-creation] Email sent to:', email);

    return {
      userId,
      agencyId,
      email,
      tier,
      tokenId,
      resetTokenExpires: expiresAt
    };
  } catch (error) {
    console.error('[account-creation] Error:', error);
    throw error;
  }
}

module.exports = { createAccountFromCheckout };
