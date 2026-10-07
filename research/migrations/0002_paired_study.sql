-- Additive migration: the existing sessions and completions are untouched.
CREATE TABLE IF NOT EXISTS study_sessions (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL UNIQUE,
 token_hash TEXT NOT NULL UNIQUE,
 consent INTEGER NOT NULL CHECK(consent=1),
 consent_version TEXT NOT NULL,
 study_version TEXT NOT NULL,
 website_version TEXT NOT NULL,
 form_order TEXT NOT NULL CHECK(form_order IN ('AB','BA')),
 pre_version TEXT NOT NULL,
 post_version TEXT NOT NULL,
 started_at TEXT NOT NULL,
 stage TEXT NOT NULL CHECK(stage IN ('pre','learning','post','survey','done')),
 stage_started_at TEXT NOT NULL,
 completed_at TEXT,
 draft_json TEXT
);
CREATE INDEX IF NOT EXISTS study_sessions_started ON study_sessions(started_at);
CREATE TABLE IF NOT EXISTS study_steps (
 session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
 stage TEXT NOT NULL CHECK(stage IN ('pre','learning','post','survey')),
 form TEXT CHECK(form IN ('A','B')),
 bank_version TEXT,
 started_at TEXT NOT NULL,
 completed_at TEXT NOT NULL,
 answers_json TEXT NOT NULL,
 results_json TEXT NOT NULL,
 PRIMARY KEY(session_id,stage)
);
CREATE TABLE IF NOT EXISTS study_metadata (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 revision INTEGER NOT NULL,
 updated_at TEXT NOT NULL,
 content_json TEXT NOT NULL
);
