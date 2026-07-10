-- Regulations and RAG embeddings for Bang Jaga
CREATE EXTENSION IF NOT EXISTS vector;

-- regulations: metadata and full text; soft delete via deleted_at
CREATE TABLE IF NOT EXISTS regulations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id text,
    type text NOT NULL CHECK (type IN ('perda', 'uu', 'pp')),
    title text NOT NULL,
    source_url text,
    content_text text NOT NULL,
    effective_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- regulation_embeddings: vector chunks for similarity search
CREATE TABLE IF NOT EXISTS regulation_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_id uuid NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
    chunk_index int NOT NULL,
    content_chunk text NOT NULL,
    embedding vector(768) NOT NULL
);

CREATE INDEX IF NOT EXISTS regulation_embeddings_regulation_id_idx ON regulation_embeddings(regulation_id);
CREATE INDEX IF NOT EXISTS regulation_embeddings_embedding_idx ON regulation_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RPC: semantic search; excludes soft-deleted regulations; returns title, content (chunk), region_id for chat.ts
CREATE OR REPLACE FUNCTION match_regulations(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    regulation_id uuid,
    title text,
    content text,
    region_id text
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id AS regulation_id,
        r.title,
        e.content_chunk AS content,
        r.region_id
    FROM regulation_embeddings e
    JOIN regulations r ON r.id = e.regulation_id
    WHERE r.deleted_at IS NULL
      AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

NOTIFY pgrst, 'reload schema';
