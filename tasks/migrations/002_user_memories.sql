-- Migration: User memories (global, soul, daily)
-- One row per user for global and soul, one row per user per day for daily

CREATE TABLE IF NOT EXISTS "btw"."user_memories" (
    "id" SERIAL PRIMARY KEY,
    "user_id" int4 NOT NULL,
    "type" varchar(10) NOT NULL CHECK (type IN ('global', 'soul', 'daily')),
    "day" date,
    "content" text NOT NULL DEFAULT '',
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

-- Fast lookup: user + type (for global/soul)
CREATE INDEX IF NOT EXISTS idx_user_memories_user_type ON btw.user_memories(user_id, type);

-- Reverse chronological daily lookup
CREATE INDEX IF NOT EXISTS idx_user_memories_user_day ON btw.user_memories(user_id, day DESC) WHERE day IS NOT NULL;

-- Full text search across all memories
CREATE INDEX IF NOT EXISTS idx_user_memories_fts ON btw.user_memories USING GIN (to_tsvector('english', content));

-- One global row per user, one soul row per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memories_global ON btw.user_memories(user_id) WHERE type = 'global';
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memories_soul ON btw.user_memories(user_id) WHERE type = 'soul';

-- One daily row per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memories_daily ON btw.user_memories(user_id, day) WHERE type = 'daily';
