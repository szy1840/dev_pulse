-- Keep daily summary cache keys aligned with the deployed schema.
ALTER TABLE daily_summaries
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en';

DROP INDEX IF EXISTS daily_summaries_scope_day_tool_tz_gran_idx;

CREATE UNIQUE INDEX IF NOT EXISTS daily_summaries_scope_day_tool_tz_gran_loc_idx
  ON daily_summaries (team_id, scope, scope_id, day, tool, timezone, granularity, locale);
