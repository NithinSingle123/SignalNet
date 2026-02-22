CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  source TEXT,
  type TEXT,
  latitude REAL,
  longitude REAL,
  urgency INTEGER,
  timestamp INTEGER,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  severity INTEGER,
  confidence INTEGER,
  latitude REAL,
  longitude REAL,
  status TEXT,
  created_at INTEGER,
  eta_minutes INTEGER DEFAULT NULL,
  verification_data TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS event_centroids (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    TEXT    NOT NULL,
  latitude    REAL    NOT NULL,
  longitude   REAL    NOT NULL,
  recorded_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS advisories (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  message TEXT,
  channels TEXT,
  created_at INTEGER,
  FOREIGN KEY(event_id) REFERENCES events(id)
);
