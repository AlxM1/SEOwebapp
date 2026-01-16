const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Track event
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { eventType, eventData } = req.body;

    await pool.query(
      'INSERT INTO analytics_events (user_id, event_type, event_data) VALUES ($1, $2, $3)',
      [userId, eventType, JSON.stringify(eventData || {})]
    );

    res.json({ message: 'Event tracked' });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get analytics summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Total analyses
    const analysisCount = await pool.query(
      'SELECT COUNT(*) as count FROM analysis_history WHERE user_id = $1',
      [userId]
    );

    // Most analyzed domains
    const topDomains = await pool.query(
      `SELECT
        url,
        COUNT(*) as count
      FROM analysis_history
      WHERE user_id = $1
      GROUP BY url
      ORDER BY count DESC
      LIMIT 10`,
      [userId]
    );

    // Average scores
    const avgScores = await pool.query(
      `SELECT
        AVG(performance_score) as avg_performance,
        AVG(seo_score) as avg_seo,
        AVG(accessibility_score) as avg_accessibility,
        AVG(best_practices_score) as avg_best_practices
      FROM analysis_history
      WHERE user_id = $1`,
      [userId]
    );

    res.json({
      totalAnalyses: parseInt(analysisCount.rows[0].count),
      topDomains: topDomains.rows,
      averageScores: avgScores.rows[0],
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
