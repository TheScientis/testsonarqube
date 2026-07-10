import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tavily } from '@tavily/core';
import { summarizeSource, generateWatchdogCommentary, getEmbedding, classifyPromiseRelationship } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Set max duration for Vercel just in case
export const revalidate = 0;

function getCrawlQueries(): string[] {
    const envQueries = process.env.CRAWL_QUERIES;
    if (!envQueries) {
        throw new Error(
            "Missing required environment variable: CRAWL_QUERIES. " +
            "Set it as a comma-separated list of search queries (e.g. 'janji gubernur,rumah sakit baru')."
        );
    }
    return envQueries.split(',').map(s => s.trim()).filter(Boolean);
}

export async function GET(request: Request) {
    console.log("👉 /api/cron/crawl hit by manual crawler script.");

    // Next.js static caching opt-out trick
    const reqHeaders = new Headers(request.headers);
    const authHeader = reqHeaders.get('authorization');

    const crawlSecret = process.env.CRAWL_CRON_SECRET!;
    if (authHeader !== `Bearer ${crawlSecret}`) {
        console.warn("Unauthorized attempt to trigger crawler.");
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
    const crawlQueries = getCrawlQueries();
    const processedItems: string[] = [];
    const errors: string[] = [];
    const startedAt = new Date().toISOString();

    for (const query of crawlQueries) {
        try {
            console.log(`Searching Tavily for: ${query}`);
            const searchResponse = await tvly.search(query, {
                searchDepth: "basic",
                includeRawContent: true as any,
                maxResults: 3,
            });

            // If the cache gave us literally the exact same results with no uniqueness, they might get skipped.
            // Let's print out what we found to the console.
            console.log(`Found ${searchResponse.results.length} URLs from Tavily.`);

            for (const result of searchResponse.results) {
                const link = result.url;

                // Skip if we already processed this URL
                const { data: existing } = await supabase.from('promises').select('id').eq('source_url', link).single();
                if (existing) {
                    console.log(`Skipping ${link}: Already in database.`);
                    continue;
                }

                const title = result.title || null;
                const content = (result.rawContent || result.content).slice(0, 5000);

                console.log(`Sending to Gemini for summary: ${link}`);
                // Small sleep to ease rate limiting without timing out the serverless function
                await new Promise(resolve => setTimeout(resolve, 1500));

                const summary = await summarizeSource(`Title: ${title}\n\nContent: ${content}`);
                if (!summary) {
                    console.error(`Gemini failed to summarize: ${link}`);
                    continue;
                }

                console.log(`Generating embedding for summary: ${link}`);
                // Small sleep for embedding
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Deduplication logic using pgvector
                const embedding = await getEmbedding(summary.what);
                if (!embedding) {
                    console.error(`Gemini failed to generate embedding: ${link}`);
                    errors.push(`Failed to generate embedding for ${link}`);
                    continue; // Skip if we can't embed it (though we could fallback to insert, let's be strict for dedupe)
                }

                const { data: matches, error: rpcError } = await supabase.rpc('match_promises', {
                    query_embedding: embedding,
                    match_threshold: 0.82,
                    match_count: 1
                });

                if (rpcError) {
                    console.error("RPC Error:", rpcError);
                    errors.push(`RPC Error for ${link}: ${rpcError.message}`);
                }

                let finalCategory = 'new_promise';
                let parentPromiseId = null;

                if (matches && matches.length > 0) {
                    const topMatch = matches[0];
                    const relationship = await classifyPromiseRelationship(topMatch.quote, summary.what);

                    if (relationship === 'EXACT_DUPLICATE') {
                        console.log(`Skipping ${link}: EXACT_DUPLICATE of ${topMatch.id}`);
                        continue; // Skip insertion
                    } else if (relationship === 'PROGRESS_UPDATE') {
                        finalCategory = 'progress_update';
                        parentPromiseId = topMatch.id;
                    } else if (relationship === 'FULFILLMENT') {
                        finalCategory = 'fulfillment';
                        parentPromiseId = topMatch.id;
                    }
                }

                const watchdog_commentary = await generateWatchdogCommentary(summary.what, 0);

                const newPromise = {
                    quote: summary.what,
                    source_url: link,
                    source_domain: new URL(link).hostname,
                    date: new Date().toISOString(),
                    category: finalCategory,
                    parent_promise_id: parentPromiseId,
                    politician_name: null,
                    politician_role: null,
                    summary_what: summary.what,
                    summary_when: summary.when,
                    summary_budget: summary.budget,
                    watchdog_commentary: watchdog_commentary || null,
                    source_status: 'active',
                    embedding: embedding
                };

                const { error: insertError } = await supabase.from('promises').insert(newPromise);
                if (insertError) {
                    errors.push(`Failed to insert ${link}: ${insertError.message}`);
                } else {
                    processedItems.push(link);
                }
            }
        } catch (e: any) {
            errors.push(`Failed to process query '${query}': ${e.message}`);
        }
    }

    await supabase.from('crawl_runs').insert({
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        status: errors.length > 0 ? (processedItems.length > 0 ? 'partial' : 'failed') : 'success',
        items_processed: processedItems.length,
        error_log: errors.join('\n')
    });

    return NextResponse.json({ success: true, processed: processedItems.length, errors });
}
