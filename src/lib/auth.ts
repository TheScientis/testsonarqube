import { createClient } from "./supabase/client";

// Check if variables are available
export function isSupabaseConfigured() {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured()) {
        return { user: null, error: "Database connection not configured." };
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data?.user?.email) {
        fetch("/api/notify-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "sign_in", email: data.user.email }),
            credentials: "include",
        }).catch(() => {});
    }
    return { user: data?.user || null, error: error?.message || null };
}

export async function signInWithGoogle(redirectTo?: string) {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`
        : undefined;
    await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
    });
}

export async function signUp(email: string, password: string, name: string) {
    if (!isSupabaseConfigured()) {
        return { user: null, error: "Database connection not configured." };
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
    });
    if (data?.user?.email) {
        fetch("/api/notify-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "sign_up", email: data.user.email }),
            credentials: "include",
        }).catch(() => {});
    }
    return { user: data?.user || null, error: error?.message || null };
}

export async function signOut() {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
}

// Client-side session getter
export async function getCurrentUser() {
    if (!isSupabaseConfigured()) {
        return null;
    }
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
}

// Deprecated in favor of direct server queries in actions with createClient() from src/lib/supabase/server
export async function getServerUser() {
    return null;
}
