-- =============================================================
-- Migration: feature_changelog table
-- Run: psql -U seoh -d seo_analytics -f migration-feature-changelog.sql
-- Safe to run multiple times (IF NOT EXISTS guards)
-- =============================================================

CREATE TABLE IF NOT EXISTS feature_changelog (
  id           SERIAL PRIMARY KEY,
  feature_id   VARCHAR(100)  NOT NULL,
  tier         VARCHAR(20)   NOT NULL,
  action       VARCHAR(20)   NOT NULL CHECK (action IN ('added', 'removed', 'modified')),
  action_date  DATE          NOT NULL DEFAULT CURRENT_DATE,
  description  TEXT,
  created_by   VARCHAR(100)  DEFAULT 'system',
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by feature or date
CREATE INDEX IF NOT EXISTS idx_feature_changelog_feature_id ON feature_changelog(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_changelog_action_date ON feature_changelog(action_date DESC);
CREATE INDEX IF NOT EXISTS idx_feature_changelog_tier ON feature_changelog(tier);

COMMENT ON TABLE feature_changelog IS 'Audit log of feature availability changes per tier — drives the What''s New feed';
