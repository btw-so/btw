-- Agentic Tasks: Every interaction is a conversation thread
-- Drop old tables if they exist (from previous migration)
DROP TABLE IF EXISTS btw.entry_point_messages CASCADE;
DROP TABLE IF EXISTS btw.task_runs CASCADE;
DROP TABLE IF EXISTS btw.agentic_tasks CASCADE;

CREATE TABLE btw.agentic_tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(200),                     -- LLM-generated short name, nullable for quick tasks
  instruction TEXT,                       -- For auto tasks: the instruction to execute
  cron_expression VARCHAR(100),           -- null = manual/immediate task
  next_run_at TIMESTAMPTZ,                -- Next scheduled run (auto tasks only)
  end_at TIMESTAMPTZ,                     -- Deadline: auto-complete after this time
  status VARCHAR(20) DEFAULT 'active',    -- active | paused | completed | archived
  mode VARCHAR(10) DEFAULT 'manual',      -- manual | auto
  entry_point VARCHAR(50) NOT NULL,       -- telegram | whatsapp | discord | slack | web
  chat_id NUMERIC,                        -- Platform-specific chat/channel ID
  origin_message_id VARCHAR(100),         -- Platform message ID for reply-to threading
  messages JSONB DEFAULT '[]',            -- Full pi-agent message history
  working_directory VARCHAR(500) DEFAULT '/root',  -- Sandbox working dir persistence
  workspace VARCHAR(500),                -- Dedicated sandbox workspace path (pro only)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agentic_tasks_next_run ON btw.agentic_tasks(next_run_at) WHERE status = 'active';
CREATE INDEX idx_agentic_tasks_user ON btw.agentic_tasks(user_id);
CREATE INDEX idx_agentic_tasks_user_active ON btw.agentic_tasks(user_id, status) WHERE status = 'active';

CREATE TABLE btw.task_runs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES btw.agentic_tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'running',   -- running | completed | failed
  error TEXT
);

CREATE INDEX idx_task_runs_task_id ON btw.task_runs(task_id);

-- Maps platform messages to tasks for reply-to routing
CREATE TABLE btw.entry_point_messages (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES btw.agentic_tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  entry_point VARCHAR(50) NOT NULL,
  platform_message_id VARCHAR(100) NOT NULL,
  chat_id NUMERIC NOT NULL,
  role VARCHAR(20) NOT NULL,              -- user | bot
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_epm_lookup ON btw.entry_point_messages(entry_point, chat_id, platform_message_id);
CREATE INDEX idx_epm_task ON btw.entry_point_messages(task_id);
