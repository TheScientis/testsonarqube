import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
            "Set them in .env.local and restart the dev server (client bundle inlines env at build time)."
        );
    }
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}