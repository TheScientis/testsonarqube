-- Enable pgvector extension if not enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add the new columns to the promises table
ALTER TABLE promises 
ADD COLUMN IF NOT EXISTS embedding vector(768),
ADD COLUMN IF NOT EXISTS parent_promise_id UUID REFERENCES promises(id);

-- Optional: Create an index for faster similarity searches
CREATE INDEX IF NOT EXISTS promises_embedding_idx ON promises USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Notify schema cache to reload
NOTIFY pgrst, 'reload schema';
