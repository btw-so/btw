# A1 Bot — Complete Features & Tools Reference

A1 is a personal AI assistant accessed via Telegram (and future platforms). It offers reminders, web research, voice messages, image generation, scheduled autonomous tasks, a heartbeat system, and — for Pro subscribers — a dedicated Linux sandbox VM with custom tools and MCP integrations.

---

## Regular User Features

### 1. Reminders & Alerts

Full reminder management with flexible scheduling — one-time, recurring (daily, weekly, custom cron), with family member support.

**Tools:**

| Tool | Description |
|------|-------------|
| `add_reminder` | Create a reminder with alerts |
| `add_alert` | Add an alert to an existing reminder |
| `edit_reminder` | Change a reminder's text |
| `complete_reminder` | Mark a reminder as done |
| `delete_reminder` | Delete a reminder and all its alerts |
| `delete_alert` | Delete a specific alert |
| `read_reminders` | Query reminders by date range and status |

**`add_reminder` parameters:**
- `text` — Short reminder text (e.g., "Buy milk", "Call mom")
- `when_date` — Due date in DD/MM/YYYY (user's local timezone)
- `when_time` — Due time in HH:MM:SS 24h format (default: 23:59:00)
- `recurring` — True for recurring reminders
- `crontab` — Cron schedule string (minute hour day-of-month month day-of-week)
- `alerts` — Array of alert timestamps in 'DD/MM/YYYY HH:MM:SS' format
- `family_user_id` — (Optional) Create reminder for a family member

**Examples:**
```
"Remind me to buy groceries tomorrow at 5pm"
"Every Monday at 9am remind me to submit the weekly report"
"Show me my reminders for this week"
"Remind me to take medicine every day at 8am and 8pm"
```

**Recurring cron examples:**
- `0 10 * * *` — Daily at 10am
- `0 9 * * MON` — Every Monday at 9am
- `*/30 * * * *` — Every 30 minutes
- `0 0 1 * *` — First day of each month at midnight

---

### 2. Web Search & Research

Real-time web search powered by the Exa API. The agent does multi-query research, fetches pages, and synthesizes answers.

**Tools:**

| Tool | Description |
|------|-------------|
| `web_search` | Search the web (returns top 5 results with titles, URLs, and content snippets up to 1000 chars each) |
| `web_fetch` | Fetch a webpage by URL and return content as markdown (truncated to 12,000 chars) |

**Examples:**
```
"What's the latest news about AI?"
"Compare pricing of Notion vs Obsidian"
"Do deep research on the best noise-cancelling headphones under $300"
"Summarize this article: https://example.com/article"
```

For "deep research" requests, the agent makes multiple `web_search` calls with different angles and fetches relevant pages to provide thorough answers with specifics (numbers, pricing tiers, feature comparisons).

---

### 3. Voice Messages & Phone Calls

Text-to-speech via ElevenLabs with 10 voice options, plus phone call capability via Twilio.

**Tools:**

| Tool | Description |
|------|-------------|
| `text_to_speech` | Convert text to speech and send as audio message |
| `call_user` | Call the user's phone and speak a message |

**Available voices:**

| Voice | Style |
|-------|-------|
| rachel | Warm female |
| sarah | Soft female (default) |
| emily | Calm female |
| alice | Confident female |
| matilda | Warm female |
| drew | Confident male |
| paul | Grounded male |
| charlie | Casual male |
| george | British male |
| james | Deep male |

**Examples:**
```
"Say good morning to me in a voice message"
"Read this aloud using the George voice"
"Call me and tell me to take a break"
```

---

### 4. Image Generation

Create images from text descriptions using Gemini or DALL-E 3.

**Tool:** `generate_image`

**Parameters:**
- `prompt` — Detailed image description
- `aspect_ratio` — "1:1" (square, default), "16:9" (landscape), "9:16" (portrait), "4:3" (photo), "3:4" (portrait photo)

**Examples:**
```
"Generate an image of a cozy cabin in the mountains at sunset"
"Draw a cartoon cat wearing a top hat"
"Create a phone wallpaper of a starry night over the ocean"  (uses 9:16)
```

---

### 5. File Sharing

Send files directly to the chat — images, documents, videos, GIFs.

**Tool:** `send_file`

**Parameters:**
- `url` — Direct URL to a publicly accessible file
- `type` — (Optional) "photo", "document", "video", "animation" (auto-detected from URL extension)
- `caption` — (Optional) Caption text

---

### 6. Memory System

Persistent memory across conversations — the agent remembers who you are, your preferences, and what you've been doing.

**Three memory layers:**

| Type | Purpose |
|------|---------|
| **Soul** | Your personality, communication style, tone, humor, language patterns |
| **Global** | Facts, preferences, instructions always relevant (job, tools, people) |
| **Daily** | What happened today — tasks done, topics discussed, decisions made |

**Tools:**

| Tool | Description |
|------|-------------|
| `read_memories` | Read all memories (soul, global, today, yesterday) |
| `write_global_memory` | Update global memory (read first, then overwrite with merged content) |
| `write_soul` | Update soul (read first, then overwrite with merged content) |
| `get_daily_memory` | Get daily memory for a specific date |
| `write_daily_memory` | Update daily memory for a specific date |
| `search_memories` | Full-text search across all memories |
| `set_timezone` | Update your timezone (IANA format like 'Asia/Kolkata') |

**Examples:**
```
"Remember that I prefer morning reminders"
"What do you know about me?"
"Forget that I work at Acme Corp"
"What did we talk about yesterday?"
```

---

### 7. Scheduled Autonomous Tasks (Agentic Tasks)

Schedule the AI to do real work at future times — not just reminders, but full agent loops with web search, tool use, and reporting. Available to all users.

**Tools:**

| Tool | Description |
|------|-------------|
| `create_agentic_task` | Create a scheduled autonomous task |
| `list_agentic_tasks` | List your scheduled tasks (filter by status) |
| `update_agentic_task` | Change name, instruction, cron, or pause/resume |
| `delete_agentic_task` | Delete a task and all run history |
| `stop_this_task` | (During scheduled runs only) Self-terminate the task |

**`create_agentic_task` parameters:**
- `name` — Short name (e.g., "Morning News", max 100 chars)
- `instruction` — Detailed instruction for what the agent should do
- `cron_expression` — (Optional) Cron schedule in local timezone
- `run_at` — (Optional) One-shot time in 'DD/MM/YYYY HH:MM:SS'
- `end_at` — (Optional) Deadline after which task auto-completes

**Reminders vs Agentic Tasks:**
- **Reminders** = simple notifications ("remind me to buy milk")
- **Agentic tasks** = scheduled AI work ("every morning find top HN stories and summarize them")

**Examples:**
```
"Every morning at 9am, find the top 5 Hacker News stories and summarize them"
"In 10 minutes, research flights from NYC to London and send me the cheapest options"
"Every Friday at 5pm, give me a weekend activity suggestion based on the weather"
"Every 5 mins until 7pm, check Bitcoin price and tell me if it moves more than 2%"
```

---

### 8. Heartbeat System

Automatic background system that proactively monitors your context and keeps memories up to date.

**Two heartbeat types:**

| Type | Default Schedule | Behavior |
|------|-----------------|----------|
| **Hourly Heartbeat** | Every hour (`0 * * * *`) | Reviews context and recent activity. Only messages you if something genuinely useful — like an upcoming reminder, a helpful follow-up, or a proactive suggestion. Stays silent if nothing warrants a message. |
| **Daily Reflection** | 3 AM local time (`0 3 * * *`) | Silently reviews all conversations and task runs from the last 24 hours. Updates soul, global, and daily memories with new insights. Never messages you. |

**Tool:** `update_heartbeat_settings`

**Parameters:**
- `hourly_enabled` — Enable/disable hourly heartbeat
- `daily_enabled` — Enable/disable daily heartbeat
- `hourly_cron` — Cron for hourly frequency (e.g., '*/30 * * * *' for every 30 min)
- `daily_cron` — Cron for daily time (e.g., '0 22 * * *' for 10 PM)

**Heartbeat-specific tool:** `read_recent_activity` — Reads conversations, task runs, and scheduled task activity from the last N hours.

**Examples:**
```
"Disable the hourly heartbeat"
"Make the heartbeat check every 30 minutes"
"Change the daily reflection to run at 10pm instead of 3am"
"Turn off all heartbeats"
```

---

### 9. Onboarding & Feature Discovery

Tools that help users discover what A1 can do.

**Tools:**

| Tool | Description |
|------|-------------|
| `get_features_guide` | Returns a markdown guide listing all 10 features with example prompts |
| `get_explored_features` | Shows which features the user has tried so far |
| `update_explored_features` | Updates the explored features log after user tries something |

---

### 10. Family Features

Share contacts to pair with family members for shared reminders.

**How it works:**
1. Share a contact via Telegram (phone number)
2. Contact creates or links to an existing family group
3. Create reminders for family members using `family_user_id` parameter
4. Family members receive alerts on their connected platforms

---

### 11. Telegram-Specific Features

| Feature | Description |
|---------|-------------|
| **Text messages** | Full conversation with all tools available |
| **Photos** | Share photos with optional captions — processed as image+text |
| **Voice messages** | Auto-transcribed to text, then processed by agent |
| **Contact sharing** | Login/register or add family members |
| **Bot commands** | `/subscribe` (upgrade to Pro), `/unsubscribe` (cancel Pro) |
| **Inline buttons** | Used for tool approval, timezone selection, and interactive flows |
| **Markdown** | Responses formatted with bold, italic, code blocks, links |
| **Message splitting** | Long responses automatically split into multiple messages |

---

## Pro User Features

Pro users get everything above, plus a dedicated Linux sandbox VM (Ubuntu 24.04, 2 vCPU, 4GB RAM) and extension systems.

### 12. Sandbox VM

A dedicated Linux virtual machine for writing code, running scripts, building projects, and executing commands.

**Tools:**

| Tool | Approval Required | Description |
|------|:-:|-------------|
| `sandbox_bash` | Yes | Execute bash commands (scripts, packages, git, builds, tests). Working directory persists across calls. Default timeout: 30s, max: 5min. |
| `sandbox_read` | No | Read file contents with line numbers. Supports offset/limit for large files. |
| `sandbox_write` | Yes | Create or overwrite files. Creates parent directories automatically. |
| `sandbox_edit` | Yes | Surgical string replacement in files. Must read file first. Old string must be exact and unique. |
| `sandbox_glob` | No | Find files by glob pattern (e.g., `**/*.js`). Returns up to 200 matching paths. |
| `sandbox_grep` | No | Search file contents with regex. Returns matching lines with file paths and line numbers. |
| `sandbox_todo` | No | Track multi-step task progress as a todo list (stored at `~/.a1_todos.json`). |

**Examples:**
```
"Write a Python script that scrapes the top posts from Reddit"
"Create a simple HTML page with a countdown timer"
"Install Node.js and set up a new Express project"
"Clone this GitHub repo and fix the failing tests"
"Read the README.md and explain what this project does"
```

**Approval flow:**
When the agent wants to run a bash command, write a file, or edit a file, you get an inline Telegram button to approve or deny. You have 2 minutes to respond — timeout is treated as denial.

**Approval preview format:**
- `sandbox_bash` — Shows the exact command to be executed
- `sandbox_write` — Shows file path + first 200 chars of content
- `sandbox_edit` — Shows file path + old/new string previews

---

### 13. Skills System

Extend A1's knowledge with custom skill files stored on your sandbox.

**Location:** `~/a1/skills/<skill-name>/SKILL.md`

**Format:**
```markdown
---
name: my-skill
description: When to use this skill
---
# Instructions
Detailed instructions for the agent when this skill is activated...
```

**How it works:**
1. Create a directory under `~/a1/skills/` with a `SKILL.md` file
2. SKILL.md has YAML frontmatter (name + description) and markdown instructions
3. Skills can include reference files in subdirectories (e.g., `references/`, `scripts/`)
4. At conversation start, A1 reads all skill headers and injects them into its system prompt
5. When relevant, the agent reads the full skill content via `sandbox_read`

**Examples:**
```
"Create a skill for writing React components following our team's conventions"
"Add a skill that knows our deployment process"
"List my skills"
```

---

### 14. Custom Tools

Create your own tools that execute commands or scripts on the sandbox.

**Location:** `~/a1/tools/<tool-name>.json`

**Format:**
```json
{
    "name": "check_weather",
    "description": "Check current weather for a city",
    "parameters": {
        "type": "object",
        "properties": {
            "city": {
                "type": "string",
                "description": "City name"
            }
        },
        "required": ["city"]
    },
    "type": "command",
    "command": "curl -s 'wttr.in/${TOOL_CITY}?format=3'"
}
```

**Two types:**
- `"type": "command"` + `"command": "..."` — Executes a shell command
- `"type": "script"` + `"script": "/path/to/script.sh"` — Executes a script file

**Argument passing:** Parameters are passed as `TOOL_<ARG_NAME>` environment variables (safe, no injection).

**How it works:**
1. Create JSON files at `~/a1/tools/`
2. Tools are discovered at conversation start
3. Appear as `custom_<name>` in the agent's tool list
4. All custom tools require approval before execution

**Examples:**
```
"Create a custom tool that tells a joke using an API"
"Add a tool that checks the status of my server"
"List my custom tools"
```

---

### 15. MCP (Model Context Protocol) Servers

Connect external services via the MCP standard — GitHub, databases, APIs, and any MCP-compatible server.

**Management tools:**

| Tool | Approval Required | Description |
|------|:-:|-------------|
| `add_mcp_server` | Yes | Register a new MCP server |
| `remove_mcp_server` | No | Remove a registered MCP server |
| `list_mcp_servers` | No | List all configured MCP servers |

**`add_mcp_server` parameters:**
- `name` — Unique server name (lowercase, no spaces, e.g., "github")
- `command` — Command to start server (e.g., "npx", "node", "python3")
- `args` — Command arguments (e.g., `["-y", "@modelcontextprotocol/server-github"]`)
- `env` — Environment variables (e.g., `{"GITHUB_TOKEN": "ghp_xxx"}`)
- `install_command` — (Optional) Shell command to install server first

**How it works:**
1. Register an MCP server with `add_mcp_server`
2. Server config saved to database with auto-assigned port (starting at 9100)
3. On next conversation, server launches via `mcp-proxy` on the sandbox
4. Tools auto-discovered via MCP `listTools` protocol
5. Tools appear as `mcp_<server>_<tool>` (e.g., `mcp_github_create_issue`)
6. All MCP tools require approval before execution

**Common MCP servers:**

| Server | Package | What it does |
|--------|---------|-------------|
| GitHub | `@modelcontextprotocol/server-github` | Issues, PRs, repos, code search |
| SQLite | `@modelcontextprotocol/server-sqlite` | Query SQLite databases |
| Filesystem | `@modelcontextprotocol/server-filesystem` | File operations with access control |

**Examples:**
```
"Connect my GitHub account" (then provide token)
"Set up an MCP server for PostgreSQL"
"What MCP servers do I have?"
"Remove the GitHub MCP server"
```

---

### 16. Task Workspace (Pro Scheduled Tasks)

Pro users with scheduled tasks get a dedicated persistent workspace directory.

**Location:** `/root/tasks/task_<id>/`

**Features:**
- `PROGRESS.md` — Cross-run context file. Agent reads it at start of each run, updates after completing work.
- Persistent file storage — Store artifacts, data files, scripts for future runs.
- Working directory persists across calls within a run.

**How it works:**
1. First scheduled run creates the workspace directory
2. Agent reads `PROGRESS.md` to understand previous work
3. Agent does its work using sandbox tools
4. Agent updates `PROGRESS.md` with a brief log entry (date, what it did, key results)
5. Files persist for the next run

---

## System Internals

### Model Fallback

Models are tried in order of cost (cheapest first):
1. Google Gemini 3 Flash (preview)
2. Google Gemini 2.5 Flash

Falls back to next model if the previous one fails. Returns error if all providers fail.

### Context Limits

| Limit | Value |
|-------|-------|
| Max tool turns per run | 30 |
| Max messages before pruning | 40 (older messages summarized) |
| Tool approval timeout | 2 minutes |
| Web fetch content limit | 12,000 chars |
| Search results per query | 5 results, 1,000 chars each |
| Sandbox bash timeout | 30s default, 5min max |
| Glob results limit | 200 files |

### Timezone Handling

- All user-facing dates/times are in the user's local timezone
- Tool parameters accept `DD/MM/YYYY HH:MM:SS` format
- Stored as UTC internally
- Set via `set_timezone` tool with IANA names (e.g., 'Asia/Kolkata', 'America/New_York')
