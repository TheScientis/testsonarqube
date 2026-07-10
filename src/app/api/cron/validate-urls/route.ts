import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const crawlSecret = process.env.CRAWL_CRON_SECRET!;
    if (authHeader !== `Bearer ${crawlSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: promises, error } = await supabase
        .from('promises')
        .select('id, source_url')
        .eq('source_status', 'active');

    if (error || !promises) {
        return NextResponse.json({ error: 'Failed to fetch promises' }, { status: 500 });
    }

    const updates = [];

    for (const promise of promises) {
        try {
            const response = await fetch(promise.source_url, {
                method: 'HEAD',
                headers: { 'User-Agent': 'WIWOKDETOK-Validator/1.0' }
            });

            if (response.status === 404 || response.status >= 500) {
                updates.push(
                    supabase.from('promises').update({ source_status: '404' }).eq('id', promise.id)
                );
            } else if (response.status === 403 || response.status === 401) {
                updates.push(
                    supabase.from('promises').update({ source_status: 'paywalled' }).eq('id', promise.id)
                );
            }
        } catch (e) {
            updates.push(
                supabase.from('promises').update({ source_status: '404' }).eq('id', promise.id)
            );
        }
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, checked: promises.length, updated: updates.length });
}
