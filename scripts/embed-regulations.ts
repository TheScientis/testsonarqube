/**
 * One-off script to chunk and embed regulations that have no regulation_embeddings.
 * Run: npx tsx scripts/embed-regulations.ts
 * Requires: GOOGLE_GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

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

async function getEmbedding(text: string): Promise<number[] | null> {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent(text);
        return result.embedding.values.slice(0, 768);
    } catch (e) {
        console.error("Embedding error:", e);
        return null;
    }
}

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        process.exit(1);
    }
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        console.error("Missing GOOGLE_GEMINI_API_KEY");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: regs } = await supabase.from("regulations").select("id, title, content_text").is("deleted_at", null);
    if (!regs?.length) {
        console.log("No regulations to embed.");
        return;
    }

    const { data: existing } = await supabase.from("regulation_embeddings").select("regulation_id");
    const embeddedIds = new Set((existing || []).map((r) => r.regulation_id));

    for (const r of regs) {
        const text = r.content_text || (r as { content?: string }).content || "";
        if (!text) continue;
        if (embeddedIds.has(r.id)) {
            console.log(`Skip (already embedded): ${r.title}`);
            continue;
        }
        const chunks = chunkContent(text);
        console.log(`Embedding ${r.title} (${chunks.length} chunks)...`);
        for (let i = 0; i < chunks.length; i++) {
            const emb = await getEmbedding(chunks[i]);
            if (!emb) continue;
            await supabase.from("regulation_embeddings").insert({
                regulation_id: r.id,
                chunk_index: i,
                content_chunk: chunks[i],
                embedding: `[${emb.join(",")}]`,
            });
        }
        console.log(`  Done: ${r.title}`);
    }
    console.log("Embedding complete.");
}

main().catch(console.error);
