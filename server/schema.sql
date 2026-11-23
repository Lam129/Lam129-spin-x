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
-- email + password accounts (v2)
CREATE TABLE IF NOT EXISTS accounts (
  email TEXT PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_player ON sessions (player_id);
-- coin purchases (v3): written only by the verified Stripe webhook, credited once via /api/shop/claim
CREATE TABLE IF NOT EXISTS purchases (
  session_id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  pack TEXT NOT NULL,
  coins INTEGER NOT NULL,
  amount INTEGER,
  currency TEXT,
  payment_intent TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  claimed INTEGER NOT NULL DEFAULT 0,
  reversed INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS purchases_player ON purchases (player_id);
CREATE INDEX IF NOT EXISTS purchases_pi ON purchases (payment_intent);
