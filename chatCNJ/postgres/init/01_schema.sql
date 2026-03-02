-- ChatNormas: Schema for normativos + conversations
-- Ensure cryptographic utilities for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE EXTENSION IF NOT EXISTS vector;

-- ── Normativos (embeddings from CSV) ──
CREATE TABLE IF NOT EXISTS normativos (
    id          TEXT PRIMARY KEY,
    document    TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    embedding   vector(1024),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ── Conversations persistence ──
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL DEFAULT 'Nova conversa',
    mode        TEXT NOT NULL DEFAULT 'chat',
    model       TEXT,
    messages    JSONB NOT NULL DEFAULT '[]',
    message_count INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
