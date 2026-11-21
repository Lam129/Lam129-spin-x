-- 陀螺對決 D1 schema
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '旋鬥士',
  profile TEXT,
  updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS leaderboard (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  best INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS leaderboard_best ON leaderboard (best DESC, at ASC);
CREATE TABLE IF NOT EXISTS usage (
  day TEXT PRIMARY KEY,
  writes INTEGER NOT NULL DEFAULT 0
);
