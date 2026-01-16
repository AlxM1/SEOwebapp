const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Get user's analysis history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT * FROM analysis_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Save analysis result
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      url,
      performanceScore,
      seoScore,
      accessibilityScore,
      bestPracticesScore,
      overallScore,
      mobileOptimized,
      sslCertificate,
      issues,
      advantages,
      opportunities,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO analysis_history
      (user_id, url, performance_score, seo_score, accessibility_score, best_practices_score, overall_score, mobile_optimized, ssl_certificate, issues, advantages, opportunities)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        userId,
        url,
        performanceScore,
        seoScore,
        accessibilityScore,
        bestPracticesScore,
        overallScore,
        mobileOptimized,
        sslCertificate,
        issues,
        advantages,
        opportunities,
      ]
    );

    res.json({ message: 'Analysis saved', analysis: result.rows[0] });
  } catch (error) {
    console.error('Error saving analysis:', error);
    res.status(500).json({ error: 'Failed to save analysis' });
  }
});

// Delete analysis from history
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const analysisId = req.params.id;

    await pool.query('DELETE FROM analysis_history WHERE id = $1 AND user_id = $2', [analysisId, userId]);

    res.json({ message: 'Analysis deleted' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: 'Failed to delete analysis' });
  }
});

module.exports = router;
