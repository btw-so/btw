# BTW Backend — Agent Reference

## Running Services (Docker)

Started via `docker compose -f deploy/docker-compose.dev.yml up -d tasks`

| Container | Image | Ports | Status |
|-----------|-------|-------|--------|
| **tasks** | deploy-tasks | 9210 (HTTP), 9211 (YJS WebSocket), 9212 (Uppy) | Running via PM2 |
| **postgres** | postgres:15.2-alpine | 5432 | Running |
| **redis** | redis:6.2-alpine | 6379 | Running |

Connection strings:
- Postgres: `postgres://postgres:postgres@db:5432/btw` (internal) / `localhost:5432` (host)
- Redis: `redis://redis:6379/` (internal) / `localhost:6379` (host)

---

## Tasks Service (port 9210, 9211, 9212)

The main backend. Node.js/Express app managed by PM2. No ORM — raw SQL via `pg` (node-postgres).

### Three Servers

| Port | Protocol | Purpose |
|------|----------|---------|
| 9210 | HTTP | REST API + Uppy Companion (`/companion`) |
| 9211 | WebSocket | YJS/Hocuspocus real-time collaborative editing |
| 9212 | WebSocket | Uppy Companion file upload socket |

### API Endpoints

#### Auth — `/otp`
- `POST /otp/generate` — send OTP to email (or use `ADMIN_OTP` env to skip)
- `POST /otp/validate` — validate OTP, set `btw_uuid` login cookie (30-day expiry)

#### User — `/user`
- `POST /user/details` — get current user info + login status
- `POST /user/update` — update profile (name, slug, bio, pic, socials, settings JSON)
- `POST /user/add/domain` — add a custom domain
- `POST /user/logout` — clear session

#### Notes — `/notes`
- `POST /notes/get` — paginated list of notes (params: `page`, `limit`, `after`)
- `POST /notes/get-by-id` — single note by ID
- `POST /notes/import` — import notes from URLs (queued via Bull)
- `POST /notes/update/html` — update note HTML
- `POST /notes/update/delete` — soft-delete / undelete
- `POST /notes/update/archive` — archive / unarchive
- `POST /notes/update/private` — toggle private
- `POST /notes/update/publish` — publish / unpublish
- `POST /notes/update/slug` — set URL slug
- `POST /notes/backup/notes` — backup: all notes with tag `%list%`
- `POST /notes/backup/notes/modified` — backup: notes modified since ISO date

#### List (Nodes) — `/list`
- `POST /list/get` — get nodes for a user or node ID
- `POST /list/pinned` — get pinned nodes
- `POST /list/update` — bulk upsert nodes
- `POST /list/search` — full-text search
- `POST /list/utils/readable` — URL → Markdown extraction
- `POST /list/api/child/add/:id/:hash` — add child node (markdown → YDoc)
- `POST /list/api/note/update/:id/:hash` — update node's note from markdown
- `POST /list/api/note/create` — create note + node from title/markdown
- `GET /list/api/node/:nodeId` — get node details with note/file
- `POST /list/widget/generate-token` — generate short-lived widget embed token
- `POST /list/public/list` — public list by node ID + HMAC hash (no auth)
- `POST /list/public/note` — public note by ID + HMAC hash (no auth)
- `POST /list/backup/nodes` — backup: all nodes
- `POST /list/backup/nodes/modified` — backup: nodes modified since date

#### Files — `/files`
- `POST /files/get-by-id` — file metadata by ID
- `POST /files/add-file` — register a file (URL, name, user_id)
- `POST /files/backup/files` — backup: all files
- `POST /files/backup/files/modified` — backup: files created after date

#### Scribbles — `/scribbles`
- `POST /scribbles/get` — get scribble by ID
- `POST /scribbles/upsert` — create/update scribble (with optional ydoc binary)
- `POST /scribbles/delete` — delete scribble
- `POST /scribbles/page/get` — get scribble page
- `POST /scribbles/page/upsert` — create/update scribble page (drawing_data + thumbnail)
- `POST /scribbles/page/delete` — delete scribble page

#### Memories — `/memories`
- `POST /memories/get` — all memories for authenticated user
- `GET /memories/public/:userId` — public memories (no auth)
- `POST /memories/add` — add memory (lat, lng, place_name, photos, etc.)
- `PUT /memories/update` — update memory
- `DELETE /memories/delete` — delete memory

#### Telegram — `/telegram`
- `POST /telegram/webhook` — bot webhook: onboarding, AI reminders, family pairing, timezone
- `GET /telegram/webhook` — webhook verification
- Webhook URL set via ngrok (`ngrok http 9210`), registered with Telegram Bot API

#### WhatsApp — `/whatsapp`
- `POST /whatsapp/webhook` — Cloud API webhook: messages, buttons, contacts, AI + family flows
- `GET /whatsapp/webhook` — verification (verify token: `"kalki"`)

#### A1 — `/a1`
- `POST /a1/thread/telegram/fetch` — fetch Telegram chat history

#### Jobs — `/jobs`
- `GET /jobs/admin/run-add-missing-recurring-alerts` — trigger recurring reminder job
- Registers Bull queue processors for `uxQueue`, `alertsQueue` (reminder alerts, recurring reminders, digests)

#### Admin UI
- `/admin/queues` — Bull Board dashboard for monitoring all three queues

#### Uppy Companion
- `/companion` — S3 file upload proxy (mounted on HTTP server)

### YJS/Hocuspocus (port 9211)

Real-time collaborative document editing. Two document types by name prefix:

| Prefix | Storage | Conversion |
|--------|---------|------------|
| `note.<user_id>.<note_id>` | `btw.notes.ydoc` + derived `html`/`json` | Tiptap HTML↔JSON↔YDoc (debounced 4s write) |
| `scribble.<user_id>.<scribble_id>` | `btw.scribbles.ydoc` | Raw YDoc only |

Auth token format: `<loginToken>:::<fingerprint>`

### Bull Queues (Redis)

| Queue | Key Jobs |
|-------|----------|
| `base-queue` | Note imports |
| `alerts-queue` | `reminder-alert`, `addLiveAlerts` (every 10h), `addRecurringReminders` (daily midnight), `markCompletedReminders` (daily midnight) |
| `ux-queue` | `new-user-family-invites`, `new-reminders`, `reminder-digest`, etc. |

---

## Database Schema (PostgreSQL — `btw` schema)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `btw.users` | User accounts | id, email, name, slug, bio, pic, settings (json) |
| `btw.login_token` | Sessions | uuid (PK), user_id, fingerprint |
| `btw.otp` | One-time passwords | email, otp |
| `btw.notes` | Documents | id (uuid), user_id, html, json, ydoc (bytea), title, slug, publish, archive, delete, private |
| `btw.nodes` | Hierarchical list items | id, user_id, text, parent_id, pos, note_id (FK→notes), file_id (FK→files) |
| `btw.files` | Uploaded files | id (uuid), user_id, name, url, type, metadata (json) |
| `btw.scribbles` | Drawing documents | id (uuid), user_id, data, ydoc (bytea) |
| `btw.reminders` | Reminders | id, user_id, text, duedate, completed, recurring, crontab |
| `btw.alerts` | Scheduled reminder alerts | id, reminder_id, user_id, duedate |
| `btw.telegram_user_map` | Telegram↔user mapping | telegram_id, user_id |
| `btw.telegram_chat_context` | Telegram message history | chat_id, message (jsonb), type |
| `btw.whatsapp_user_map` | WhatsApp↔user mapping | whatsapp_id, user_id |
| `btw.whatsapp_chat_context` | WhatsApp message history | chat_id, message (jsonb), type |
| `btw.family_users` | Family pairings | id1, id2 |
| `btw.family_invites` | Pending family invites | requester_user_id, requested_user_id |
| `btw.custom_domains` | Custom domains | domain, user_id, umami_site_id |
| `btw.memories` | Location memories | id, user_id, name, latitude, longitude, photo_urls (jsonb), private |

---

## Key Environment Variables

| Variable | Default (dev) | Purpose |
|----------|---------------|---------|
| `ADMIN_EMAIL` | — | Default user email (single-user mode) |
| `ADMIN_SLUG` | — | Default user URL slug |
| `ADMIN_OTP` | — | Fixed OTP for dev (skips email) |
| `SECRET` | — | Session/Uppy secret |
| `ENCRYPTION_KEY` | — | HMAC for public link hashes |
| `TURN_OFF_SINGLE_USER_MODE` | `0` | Set `1` to allow multiple users |
| `S3_KEY`, `S3_SECRET`, `S3_BUCKET`, `S3_ENDPOINT` | — | S3 file storage |
| `TELEGRAM_TOKEN` | — | Telegram Bot API |
| `GEMINI_API_KEY` | — | Google Gemini (primary LLM for A1 agent) |
| `OPENAI_API_KEY` | — | OpenAI (A1 agent fallback + Whisper STT fallback) |
| `ANTHROPIC_API_KEY` | — | Anthropic (A1 agent fallback) |
| `MISTRAL_API_KEY` | — | Mistral Voxtral (primary STT for audio transcription) |
| `EXA_API_KEY` | — | Exa web search (agent tool, conditionally enabled) |
| `SMTP_HOST/PORT/USER/PASS/FROM` | — | Email delivery |
| `PUBLISHER_SERVER_URL` | `publisher:9222` | Internal publisher URL |

---

## Project Structure

```
btw/
├── tasks/              # Main backend service
│   ├── app.js          # Express app + YJS + Uppy Companion setup
│   ├── bin/www         # HTTP server entrypoint
│   ├── routes/         # All API route handlers
│   ├── logic/          # Business logic (DB queries, processing)
│   ├── services/       # DB pool, Redis, Bull queues
│   ├── utils/          # Helpers (auth middleware, date, HMAC, readable)
│   ├── views/          # Handlebars templates (minimal)
│   ├── public/         # Static assets
│   └── pm2.json        # PM2 process config
├── publisher/          # Public-facing blog/site renderer (port 9222, not running)
│   ├── app.js          # Express + Handlebars SSR
│   ├── routes/         # Public pages + internal cache refresh
│   └── logic/          # Note/user caching, queries
├── writer/             # Frontend app (port 9000, not running)
├── locus/              # Additional frontend
├── deploy/
│   └── docker-compose.dev.yml
└── btw.sql             # Database schema init
```

---

## A1 — Telegram AI Agent

The A1 bot is a Telegram-based AI assistant for managing reminders. It uses **pi-ai** (`@mariozechner/pi-ai`) for the LLM agent loop with tool calling.

### Architecture

```
Telegram Message
  → ngrok tunnel (HTTPS → localhost:9210)
    → POST /telegram/webhook (routes/telegram.js)
      → loginFlowFunction (onboarding if new user)
      → fetchUserChats (chat history from telegram_chat_context)
      → runAgentLoop (logic/agent.js)
        → hydrateMessages (unpack dbUnits → live DB state)
        → buildConversationMessages (format for pi-ai)
        → complete() loop with tools (pi-ai)
        → tool execute → DB CRUD (logic/ai.js)
      → sendMessageToUserOnTelegram (logic/telegram.js)
```

### Key Files

| File | Purpose |
|------|---------|
| `tasks/logic/agent.js` | Agent loop: `runAgentLoop()`, system prompt, message hydration, provider fallback |
| `tasks/logic/tools.js` | 7 tool definitions with TypeBox schemas, each calls existing DB functions |
| `tasks/logic/ai.js` | DB CRUD functions: `addRemindersToDB`, `readReminders`, `editReminderTextsInDB`, `completeRemindersInDB`, `deleteRemindersFromDB`, `deleteAlertsFromDB`, `addAlertToDb`, `fetchDBUnitsMain` |
| `tasks/logic/telegram.js` | Telegram API helpers: `sendMessageToUserOnTelegram`, `sendReminderUnitToTelegram`, `fetchUserChats` |
| `tasks/routes/telegram.js` | Webhook handler: login flow, message routing, callback queries (timezone, reminder actions) |
| `tasks/logic/transcribe.js` | Audio transcription: Mistral Voxtral 2 (primary) → OpenAI Whisper (fallback) |

### Tools (defined in `logic/tools.js`)

| Tool | Description | DB Function |
|------|-------------|-------------|
| `add_reminder` | Create reminder + alerts | `addRemindersToDB` |
| `add_alert` | Add alert to existing reminder | `addAlertToDb` |
| `edit_reminder` | Change reminder text | `editReminderTextsInDB` |
| `complete_reminder` | Mark done | `completeRemindersInDB` |
| `delete_reminder` | Delete reminder + alerts | `deleteRemindersFromDB` |
| `delete_alert` | Delete specific alert | `deleteAlertsFromDB` |
| `read_reminders` | Query reminders by date/status | `readReminders` |
| `web_search` | Search the web via Exa API (only if `EXA_API_KEY` set) | N/A (external API) |
| `web_fetch` | Fetch a URL and return content as markdown | N/A (HTTP fetch + turndown) |

Tools are created per-request via `createTools({ user_id, timezoneOffsetInSeconds })` to bind user context. Each tool's `execute` calls existing DB functions from `logic/ai.js` and dispatches UX queue jobs.

### LLM Provider Fallback

Models tried in order (cheapest first):
1. `google:gemini-2.5-flash` (primary)
2. `openai:gpt-4o-mini` (fallback 1)
3. `anthropic:claude-haiku-4-5` (fallback 2)

If a provider fails, the next one is tried. Max 10 tool-call steps per request.

### pi-ai Gotchas

**Critical**: pi-ai has specific message format requirements that differ by role:
- **User messages**: `{ role: "user", content: "string" }` — content is a plain string
- **Assistant messages**: `{ role: "assistant", content: [{ type: "text", text: "..." }] }` — content MUST be an array of content blocks
- If you pass assistant content as a plain string, `transformMessages` in pi-ai calls `.flatMap()` on it, which silently produces garbage and Gemini returns `stopReason: "error"` with empty content

**Gemini requires alternating roles**: Consecutive same-role messages cause empty responses. The agent merges them before sending. The current user input is also merged if the last history message is from the user.

**Tool result format**: `{ role: "toolResult", toolCallId, toolName, content: [{ type: "text", text }], isError, timestamp }`

**pi-ai API**: `require("@mariozechner/pi-ai")` — CJS compatible. Key exports: `getModel`, `complete`, `validateToolCall`, `Type`, `StringEnum`

### Chat History & dbUnits

Bot messages in `telegram_chat_context` can have `metadata.dbUnits` containing reminder/alert IDs. Before LLM calls, `hydrateMessages()` → `fetchDBUnitsMain()` fetches live DB state and injects readable text (`dbText`) into the conversation. After tool actions, `sendReminderUnitToTelegram()` packs IDs back into metadata for future hydration.

### Old Code (still in ai.js, unused)

The following functions in `logic/ai.js` are from the old multi-LLM-call chain and are no longer called by the agent loop: `classifyInput`, `classifyReminder`, `crudRemindersGPT`, `readRemindersGPT`, `behaveLikeBaymaxGPT`, `aiProcessingMaster`, `aiProcessingWrapper`, `processActions`, `runLLM`, `runLLMs`, `models`. These can be cleaned up after the new agent is fully tested.

---

## Dev Workflow

### Starting / Restarting

```bash
# Start all services
sg docker "docker compose -f deploy/docker-compose.dev.yml up -d"

# Rebuild + restart tasks only (after Dockerfile or package.json changes)
sg docker "docker compose -f deploy/docker-compose.dev.yml up -d --build tasks"

# Hot-reload code changes (logic/, routes/, utils/, services/ are volume-mounted)
sg docker "docker exec btw-tasks pm2 restart tasks"
```

Volume-mounted directories (no rebuild needed for changes):
`views/`, `services/`, `public/`, `routes/`, `logic/`, `utils/`, `app.js`, `version.js`, `package.json`, `files/`

Dockerfile rebuild required for: new npm packages, Dockerfile changes, `bin/` changes.

### Checking Logs

```bash
# PM2 app logs (stdout + stderr)
sg docker "docker exec btw-tasks pm2 logs tasks --lines 50 --nostream"

# PM2 process status
sg docker "docker exec btw-tasks pm2 list"

# Docker container logs
sg docker "docker logs btw-tasks --tail 50"
```

### Testing the Webhook Locally

```bash
# Direct curl to webhook (bypasses ngrok)
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"message":{"message_id":9999,"from":{"id":CHAT_ID,"is_bot":false,"first_name":"Test"},"chat":{"id":CHAT_ID,"type":"private"},"date":1234567890,"text":"Hello"}}' \
  "http://localhost:9210/telegram/webhook"

# Check webhook status
curl -s "https://api.telegram.org/bot$TELEGRAM_TOKEN/getWebhookInfo" | python3 -m json.tool
```

### Common Issues

- **Postgres `auth_failed`**: The postgres password is set on first container init. If the volume persists from a prior run with a different password, reset it: `sg docker "docker exec btw-postgres psql -U postgres -c \"ALTER USER postgres PASSWORD 'postgres';\""`
- **`y-protocols` missing**: Peer dep of `y-prosemirror` not installed by `--legacy-peer-deps`. Fixed in Dockerfile with explicit `npm install y-protocols@^1.0.1`.
- **Agent returns empty text**: Usually means assistant messages were passed with string content instead of block array format (see pi-ai gotchas above), or consecutive same-role messages weren't merged.
- **503 from ngrok**: The tasks container may be crash-looping. Check `pm2 list` — if restart count is high, check error logs.
- **Dockerfile uses Node 20**: Required for pi-ai. The `--legacy-peer-deps` flag is needed for tiptap peer dependency conflicts.
