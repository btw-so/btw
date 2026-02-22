# BTW Project — Agent Guide

## Quick Reference

```bash
# Rebuild & deploy
sg docker "docker compose -f deploy/docker-compose.dev.yml up -d --build tasks"

# Restart without rebuild (only if files are volume-mounted, which they aren't)
sg docker "docker exec btw-tasks pm2 restart tasks"

# View logs
sg docker "docker exec btw-tasks pm2 logs tasks --lines 200 --nostream"

# DB access
sg docker "docker exec btw-postgres psql -U postgres -d btw"

# Run a query
sg docker "docker exec btw-postgres psql -U postgres -d btw -c \"SELECT ...\""
```

## Architecture Overview

**Stack**: Node.js/Express, PostgreSQL (raw SQL, `btw` schema), Redis + Bull queues, Docker Compose

```
tasks/
├── app.js                    # Express app setup, middleware, route mounting
├── bin/www                   # HTTP server entry point
├── logic/                    # Business logic (agent, tools, integrations)
│   ├── agent.js              # Core agent loop (runAgentLoop), system prompt, model fallback
│   ├── agenticTaskTools.js   # Scheduled task CRUD tools + scheduling helpers
│   ├── messageRouter.js      # Routes incoming messages to tasks, LLM classification
│   ├── entryPoints.js        # Platform abstraction (telegram, whatsapp send/receive)
│   ├── tools.js              # Base agent tools (reminders, web search, image gen, etc.)
│   ├── sandboxTools.js       # Sandbox VM tools (bash, read, write, edit, grep, glob, todo)
│   ├── toolAdapter.js        # Adapts legacy tools to pi-agent-core format + approval flow
│   ├── memoryTools.js        # User memory CRUD (soul, global, daily)
│   ├── customTools.js        # User-defined tools loaded from sandbox ~/.a1/tools/
│   ├── skills.js             # User-defined skills loaded from sandbox ~/.a1/skills/
│   ├── mcpClient.js          # MCP server connections from sandbox
│   ├── mcpManagementTools.js # MCP server add/remove tools
│   ├── telegram.js           # Telegram API helpers, markdown→HTML converter
│   ├── whatsapp.js           # WhatsApp API helpers
│   ├── approval.js           # Tool approval flow (Redis polling, inline buttons)
│   ├── sandbox.js            # Hetzner VM provisioning/management
│   ├── subscription.js       # Stripe subscription logic
│   ├── ai.js                 # LLM calls for reminder parsing, recurring alerts
│   ├── transcribe.js         # Voice message transcription
│   └── user.js               # User lookup helpers
├── routes/
│   ├── telegram.js           # Telegram webhook handler (main user interaction entry)
│   ├── jobs.js               # Bull queue processors (alerts, reminders, sandbox, agentic tasks)
│   ├── stripe.js             # Stripe webhook (mounted BEFORE express.json() for raw body)
│   └── ...                   # Other REST routes (files, notes, lists, etc.)
├── services/
│   ├── db.js                 # PostgreSQL connection pool
│   ├── redis.js              # Redis client (database 3)
│   ├── queue.js              # Bull queues (database 2): base, alerts, ux, sandbox, agentic
│   ├── ssh.js                # SSHSession class for sandbox VM access
│   ├── hetzner.js            # Hetzner Cloud API for VM provisioning
│   ├── stripe.js             # Stripe SDK setup
│   └── twilio.js             # Twilio for phone calls
├── migrations/               # SQL migration files (run manually)
└── utils/utils.js            # Date/time formatting, timezone conversion
```

## Key Patterns

### Database Access
```js
const db = require("../services/db");
const tasksDB = await db.getTasksDB();
const { rows } = await tasksDB.query(`SELECT * FROM btw.table WHERE id = $1`, [id]);
```
- All tables in `btw` schema
- Raw SQL via `pg`, no ORM
- User settings: `btw.users.settings` (JSON column, not JSONB)

### Tool Definitions (Legacy Format)
```js
{
    name: "tool_name",
    description: "What it does",
    parameters: Type.Object({
        param: Type.String({ description: "..." }),
    }),
    requiresApproval: true, // optional, triggers approval flow
    execute: async (_toolCallId, args) => {
        return { output: JSON.stringify({ success: true, ... }) };
    },
}
```
Tools are wrapped by `toolAdapter.js` into pi-agent-core's `AgentTool` format.

### Bull Queue Pattern
```js
const { myQueue } = require("../services/queue");

// Register processor
myQueue.process("job-name", async (job, done) => {
    const { data } = job.data;
    // ... do work ...
    done(); // or done(err)
});

// Add job
myQueue.add("job-name", { data }, {
    delay: 5000,          // optional delay in ms
    jobId: "unique-id",   // optional dedup key
    removeOnComplete: true,
    removeOnFail: true,
});
```

### pi-ai / pi-agent-core Library
- `getModel(provider, model)` returns a config object (NOT callable)
- `completeSimple(model, { systemPrompt, messages })` for simple text generation
- `Agent` class for tool-calling loops:
  ```js
  const agent = new Agent({
      initialState: { systemPrompt, model, tools, messages, thinkingLevel: "off", transformContext },
  });
  agent.subscribe((event) => { /* turn_start, tool_execution_start/end, agent_end */ });
  await agent.continue(); // runs the loop
  await agent.waitForIdle();
  ```
- `event.messages` in `agent_end` contains only NEW messages from the agent, NOT the initial ones. Always combine: `[...finalMessages, ...event.messages]`

## Agentic Tasks System

Every user interaction is an "agentic task" with persistent message history.

### Flow
1. **Incoming message** → `routes/telegram.js` → `messageRouter.routeMessage()`
2. Router finds existing task (via reply-to or recent active task) or creates new one
3. Task's saved messages loaded from `btw.agentic_tasks.messages` (JSONB)
4. `agent.js:runAgentLoop()` runs with full message history
5. After agent completes, messages saved back via `messageRouter.saveTaskState()`
6. Bot response linked to task via `btw.entry_point_messages` for reply-to routing

### Scheduled (Auto) Tasks
- Created via `create_agentic_task` tool with `cron_expression` and optional `end_at` deadline
- Stored in `btw.agentic_tasks` with `mode = 'auto'`, `status = 'active'`
- **Chain scheduling**: task creation schedules first delayed Bull job → after each run, next run is scheduled as another delayed job
- **Failsafe poll**: 60-second repeating job (`check-due-tasks`) catches any missed runs
- **Dedup**: `jobId = agentic-run-${taskId}` (stable per task, no timestamp) prevents double-firing
- **Deadline**: `end_at` column checked before each run and before scheduling next run; auto-completes when passed
- **Self-termination**: agent has `stop_this_task` tool during scheduled runs
- **Workspace**: pro+sandbox tasks get `/root/tasks/task_${id}/` directory, agent reads/writes `PROGRESS.md` for cross-run context
- All scheduling in `routes/jobs.js`, tool definitions in `logic/agenticTaskTools.js`

### DB Tables
- `btw.agentic_tasks` — task definition, message history, schedule, workspace
- `btw.task_runs` — audit log of each run (started_at, completed_at, status, error)
- `btw.entry_point_messages` — maps platform message IDs to tasks for reply-to routing

## Pro / Sandbox System

- Pro users get a Hetzner VM (Ubuntu 24.04, 2 vCPU, 4GB RAM)
- SSH access via `services/ssh.js`: `new SSHSession({ host, privateKey })` → `.connect()` → `.exec(cmd)` → `.close()`
- Sandbox tools require approval in manual chat (`chatId` triggers approval flow), auto-approved in scheduled runs (`chatId = null`)
- VM lifecycle: `provision-sandbox` → `check-sandbox-ready` (polling) → ready; `destroy-sandbox` for cleanup
- User extensions loaded from sandbox: skills (`~/.a1/skills/`), custom tools (`~/.a1/tools/`), MCP servers (DB config)

## Agent System Prompt Structure

Built by `agent.js:buildSystemPrompt()`. Sections:
1. Base persona (A1/Baymax) + current date/time + user timezone
2. Family members (if any)
3. Capabilities list (reminders, web search, image gen, etc.)
4. Sandbox section (if pro+sandbox)
5. Platform section (Telegram commands, formatting)
6. Extensions (skills, custom tools, MCP servers)
7. Memories (soul, global, daily)
8. Agentic task section (if scheduled run: instruction, workspace, stop_this_task)

## Telegram Integration

- Webhook at `routes/telegram.js`, handles text, voice, photos, contacts, callbacks
- `logic/telegram.js` has `markdownToTelegramHTML()` — converts standard markdown to Telegram HTML
- Fallback: if Telegram rejects HTML (`can't parse`), retries with tags stripped
- Long messages split into chunks via `splitMessage()`

## Timezone Handling

- User timezone stored as `settings.timezoneOffsetInSeconds` (seconds from UTC)
- Cron expressions are in user's LOCAL time
- Cron parsing: feed parser local "now" (`UTC + offset`), convert result back to UTC (`nextLocal - offset`)
- All DB timestamps are in UTC (`TIMESTAMPTZ`)
- Display: `utils.js` has `getDDMMYYYYFromUTCToLocal()`, `getHHMMSSFromUTCToLocal()`, etc.

## Common Pitfalls

1. **Stripe webhook needs raw body** — route mounted BEFORE `express.json()` in `app.js`
2. **Gemini requires alternating roles** — consecutive same-role messages must be merged
3. **`event.messages` from agent_end is only NEW messages** — combine with initial messages for full history
4. **Bull jobId must be stable for dedup** — don't include timestamps in jobId if you want dedup
5. **Settings column is `json` not `jsonb`** — can't use Postgres JSON operators on it
6. **Docker rebuild required for code changes** — files are NOT volume-mounted; `pm2 restart` alone won't pick up changes
7. **MAX_STEPS = 30** — agent aborts after 30 tool-calling turns; aborted runs produce empty text
8. **Context pruning at 40 messages** — `transformContext` summarizes older messages when history exceeds 40
