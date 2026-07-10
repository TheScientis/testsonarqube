"use server";

import { supabase } from "@/lib/supabase";

export interface UserActivity {
    comments: number;
    reports: number;
    verifications: number;
    likes: number;
    flags: number;
}

export async function getUserActivity(userId: string): globalThis.Promise<UserActivity> {
    if (!userId) {
        throw new Error("userId is required to fetch user activity");
    }

    const { count: commentCount } = await supabase
        .from("promise_comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

    const { count: reportCount } = await supabase
        .from("walkometer_reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

    const { count: verificationCount } = await supabase
        .from("walkometer_reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("report_type", "promise_verification");

    const { count: likeCount } = await supabase
        .from("promise_reactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "like");

    const { count: flagCount } = await supabase
        .from("promise_reactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "flag");

    return {
        comments: commentCount || 0,
        reports: reportCount || 0,
        verifications: verificationCount || 0,
        likes: likeCount || 0,
        flags: flagCount || 0,
    };
}
