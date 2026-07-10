"use server";

import type {
    Promise as PromiseType,
    PromiseComment,
    PromiseFeedFilters,
    PromiseFeedResult,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { containsInappropriateContent } from "@/lib/moderation";

const PROMISES_PAGE_SIZE = 20;

export async function getPromiseFeed(
    filters: PromiseFeedFilters = {}
): globalThis.Promise<PromiseFeedResult> {
    const supabase = await createClient();
    let query = supabase.from("promises").select("*", { count: "exact" });

    if (filters.search) {
        const searchStr = `%${filters.search}%`;
        query = query.or(`quote.ilike.${searchStr},politician_name.ilike.${searchStr},watchdog_commentary.ilike.${searchStr},politician_role.ilike.${searchStr},region_id.ilike.${searchStr}`);
    }

    if (filters.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
    }

    if (filters.region && filters.region !== "all") {
        query = query.eq("region_id", filters.region);
    }

    if (filters.status && filters.status !== "all") {
        query = query.eq("source_status", filters.status);
    }

    if (filters.year && filters.year !== "all") {
        query = query
            .gte("date", `${filters.year}-01-01`)
            .lt("date", `${Number(filters.year) + 1}-01-01`);
    }

    const page = Math.max(filters.page ?? 1, 1);
    const from = (page - 1) * PROMISES_PAGE_SIZE;
    const to = from + PROMISES_PAGE_SIZE - 1;

    query = query.order('created_at', { ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) {
        console.error("Supabase error fetching promises:", error);
        throw error;
    }

    const promises = (data ?? []) as PromiseType[];

    return {
        promises,
        total_count: count ?? promises.length,
        has_more: (count ?? 0) > page * PROMISES_PAGE_SIZE,
    };
}

export async function getPromiseFeedFacets(): globalThis.Promise<{
    regions: string[];
    years: string[];
}> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("promises")
        .select("region_id, date")
        .order("date", { ascending: false });

    if (error) {
        console.error("Supabase error fetching promise facets:", error);
        throw error;
    }

    const regions = Array.from(
        new Set(
            (data ?? [])
                .map((row) => row.region_id)
                .filter((value): value is string => Boolean(value))
        )
    ).sort((a, b) => a.localeCompare(b));

    const years = Array.from(
        new Set(
            (data ?? [])
                .map((row) => {
                    if (!row.date) return null;
                    const year = new Date(row.date).getFullYear();
                    return Number.isNaN(year) ? null : String(year);
                })
                .filter((value): value is string => Boolean(value))
        )
    ).sort((a, b) => Number(b) - Number(a));

    return { regions, years };
}

export async function getPromiseComments(promiseId: string, page = 1): globalThis.Promise<{ comments: PromiseComment[], hasMore: boolean }> {
    const supabase = await createClient();
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
        .from("promise_comments")
        .select("*", { count: "exact" })
        .eq("promise_id", promiseId)
        .order("created_at", { ascending: true })
        .range(from, to);

    if (error) {
        console.error("Failed to fetch comments", error);
        throw error;
    }

    const comments = (data ?? []) as PromiseComment[];
    return { comments, hasMore: (count ?? 0) > page * pageSize };
}

export async function reactToPromise(
    promiseId: string,
    type: "like" | "follow" | "flag"
): globalThis.Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Must be logged in to react" };

    const { data: existing } = await supabase.from('promise_reactions')
        .select('id')
        .eq('promise_id', promiseId)
        .eq('user_id', user.id)
        .eq('type', type)
        .single();

    if (existing) {
        await supabase.from('promise_reactions').delete().eq('id', existing.id);
        if (type === 'like') await supabase.rpc('decrement_like_count', { promise_row_id: promiseId });
        return { success: true, message: "Reaction removed" };
    } else {
        await supabase.from('promise_reactions').insert({ promise_id: promiseId, user_id: user.id, type });
        if (type === 'like') {
            await supabase.rpc('increment_like_count', { promise_row_id: promiseId });
        } else if (type === 'flag') {
            const { count } = await supabase.from('promise_reactions')
                .select('*', { count: 'exact', head: true })
                .eq('promise_id', promiseId)
                .eq('type', 'flag');

            if (count && count >= 10) {
                console.log(`[ADMIN ALERT] Promise ${promiseId} has reached ${count} flags and requires review.`);
                // We'd trigger a true alert webhook here
            }
        }
        return { success: true, message: "Reaction added" };
    }
}

export async function submitNewPromise(data: { quote: string; source_url: string; politician_name: string; date: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Must be logged in to submit a promise." };

    if (containsInappropriateContent(data.quote)) {
        return { success: false, error: "Submission contains inappropriate language and has been flagged." };
    }

    const { error } = await supabase.from('promise_submissions').insert({
        promise_id: null,
        submitted_by: user.id,
        quote: data.quote,
        source_url: data.source_url,
        politician_name: data.politician_name,
        date: data.date,
        status: 'pending'
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function getPendingPromises(): globalThis.Promise<any[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.from('promise_submissions')
        .select('id, quote, politician_name, date, status')
        .eq('submitted_by', user.id)
        .eq('status', 'pending');

    if (error) {
        console.error("Error fetching pending promises:", error);
        return [];
    }
    return data || [];
}

export async function commentOnPromise(
    promiseId: string,
    text: string
): globalThis.Promise<{ success: boolean; comment?: PromiseComment; error?: string }> {
    if (text.length > 500) {
        return { success: false, error: "Comment too long." };
    }

    if (containsInappropriateContent(text)) {
        return { success: false, error: "Comment contains inappropriate language and has been flagged." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Must be logged in to comment." };
    }

    const newComment = {
        promise_id: promiseId,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        text,
    };
    const { data, error } = await supabase.from("promise_comments").insert(newComment).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, comment: data as PromiseComment };
}

export async function flagPromiseComment(commentId: string): globalThis.Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Must be logged in to flag" };

    const { data: comment, error: fetchError } = await supabase.from('promise_comments').select('flag_count').eq('id', commentId).single();
    if (fetchError || !comment) return { success: false, error: "Comment not found" };

    const newCount = (comment.flag_count || 0) + 1;
    const { error: updateError } = await supabase.from('promise_comments').update({ flag_count: newCount }).eq('id', commentId);

    if (updateError) return { success: false, error: updateError.message };
    return { success: true };
}
