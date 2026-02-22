"use strict";

const SKILLS_DIR = "~/a1/skills";

/**
 * Parse YAML frontmatter from a SKILL.md file content.
 * Expects format:
 * ---
 * name: skill-name
 * description: When to use this skill
 * ---
 * (body)
 */
function parseYAMLFrontmatter(content) {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return { name: null, description: null };

    const yaml = match[1];
    const name = yaml.match(/^name:\s*(.+)$/m)?.[1]?.trim() || null;
    const description =
        yaml.match(/^description:\s*(.+)$/m)?.[1]?.trim() || null;

    return { name, description };
}

/**
 * Load user skills from the sandbox VM.
 * Returns a formatted string for system prompt injection (compact list),
 * or empty string if no skills found.
 */
async function loadUserSkills(sshSession) {
    try {
        // List skill directories that contain a SKILL.md
        const { stdout, exitCode } = await sshSession.exec(
            `for d in ${SKILLS_DIR}/*/; do [ -f "\${d}SKILL.md" ] && echo "$d"; done 2>/dev/null`,
            { timeout: 5000 }
        );

        if (exitCode !== 0 || !stdout.trim()) return "";

        const dirs = stdout.trim().split("\n").filter(Boolean);
        const skills = [];

        for (const dir of dirs) {
            try {
                const { stdout: content } = await sshSession.exec(
                    `head -20 "${dir}SKILL.md"`,
                    { timeout: 3000 }
                );
                const { name, description } = parseYAMLFrontmatter(content);
                if (name) {
                    skills.push({
                        name,
                        description: description || "No description",
                        path: `${dir}SKILL.md`,
                    });
                }
            } catch (_) {
                // Skip unreadable skills
            }
        }

        if (skills.length === 0) return "";

        return formatSkillsForPrompt(skills);
    } catch (err) {
        console.log(`[Skills] Failed to load skills: ${err.message}`);
        return "";
    }
}

/**
 * Format skills as a compact list for system prompt injection.
 * The agent reads full content on-demand via sandbox_read.
 */
function formatSkillsForPrompt(skills) {
    const list = skills
        .map((s) => `- **${s.name}**: ${s.description} (${s.path})`)
        .join("\n");

    return `
## User Skills
You have access to user-defined skills that customize your behavior. Available skills:
${list}

To read a skill's full instructions, use sandbox_read on its SKILL.md file path.
To create a new skill: create a directory under ${SKILLS_DIR}/<name>/ and write a SKILL.md file.
The SKILL.md must have YAML frontmatter with \`name\` and \`description\`, then markdown instructions:
\`\`\`
---
name: my-skill
description: When to use this skill
---
# Instructions
Your instructions here...
\`\`\`
You can also add reference files (e.g., \`references/\`, \`scripts/\`) in the skill directory.
To update a skill, use sandbox_edit on its SKILL.md file.`;
}

module.exports = { loadUserSkills, parseYAMLFrontmatter, SKILLS_DIR };
