import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runSQL() {
    const { data: q1, error: e1 } = await supabase.rpc('execute_sql' as any, {
        query: `
        -- Enable pgvector if not enabled
        CREATE EXTENSION IF NOT EXISTS vector;
        
        -- Add vector embedding column to promises
        ALTER TABLE promises ADD COLUMN IF NOT EXISTS embedding vector(768);
        
        -- Add parent link
        ALTER TABLE promises ADD COLUMN IF NOT EXISTS parent_promise_id UUID REFERENCES promises(id);
    `});

    if (e1) {
        console.error("Migration failed. Please run manually in Supabase SQL editor:");
        console.error(e1.message);
    } else {
        console.log("Migration columns added successfully!");
    }
}

runSQL();
