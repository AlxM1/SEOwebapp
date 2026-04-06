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
    // Users table with admin role
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
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

    // Settings table for customization
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Logs table for admin audit trail
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Monitoring table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS monitored_urls (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        url VARCHAR(2048) NOT NULL,
        alert_email VARCHAR(255),
        alert_threshold INTEGER DEFAULT 10,
        check_frequency VARCHAR(20) DEFAULT 'weekly',
        last_seo_score INTEGER,
        last_geo_score INTEGER,
        last_checked_at TIMESTAMP,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS monitoring_history (
        id SERIAL PRIMARY KEY,
        monitored_url_id INTEGER REFERENCES monitored_urls(id) ON DELETE CASCADE,
        seo_score INTEGER,
        geo_score INTEGER,
        performance_score INTEGER,
        issues_count INTEGER,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // SaaS multi-tenancy tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agencies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        tier VARCHAR(20) DEFAULT 'free',
        active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        agency_id INTEGER REFERENCES agencies(id) ON DELETE CASCADE,
        key_hash VARCHAR(64) UNIQUE NOT NULL,
        key_prefix VARCHAR(10) NOT NULL,
        label VARCHAR(100),
        tier VARCHAR(20) DEFAULT 'free',
        monthly_limit INTEGER DEFAULT 50,
        usage_this_month INTEGER DEFAULT 0,
        usage_reset_at TIMESTAMP DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
        active BOOLEAN DEFAULT true,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage_log (
        id SERIAL PRIMARY KEY,
        api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
        agency_id INTEGER REFERENCES agencies(id) ON DELETE CASCADE,
        endpoint VARCHAR(100) NOT NULL,
        url_analyzed VARCHAR(2048),
        response_time_ms INTEGER,
        success BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tier limits table for easy config
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tier_limits (
        tier VARCHAR(20) PRIMARY KEY,
        monthly_analyses INTEGER NOT NULL,
        features JSONB NOT NULL DEFAULT '{}'
      );
      INSERT INTO tier_limits (tier, monthly_analyses, features) VALUES
        ('free', 50, '{"crawl":true,"geo":true,"performance":true,"pdf":false,"compare":false,"bulk":false,"monitor":false,"sitecrawl":false}'),
        ('starter', 500, '{"crawl":true,"geo":true,"performance":true,"pdf":true,"compare":true,"bulk":false,"monitor":false,"sitecrawl":false}'),
        ('pro', 2000, '{"crawl":true,"geo":true,"performance":true,"pdf":true,"compare":true,"bulk":true,"monitor":true,"sitecrawl":false}'),
        ('agency', 10000, '{"crawl":true,"geo":true,"performance":true,"pdf":true,"compare":true,"bulk":true,"monitor":true,"sitecrawl":true}')
      ON CONFLICT (tier) DO NOTHING;
    `);

    // QuickBooks OAuth token storage
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qb_tokens (
        id SERIAL PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        realm_id TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        company_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // QuickBooks sync idempotency log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qb_sync_log (
        id SERIAL PRIMARY KEY,
        stripe_id TEXT UNIQUE NOT NULL,
        qb_entity_type TEXT NOT NULL,
        qb_entity_id TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        synced_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = { pool, initializeDatabase };
