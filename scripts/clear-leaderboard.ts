import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearCache() {
    console.log("Emptying leaderboard_cache...");
    
    // In Supabase, delete all rows by matching a condition that is always true
    const { error } = await supabase.from('leaderboard_cache').delete().neq('region_id', 'invalid-id-to-force-delete-all');
    
    if (error) {
        console.error("Failed to clear cache:", error);
    } else {
        console.log("Successfully cleared leaderboard_cache.");
    }
}

clearCache();
