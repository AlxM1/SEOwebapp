const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { initializeDatabase } = require('./db');

const __dirname = path.resolve();

const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Admin dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'backend/public/admin.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
