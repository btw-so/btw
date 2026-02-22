"use strict";

const { Type } = require("@mariozechner/pi-ai");
const db = require("../services/db");

// ─── Features Guide ──────────────────────────────────────────────────────────

const FEATURES_GUIDE = `# A1 Bot — Features Guide

## 1. Reminders & Alerts
Set reminders with flexible scheduling. One-time or recurring (daily, weekly, custom cron).

**Try asking:**
- "Remind me to buy groceries tomorrow at 5pm"
- "Every Monday at 9am remind me to submit the weekly report"
- "Show me my reminders for this week"

## 2. Web Search & Research
I can search the web for current information, compare options, and do deep research.

**Try asking:**
- "What's the latest news about AI?"
- "Compare pricing of Notion vs Obsidian"
- "Do deep research on the best noise-cancelling headphones under $300"

## 3. Web Page Reading
Share a URL and I'll read and summarize the page content.

**Try asking:**
- "Summarize this article: https://example.com/article"
- "What does this page say?" (paste a link)

## 4. Scheduled Tasks (Agentic Tasks)
I can do work for you on a schedule — not just reminders, but actual tasks with research, analysis, and reporting.

**Try asking:**
- "Every morning at 9am, find the top 5 Hacker News stories and summarize them for me"
- "In 10 minutes, search for flights from NYC to London next month and send me the cheapest options"
- "Every Friday at 5pm, give me a weekend activity suggestion based on the weather"

## 5. Memory
I remember things about you across conversations — your preferences, interests, and context. You can also ask me to remember or forget things.

**Try asking:**
- "Remember that I prefer morning reminders"
- "What do you know about me?"
- "Forget that I work at Acme Corp"

## 6. Voice & Audio
I can send you voice messages using text-to-speech with multiple voice options.

**Try asking:**
- "Say good morning to me in a voice message"
- "Read this aloud: [paste text]"
- "Send me a voice message using the George voice"

## 7. Image Generation
I can create images from text descriptions.

**Try asking:**
- "Generate an image of a cozy cabin in the mountains at sunset"
- "Draw a cartoon cat wearing a top hat"
- "Create a minimalist logo for a coffee shop called 'Bean There'"

## 8. File Sharing
I can send you images, documents, or files via URL.

**Try asking:**
- "Send me this image: [URL]"

## 9. Sandbox (Pro)
Pro users get a dedicated Linux VM to write code, run scripts, and build projects.

**Try asking:**
- "Write a Python script that scrapes the top posts from Reddit"
- "Create a simple HTML page with a countdown timer"
- "Install Node.js and set up a new Express project"

## 10. Custom Tools & MCP (Pro)
Pro users can extend the bot with custom tools and MCP servers for integrations like GitHub, databases, APIs, etc.

**Try asking:**
- "What MCP servers can I connect?"
- "Show me my custom tools"
`;

// ─── Onboarding Tools ────────────────────────────────────────────────────────

function createOnboardingTools({ user_id }) {
    return [
        {
            name: "get_features_guide",
            description:
                "Get the full features guide for the bot. Use when the user asks what you can do, asks for help, wants examples, or wants to explore your capabilities. Returns a markdown document listing all features with example prompts.",
            parameters: Type.Object({}),
            execute: async (_toolCallId, _args) => {
                return {
                    output: JSON.stringify({
                        success: true,
                        action: "get_features_guide",
                        guide: FEATURES_GUIDE,
                    }),
                };
            },
        },
        {
            name: "get_explored_features",
            description:
                "Get the user's explored features log. This shows which features the user has already tried and any notes. Use alongside get_features_guide to suggest unexplored features.",
            parameters: Type.Object({}),
            execute: async (_toolCallId, _args) => {
                try {
                    const tasksDB = await db.getTasksDB();
                    const { rows } = await tasksDB.query(
                        `SELECT settings FROM btw.users WHERE id = $1`,
                        [user_id]
                    );
                    const settings = rows[0]?.settings || {};
                    const explored = settings.explored_features || "";

                    return {
                        output: JSON.stringify({
                            success: true,
                            action: "get_explored_features",
                            explored_features: explored || "(empty — user hasn't explored any features yet)",
                        }),
                    };
                } catch (err) {
                    return {
                        output: JSON.stringify({
                            success: false,
                            error: err.message,
                        }),
                    };
                }
            },
        },
        {
            name: "update_explored_features",
            description:
                "Update the user's explored features log. Call this after the user tries a feature to track what they've explored. Write in markdown — you can use checklists, notes, whatever format is useful for future reference.",
            parameters: Type.Object({
                explored_features: Type.String({
                    description:
                        "The full updated explored features content (markdown string). This replaces the previous content, so include everything — both old and new entries.",
                }),
            }),
            execute: async (_toolCallId, args) => {
                try {
                    const tasksDB = await db.getTasksDB();
                    const { rows } = await tasksDB.query(
                        `SELECT settings FROM btw.users WHERE id = $1`,
                        [user_id]
                    );
                    let settings = rows[0]?.settings || {};
                    settings.explored_features = args.explored_features;

                    await tasksDB.query(
                        `UPDATE btw.users SET settings = $1 WHERE id = $2`,
                        [settings, user_id]
                    );

                    return {
                        output: JSON.stringify({
                            success: true,
                            action: "update_explored_features",
                        }),
                    };
                } catch (err) {
                    return {
                        output: JSON.stringify({
                            success: false,
                            error: err.message,
                        }),
                    };
                }
            },
        },
    ];
}

module.exports = { createOnboardingTools, FEATURES_GUIDE };
