-- Migration 005: Heartbeat system tasks
-- Adds system_type column to agentic_tasks to distinguish system-level tasks from user-created ones

ALTER TABLE btw.agentic_tasks ADD COLUMN IF NOT EXISTS system_type VARCHAR(50) DEFAULT NULL;
-- NULL = user-created task
-- 'heartbeat_hourly' = hourly heartbeat check
-- 'heartbeat_daily' = daily silent reflection

-- Prevent duplicate active heartbeat tasks per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_heartbeat_unique
  ON btw.agentic_tasks(user_id, system_type)
  WHERE system_type IS NOT NULL AND status = 'active';
