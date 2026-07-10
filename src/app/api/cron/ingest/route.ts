import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET!;
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { article_text: string; source_url: string; source_domain: string; region_id?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: 'Request body must be JSON with fields: article_text, source_url, source_domain' },
            { status: 400 }
        );
    }

    if (!body.article_text || !body.source_url || !body.source_domain) {
        return NextResponse.json(
            { error: 'Missing required fields: article_text, source_url, source_domain' },
            { status: 400 }
        );
    }

    try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY!;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        Extract political promise details from the following news article.
        Return ONLY a JSON object with strictly these keys:
        - quote: the extracted quote or summary of the promise
        - politician_name: name of the politician (or null if not identifiable)
        - politician_role: role/title of the politician (or null if not identifiable)
        - summary_what: what is promised
        - summary_when: timeline of the promise
        - summary_budget: budget mentioned (if any, or "Not specified")
        - region_id: Indonesian region slug (e.g. "dki-jakarta", "west-java") if identifiable, or null

        Article:
        ${body.article_text}
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const responseText = result.response.text();

        let extracted;
        try {
            extracted = JSON.parse(responseText.trim());
        } catch {
            console.error("Failed to parse Gemini output:", responseText);
            return NextResponse.json({ error: "Invalid format received from AI." }, { status: 502 });
        }

        if (!extracted.quote) {
            return NextResponse.json({ error: "AI could not extract a promise from the article." }, { status: 422 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const newPromise = {
            region_id: extracted.region_id || body.region_id || null,
            quote: extracted.quote,
            source_url: body.source_url,
            source_domain: body.source_domain,
            source_status: "active",
            date: new Date().toISOString(),
            category: "new_promise",
            walk_o_meter_score: 0,
            walk_o_meter_count: 0,
            summary_what: extracted.summary_what || null,
            summary_when: extracted.summary_when || null,
            summary_budget: extracted.summary_budget || null,
            politician_name: extracted.politician_name || null,
            politician_role: extracted.politician_role || null,
            like_count: 0,
            comment_count: 0
        };

        const { error } = await supabase.from('promises').insert(newPromise);
        if (error) {
            console.error("Failed to insert promise:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Promise successfully ingested.",
            data: newPromise
        });

    } catch (e: any) {
        console.error("Cron ingest error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
