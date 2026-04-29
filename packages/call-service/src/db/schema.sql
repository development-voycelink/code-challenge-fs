-- Initialize the database schema.
-- Run with: npm run db:init   (or: psql $DATABASE_URL -f src/db/schema.sql)

CREATE TABLE IF NOT EXISTS calls (
  id         VARCHAR(36)  PRIMARY KEY,
  type       VARCHAR(10)  NOT NULL CHECK (type IN ('voice', 'video')),
  status     VARCHAR(20)  NOT NULL CHECK (status IN ('waiting', 'active', 'on_hold', 'ended')),
  queue_id   VARCHAR(100) NOT NULL,
  start_time TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  end_time   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS call_events (
  id        VARCHAR(36) PRIMARY KEY,
  call_id   VARCHAR(36) NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  type      VARCHAR(50) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata  JSONB
);

CREATE INDEX IF NOT EXISTS idx_call_events_call_id ON call_events(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_status        ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_queue_id      ON calls(queue_id);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key        VARCHAR(100) PRIMARY KEY,
  event_id   VARCHAR(36) NOT NULL REFERENCES call_events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id         SERIAL PRIMARY KEY,
  call_id    VARCHAR(36) NOT NULL,
  status     VARCHAR(20) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  timestamp  TIMESTAMPTZ NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
