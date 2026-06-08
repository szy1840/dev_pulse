-- Per-session engaged time (idle gaps removed) and burst intervals for union/concurrency stats.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS engaged_ms BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activity_intervals JSONB NOT NULL DEFAULT '[]';
