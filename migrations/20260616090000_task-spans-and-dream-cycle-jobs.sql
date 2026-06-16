-- Dream Cycle semantic task extraction.
CREATE TABLE semantic_task_extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
  source_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  last_error TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id)
);

CREATE INDEX semantic_task_jobs_status_idx
  ON semantic_task_extraction_jobs (status, queued_at);

CREATE INDEX semantic_task_jobs_team_status_idx
  ON semantic_task_extraction_jobs (team_id, status, queued_at);

CREATE TRIGGER semantic_task_extraction_jobs_updated_at
  BEFORE UPDATE ON semantic_task_extraction_jobs
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE semantic_task_extraction_jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE task_spans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  task_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  intent TEXT,
  object TEXT,
  action TEXT,
  outcome TEXT,
  message_start_index INTEGER,
  message_end_index INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  confidence NUMERIC(4, 3),
  source_model TEXT,
  source_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, task_index)
);

CREATE INDEX task_spans_session_idx
  ON task_spans (session_id, task_index);

CREATE INDEX task_spans_team_started_idx
  ON task_spans (team_id, started_at DESC);

CREATE INDEX task_spans_user_started_idx
  ON task_spans (user_id, started_at DESC);

ALTER TABLE task_spans ENABLE ROW LEVEL SECURITY;
