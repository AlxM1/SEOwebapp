const express = require('express');
const { pool } = require('../db');
const { authenticateToken, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, adminOnly, async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['user']);
    const totalAnalyses = await pool.query('SELECT COUNT(*) as count FROM analysis_history');
    const avgScore = await pool.query('SELECT AVG(overall_score) as avg FROM analysis_history');
    const topDomains = await pool.query(`
      SELECT url, COUNT(*) as count
      FROM analysis_history
      GROUP BY url
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalAnalyses: parseInt(totalAnalyses.rows[0].count),
      avgScore: parseFloat(avgScore.rows[0].avg || 0),
      topDomains: topDomains.rows,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all users
router.get('/users', authenticateToken, adminOnly, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    // Log the action
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, $2, $3)',
      [req.user.userId, 'DELETE_USER', { userId: parseInt(userId) }]
    );

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Promote user to admin
router.post('/users/:id/promote', authenticateToken, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', userId]);

    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, $2, $3)',
      [req.user.userId, 'PROMOTE_USER', { userId: parseInt(userId) }]
    );

    res.json({ message: 'User promoted to admin' });
  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Get app settings
router.get('/settings', authenticateToken, adminOnly, async (req, res) => {
  try {
    const result = await pool.query('SELECT setting_key, setting_value FROM app_settings');

    const settings = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update app settings
router.post('/settings', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { setting_key, setting_value } = req.body;

    await pool.query(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP`,
      [setting_key, JSON.stringify(setting_value)]
    );

    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, details) VALUES ($1, $2, $3)',
      [req.user.userId, 'UPDATE_SETTING', { setting_key }]
    );

    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Get admin logs
router.get('/logs', authenticateToken, adminOnly, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT al.id, al.action, al.details, al.timestamp, u.email
       FROM admin_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ORDER BY al.timestamp DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
