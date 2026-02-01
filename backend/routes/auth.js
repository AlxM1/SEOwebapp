const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    res.json({ token, user });
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

    console.log('[LOGIN DEBUG] Login attempt for email:', email);

    if (!email || !password) {
      console.log('[LOGIN DEBUG] Missing email or password');
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    console.log('[LOGIN DEBUG] User found:', user ? 'YES' : 'NO');

    if (!user) {
      console.log('[LOGIN DEBUG] User not found in database for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[LOGIN DEBUG] User ID:', user.id, 'Role:', user.role);
    console.log('[LOGIN DEBUG] Stored password hash exists:', !!user.password);
    console.log('[LOGIN DEBUG] Stored password hash length:', user.password ? user.password.length : 0);

    // Compare password
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('[LOGIN DEBUG] Password comparison result:', validPassword ? 'MATCH' : 'NO MATCH');

    if (!validPassword) {
      console.log('[LOGIN DEBUG] Password mismatch for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    console.log('[LOGIN DEBUG] Login successful for:', email);
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('[LOGIN DEBUG] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
