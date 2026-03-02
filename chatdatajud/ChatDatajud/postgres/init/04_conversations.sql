-- ============================================
-- ChatDatajud — Conversations persistence
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(120) NOT NULL DEFAULT 'Nova Conversa',
    mode        VARCHAR(30)  NOT NULL DEFAULT 'conversational',
    model       VARCHAR(100),
    messages    JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_mode    ON conversations(mode);
