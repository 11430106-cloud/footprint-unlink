CREATE TABLE sessions (
 id TEXT PRIMARY KEY,
 token_hash TEXT NOT NULL UNIQUE,
 consent INTEGER NOT NULL CHECK(consent = 1),
 started_at TEXT NOT NULL,
 quiz_version TEXT NOT NULL
);
CREATE INDEX sessions_started ON sessions(started_at);

CREATE TABLE completions (
 number INTEGER PRIMARY KEY AUTOINCREMENT,
 session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
 completed_at TEXT NOT NULL,
 answers_json TEXT NOT NULL,
 item_results_json TEXT NOT NULL,
 total_score INTEGER NOT NULL CHECK(total_score BETWEEN 0 AND 100),
 recognition_score INTEGER NOT NULL CHECK(recognition_score BETWEEN 0 AND 40),
 protection_score INTEGER NOT NULL CHECK(protection_score BETWEEN 0 AND 40),
 review_score INTEGER NOT NULL CHECK(review_score BETWEEN 0 AND 20)
);
