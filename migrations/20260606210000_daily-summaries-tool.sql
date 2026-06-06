-- Per-agent daily summaries: tool '' = user/team aggregate, otherwise agent slug.

ALTER TABLE daily_summaries ADD COLUMN IF NOT EXISTS tool TEXT NOT NULL DEFAULT '';

ALTER TABLE daily_summaries DROP CONSTRAINT IF EXISTS daily_summaries_team_id_scope_scope_id_day_key;

CREATE UNIQUE INDEX IF NOT EXISTS daily_summaries_scope_day_tool_idx
  ON daily_summaries (team_id, scope, scope_id, day, tool);
