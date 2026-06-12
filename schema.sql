-- 動物大逃殺後端 D1 結構（全球排行榜 + 累計統計）
-- 套用：wrangler d1 execute animal-survivors-db --file=./schema.sql --remote

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  name TEXT,
  character TEXT,
  time REAL,
  kills INTEGER,
  level INTEGER,
  gold INTEGER,
  won INTEGER,
  difficulty TEXT DEFAULT 'easy',
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_runs_time ON runs (time DESC);

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY,
  plays INTEGER NOT NULL DEFAULT 0,
  total_time REAL NOT NULL DEFAULT 0,
  total_kills INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO stats (id, plays, total_time, total_kills) VALUES (1, 0, 0, 0);
