import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';
import { summarizeSource, generateWatchdogCommentary, getEmbedding, classifyPromiseRelationship } from './src/lib/gemini';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration thresholds
const GEMINI_DELAY_MS = 6000; // 6 seconds between Gemini calls to respect 15 RPM limit safely
const TAVILY_MAX_RESULTS = 3;
const SIMILARITY_THRESHOLD = 0.82;

// Hard exit if missing keys
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing Supabase credentials in .env.local");
    process.exit(1);
}
if (!process.env.TAVILY_API_KEY) {
    console.error("❌ Missing TAVILY_API_KEY in .env.local");
    process.exit(1);
}
if (!process.env.CRAWL_QUERIES) {
    console.error("❌ Missing CRAWL_QUERIES in .env.local");
    process.exit(1);
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const queryList = process.env.CRAWL_QUERIES.split(',').map(q => q.trim()).filter(Boolean);

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to safely execute Gemini requests with retries for 429 Rate Limits
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T | null> {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await fn();
        } catch (error: any) {
            const errStr = String(error);
            if (error?.status === 429 || error?.response?.status === 429 || errStr.includes('429') ||
                error?.status === 503 || error?.response?.status === 503 || errStr.includes('503')) {
                attempt++;
                const waitTime = attempt * 15000; // 15s, 30s, 45s
                console.warn(`⏳ Gemini API busy (429/503). Retrying in ${waitTime / 1000} seconds... (Attempt ${attempt}/${maxRetries})`);
                await delay(waitTime);
            } else {
                throw error; // Throw other critical errors
            }
        }
    }
    console.error(`❌ Gemini failed after ${maxRetries} attempts due to rate limits.`);
    return null;
}

async function runStandaloneCrawler() {
    console.log("🚀 Starting Optimized Standalone Crawler...");
    console.log(`📋 Found ${queryList.length} queries to process.`);

    const startedAt = new Date().toISOString();
    let totalProcessed = 0;
    const errors: string[] = [];

    for (const query of queryList) {
        console.log(`\n🔍 Searching Tavily [Advanced] for: "${query}"`);

        try {
            // OPTIMIZATION 1: Use 'advanced' search depth, target 'news', restrict to last 2 days, and trusted domains
            const searchResponse = await tvly.search(query, {
                searchDepth: "advanced",
                topic: "news",
                days: 31, // Latest news strictly from the current day
                includeDomains: [
                    "kompas.com", "detik.com", "tempo.co",
                    "cnnindonesia.com", "cnbcindonesia.com",
                    "bisnis.com", "antaranews.com", "katadata.co.id", "kumparan.com", "tirto.id", "idntimes.com"
                ],
                includeRawContent: true as any, // We need the full article text because the summary snippet often omits the actual promise details
                maxResults: TAVILY_MAX_RESULTS,
            });

            console.log(`✅ Tavily found ${searchResponse.results.length} articles.`);

            for (const result of searchResponse.results) {
                const link = result.url;

                // OPTIMIZATION 2: Pre-filter by checking DB before doing ANY AI work
                const { data: existingUrl } = await supabase
                    .from('promises')
                    .select('id')
                    .eq('source_url', link)
                    .single();

                if (existingUrl) {
                    console.log(`⏩ Skipping (Already in DB): ${link}`);
                    continue; // Immediately move to next URL
                }

                console.log(`\n📄 Processing New Article: ${result.title}`);
                const contentText = result.content.slice(0, 5000); // Take first 5k chars of clean text

                // OPTIMIZATION 3: Respect Gemini limit cleanly
                console.log(`🤖 Requesting Summary from Gemini...`);
                await delay(GEMINI_DELAY_MS);
                let summary: any = await withRetry(async () => summarizeSource(`Title: ${result.title}\n\nContent: ${contentText}`));

                if (!summary) {
                    console.error(`❌ Gemini failed to summarize: ${link}`);
                    errors.push(`Summary failed for ${link}`);
                    continue;
                }

                // If Gemini returns an array of promises, take the first one
                if (Array.isArray(summary)) {
                    if (summary.length === 0) {
                        console.log(`    ⏩ Skipping: Gemini returned an empty array.`);
                        continue;
                    }
                    summary = summary[0];
                }

                // DEBUG: Print what Gemini extracted before skipping
                console.log(`\n    [DEBUG] Gemini Extracted:`, summary);

                if (summary.what === 'None' || summary.what.toLowerCase().includes('not specified') || summary.what.trim() === '') {
                    console.log(`    ⏩ Skipping: No concrete promise identified.`);
                    continue;
                }

                console.log(`🤖 Summarized. Requesting Embedding...`);
                await delay(GEMINI_DELAY_MS / 2); // Shorter delay for embedding formulation
                const embedding = await withRetry(async () => getEmbedding(summary.what));

                if (!embedding) {
                    console.error(`❌ Gemini failed to embed: ${link}`);
                    errors.push(`Embedding failed for ${link}`);
                    continue;
                }

                // Deduplication logic using pgvector
                console.log(`🔎 Checking database for semantic duplicates...`);
                const { data: matches, error: rpcError } = await supabase.rpc('match_promises', {
                    query_embedding: embedding,
                    match_threshold: SIMILARITY_THRESHOLD,
                    match_count: 1
                });

                if (rpcError) {
                    console.error(`❌ Supabase RPC Error:`, rpcError.message);
                    errors.push(`RPC Error (${link}): ${rpcError.message}`);
                    continue;
                }

                let finalCategory = 'new_promise';
                let parentPromiseId = null;

                if (matches && matches.length > 0) {
                    const topMatch = matches[0];
                    console.log(`🤝 Found semantic match in DB (${topMatch.id}). Asking Gemini to classify relationship...`);

                    await delay(GEMINI_DELAY_MS);
                    const relationship = await withRetry(async () => classifyPromiseRelationship(topMatch.quote, summary.what));

                    if (relationship === 'EXACT_DUPLICATE') {
                        console.log(`⏩ Skipping: Classified as EXACT_DUPLICATE of an existing promise.`);
                        continue;
                    } else if (relationship === 'PROGRESS_UPDATE') {
                        console.log(`📈 Classified as PROGRESS_UPDATE.`);
                        finalCategory = 'progress_update';
                        parentPromiseId = topMatch.id;
                    } else if (relationship === 'FULFILLMENT') {
                        console.log(`🎉 Classified as FULFILLMENT!`);
                        finalCategory = 'fulfillment';
                        parentPromiseId = topMatch.id;
                    }
                } else {
                    console.log(`✨ No semantic matches found. Brand new promise.`);
                }

                console.log(`🤖 Generating Watchdog Commentary...`);
                await delay(GEMINI_DELAY_MS);
                const watchdog_commentary = await withRetry(async () => generateWatchdogCommentary(summary.what, 0));

                const newPromise = {
                    quote: summary.what,
                    source_url: link,
                    source_domain: new URL(link).hostname,
                    date: new Date().toISOString(),
                    category: finalCategory,
                    parent_promise_id: parentPromiseId,
                    politician_name: summary.politician_name || 'Unknown',
                    politician_role: summary.politician_role || 'Unknown',
                    summary_what: summary.what,
                    summary_when: summary.when,
                    summary_budget: summary.budget,
                    watchdog_commentary: watchdog_commentary || null,
                    source_status: 'active',
                    embedding: embedding
                };

                console.log(`📥 Saving to database...`);
                const { error: insertError } = await supabase.from('promises').insert(newPromise);

                if (insertError) {
                    console.error(`❌ Failed to insert: ${insertError.message}`);
                    errors.push(`Insert failed (${link}): ${insertError.message}`);
                } else {
                    console.log(`✅ Successfully stored promise!`);
                    totalProcessed++;
                }
            }

        } catch (e: any) {
            console.error(`❌ Error processing query "${query}":`, e.message);
            errors.push(`Query Error (${query}): ${e.message}`);
        }
    }

    console.log(`\n📝 Logging run to crawl_runs table...`);
    await supabase.from('crawl_runs').insert({
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        status: errors.length > 0 ? (totalProcessed > 0 ? 'partial' : 'failed') : 'success',
        items_processed: totalProcessed,
        error_log: errors.join('\n')
    });

    console.log(`\n🎉 Crawler Finished! Processed ${totalProcessed} new items. Encountered ${errors.length} errors.`);
    if (errors.length > 0) console.log(errors);
    process.exit(0);
}

runStandaloneCrawler().catch(e => {
    console.error("💥 CRITICAL FATAL ERROR");
    console.error(e);
    process.exit(1);
});
