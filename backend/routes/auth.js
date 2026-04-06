const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { validateResetToken } = require('../services/tokens');

const router = express.Router();

// Rate limiter for password reset endpoints (brute-force protection)
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email) || email.length > 255) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Enforce minimum password length
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 8-128 characters' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '24h',
      algorithm: 'HS256',
    });

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '24h',
      algorithm: 'HS256',
    });

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── Password Reset ────────────────────────────────────────────────────────────

/**
 * GET /api/auth/password-reset-form
 * Validate a reset token before showing the password form.
 * Query params: token, email
 * Returns: { valid: true, email, expiresAt } or { error: "..." }
 */
router.get('/password-reset-form', resetLimiter, async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({ error: 'Token and email are required' });
    }

    const record = await validateResetToken(token, email);

    return res.json({
      valid: true,
      email: record.email,
      expiresAt: record.expires_at,
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Password reset form validation error:', err);
    return res.status(500).json({ error: 'Server error validating reset token' });
  }
});

/**
 * POST /api/auth/password-reset
 * Consume a reset token and set a new password.
 * Body: { token, email, new_password }
 * Returns: { ok: true, message: "Password set. You can now log in." }
 */
router.post('/password-reset', resetLimiter, async (req, res) => {
  try {
    const { token, email, new_password } = req.body;

    if (!token || !email || !new_password) {
      return res.status(400).json({ error: 'Token, email, and new_password are required' });
    }

    // Validate password strength before touching the DB
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be 8+ characters' });
    }
    if (new_password.length > 128) {
      return res.status(400).json({ error: 'Password must be 8-128 characters' });
    }

    // Validate token (throws with .status on failure)
    const record = await validateResetToken(token, email);

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Atomically: update password + mark token used
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, record.user_id]
    );
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [record.id]
    );

    return res.json({ ok: true, message: 'Password set. You can now log in.' });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Password reset error:', err);
    return res.status(500).json({ error: 'Server error resetting password' });
  }
});

module.exports = router;
