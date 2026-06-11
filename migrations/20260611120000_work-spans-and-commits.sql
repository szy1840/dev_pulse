-- Phase 1 of task attribution: work spans (sub-session units cut on branch
-- changes + idle gaps) and locally-collected git commits. Spans and commits
-- join on (team_id, repo_root_hash) + time windows; branch is an extra signal
-- on claude-code spans. Like the other tables, RLS is enabled with no
-- policies: only the server admin key reaches them.

-- Join key against commits: hash of the git repo root containing the session cwd.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS repo_root_hash TEXT;
CREATE INDEX IF NOT EXISTS sessions_repo_root_idx ON sessions (team_id, repo_root_hash);

-- One row per contiguous unit of work within a session. Replaced wholesale
-- when the parent session re-syncs (spans derive from one transcript file).
CREATE TABLE work_spans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  span_index INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  git_branch TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cache_read_tokens BIGINT NOT NULL DEFAULT 0,
  cache_creation_tokens BIGINT NOT NULL DEFAULT 0,
  -- sha256-truncated hashes of files touched; cleartext paths never leave the CLI.
  file_hashes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, span_index)
);
CREATE INDEX work_spans_team_started_idx ON work_spans (team_id, started_at DESC);
CREATE INDEX work_spans_user_started_idx ON work_spans (user_id, started_at DESC);

-- Commits collected by the CLI from local repos (author = the syncing user).
-- Different team members syncing the same repo collide on (team, repo, sha),
-- so upserts are idempotent across machines.
CREATE TABLE commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_root_hash TEXT NOT NULL,
  sha TEXT NOT NULL,
  author_email TEXT NOT NULL,
  authored_at TIMESTAMPTZ NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  files_changed INTEGER NOT NULL DEFAULT 0,
  insertions INTEGER NOT NULL DEFAULT 0,
  deletions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, repo_root_hash, sha)
);
CREATE INDEX commits_team_authored_idx ON commits (team_id, authored_at DESC);
CREATE INDEX commits_repo_idx ON commits (team_id, repo_root_hash, authored_at DESC);

ALTER TABLE work_spans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commits ENABLE ROW LEVEL SECURITY;
