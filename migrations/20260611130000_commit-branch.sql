-- Branch (git log --source ref) per commit: extra signal for span↔commit
-- matching — claude-code spans record the branch they worked on.

ALTER TABLE commits ADD COLUMN IF NOT EXISTS branch TEXT;
