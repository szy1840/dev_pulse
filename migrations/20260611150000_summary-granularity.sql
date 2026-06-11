-- Period-scoped summaries: daily_summaries rows now carry a granularity
-- ('day' | 'week' | 'month'), keyed by the period's start day. Existing rows
-- default to 'day' and stay valid.

ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS granularity TEXT NOT NULL DEFAULT 'day';

DROP INDEX IF EXISTS daily_summaries_scope_day_tool_tz_idx;

CREATE UNIQUE INDEX IF NOT EXISTS daily_summaries_scope_day_tool_tz_gran_idx
  ON daily_summaries (team_id, scope, scope_id, day, tool, timezone, granularity);
