-- Cleaned user-side message material for later semantic task extraction.
CREATE TABLE session_intent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ,
  text TEXT NOT NULL,
  source TEXT,
  text_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, message_index)
);

CREATE INDEX session_intent_messages_session_idx
  ON session_intent_messages (session_id, message_index);

CREATE INDEX session_intent_messages_team_time_idx
  ON session_intent_messages (team_id, occurred_at DESC);

CREATE INDEX session_intent_messages_user_time_idx
  ON session_intent_messages (user_id, occurred_at DESC);

ALTER TABLE session_intent_messages ENABLE ROW LEVEL SECURITY;
