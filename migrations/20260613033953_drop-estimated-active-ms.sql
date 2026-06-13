-- Remove the interim activity metric column superseded by engaged_ms and activity_intervals.
ALTER TABLE sessions
  DROP COLUMN IF EXISTS estimated_active_ms;
