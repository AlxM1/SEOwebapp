const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'seo_analytics',
});

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Analysis history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        url VARCHAR(2048) NOT NULL,
        performance_score INTEGER,
        seo_score INTEGER,
        accessibility_score INTEGER,
        best_practices_score INTEGER,
        overall_score INTEGER,
        mobile_optimized BOOLEAN,
        ssl_certificate BOOLEAN,
        issues TEXT[],
        advantages TEXT[],
        opportunities TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Analytics events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = { pool, initializeDatabase };
