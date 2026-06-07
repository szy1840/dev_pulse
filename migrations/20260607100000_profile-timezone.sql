-- Per-user timezone for dashboard "today" boundaries and summary caching.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT;

ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

DROP INDEX IF EXISTS daily_summaries_scope_day_tool_idx;

CREATE UNIQUE INDEX IF NOT EXISTS daily_summaries_scope_day_tool_tz_idx
  ON daily_summaries (team_id, scope, scope_id, day, tool, timezone);
