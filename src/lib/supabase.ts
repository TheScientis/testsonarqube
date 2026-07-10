import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Use process.env directly so Next can inline NEXT_PUBLIC_* in the client bundle.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!_supabase) {
        if (!url || !anonKey) {
            throw new Error(
                "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set in .env.local and restart dev server."
            );
        }
        _supabase = createClient(url, anonKey);
    }
    return _supabase;
}

export const supabase = new Proxy({} as unknown as SupabaseClient, {
    get(_target, prop) {
        const client = getSupabase();
        return (client as unknown as Record<string, unknown>)[prop as string];
    },
});


export function isSupabaseConfigured(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}