// Test: connect to DB and run the new table migrations
const { Pool } = require('pg');
require('dotenv').config({ path: '/home/eternity/seowebapp/backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'seo_analytics',
});

async function run() {
  // user_agency_roles
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_agency_roles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      agency_id INTEGER REFERENCES agencies(id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'owner' CHECK (role IN ('owner','admin','member','viewer')),
      invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      accepted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, agency_id)
    );
  `);
  console.log('user_agency_roles: OK');

  // password_reset_tokens
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('password_reset_tokens: OK');

  // webhook_events
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id SERIAL PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      stripe_event_id VARCHAR(100) UNIQUE,
      payload JSONB,
      processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      error TEXT
    );
  `);
  console.log('webhook_events: OK');

  console.log('All migrations applied.');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
