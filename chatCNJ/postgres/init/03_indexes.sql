-- Indexes for normativos (created after seed for speed)
-- IVFFlat requires data in the table, so this runs after seeding
CREATE INDEX IF NOT EXISTS idx_normativos_embedding
    ON normativos USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_normativos_metadata
    ON normativos USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_conversations_updated
    ON conversations (updated_at DESC);
