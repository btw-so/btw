-- MCP server configurations per user
CREATE TABLE IF NOT EXISTS btw.user_mcps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    command TEXT NOT NULL,
    args JSON DEFAULT '[]',
    env JSON DEFAULT '{}',
    port INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);
