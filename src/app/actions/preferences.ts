"use server";

import { createClient } from "@/lib/supabase/server";

export interface UserPreferences {
    user_id: string;
    notify_critical_gaps: boolean;
    notify_policy_updates: boolean;
    notify_weekly_digest: boolean;
    regions_of_interest: string[];
    /** Primary region used by chat (Bang Jaga) and verification; null = use first region of interest. */
    default_region_id?: string | null;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, "user_id"> = {
    notify_critical_gaps: true,
    notify_policy_updates: true,
    notify_weekly_digest: false,
    regions_of_interest: [],
    default_region_id: null,
};

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
    if (!userId) {
        throw new Error("userId is required to fetch preferences");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (error || !data) {
        const newPrefs: UserPreferences = { ...DEFAULT_PREFERENCES, user_id: userId };
        await saveUserPreferences(newPrefs);
        return newPrefs;
    }

    return data as UserPreferences;
}

export async function saveUserPreferences(preferences: UserPreferences): Promise<boolean> {
    if (!preferences.user_id) {
        console.error("[saveUserPreferences] user_id is required");
        return false;
    }

    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("user_preferences")
            .upsert(preferences, { onConflict: "user_id" })
            .select();

        if (error) {
            console.error("[saveUserPreferences] Supabase upsert error:", error);
            return false;
        }

        return !!data;
    } catch (e) {
        console.error("[saveUserPreferences] Exception caught:", e);
        return false;
    }
}
