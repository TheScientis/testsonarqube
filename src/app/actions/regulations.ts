"use server";

import type { Regulation, CreateRegulationInput } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { getEmbedding, isGeminiConfigured } from "@/lib/gemini";

const CHUNK_MAX = 800;
const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 100;

function chunkContent(text: string): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    const byParagraph = trimmed.split(/\n\n+/);
    const out: string[] = [];
    for (const p of byParagraph) {
        if (p.length <= CHUNK_MAX) {
            if (p.length > 0) out.push(p);
        } else {
            for (let i = 0; i < p.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
                const chunk = p.slice(i, i + CHUNK_SIZE).trim();
                if (chunk) out.push(chunk);
            }
        }
    }
    return out;
}

export async function listRegulations(options?: { includeDeleted?: boolean }): Promise<Regulation[]> {
    if (!isSupabaseConfigured()) return [];
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
        .from("regulations")
        .select("*")
        .order("updated_at", { ascending: false });
    if (!options?.includeDeleted) {
        query = query.is("deleted_at", null);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data as Regulation[];
}

export async function getRegulation(id: string): Promise<Regulation | null> {
    if (!isSupabaseConfigured()) return null;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.from("regulations").select("*").eq("id", id).single();
    if (error || !data) return null;
    return data as Regulation;
}

export async function createRegulation(data: CreateRegulationInput): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Database not configured." };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    if (!data.title?.trim()) return { success: false, error: "Title is required." };
    if (!data.type || !["perda", "uu", "pp"].includes(data.type)) return { success: false, error: "Type must be perda, uu, or pp." };
    if (!data.content_text?.trim()) return { success: false, error: "Content text is required." };

    const now = new Date().toISOString();
    const row = {
        region_id: data.region_id ?? null,
        type: data.type,
        title: data.title.trim(),
        source_url: data.source_url?.trim() || null,
        content_text: data.content_text.trim(),
        effective_date: data.effective_date?.trim() || null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
    };
    const { data: inserted, error: insertError } = await supabase.from("regulations").insert(row).select("id").single();
    if (insertError || !inserted) return { success: false, error: insertError?.message ?? "Failed to create regulation." };

    const regulationId = inserted.id;
    if (!isGeminiConfigured()) return { success: true, id: regulationId };

    const chunks = chunkContent(data.content_text);
    for (let i = 0; i < chunks.length; i++) {
        const embedding = await getEmbedding(chunks[i]);
        if (!embedding) continue;
        await supabase.from("regulation_embeddings").insert({
            regulation_id: regulationId,
            chunk_index: i,
            content_chunk: chunks[i],
            embedding: `[${embedding.join(",")}]`,
        });
    }
    return { success: true, id: regulationId };
}

export async function updateRegulation(id: string, data: CreateRegulationInput): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Database not configured." };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    if (!data.title?.trim()) return { success: false, error: "Title is required." };
    if (!data.type || !["perda", "uu", "pp"].includes(data.type)) return { success: false, error: "Type must be perda, uu, or pp." };
    if (!data.content_text?.trim()) return { success: false, error: "Content text is required." };

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
        .from("regulations")
        .update({
            region_id: data.region_id ?? null,
            type: data.type,
            title: data.title.trim(),
            source_url: data.source_url?.trim() || null,
            content_text: data.content_text.trim(),
            effective_date: data.effective_date?.trim() || null,
            updated_at: now,
            deleted_at: null,
        })
        .eq("id", id);
    if (updateError) return { success: false, error: updateError.message };

    await supabase.from("regulation_embeddings").delete().eq("regulation_id", id);

    if (isGeminiConfigured()) {
        const chunks = chunkContent(data.content_text);
        for (let i = 0; i < chunks.length; i++) {
            const embedding = await getEmbedding(chunks[i]);
            if (!embedding) continue;
            await supabase.from("regulation_embeddings").insert({
                regulation_id: id,
                chunk_index: i,
                content_chunk: chunks[i],
                embedding: `[${embedding.join(",")}]`,
            });
        }
    }
    return { success: true };
}

export async function softDeleteRegulation(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Database not configured." };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const now = new Date().toISOString();
    const { error } = await supabase.from("regulations").update({ deleted_at: now, updated_at: now }).eq("id", id);
    return { success: !error, error: error?.message };
}

export async function restoreRegulation(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Database not configured." };
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const now = new Date().toISOString();
    const { error } = await supabase.from("regulations").update({ deleted_at: null, updated_at: now }).eq("id", id);
    return { success: !error, error: error?.message };
}
