import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCriticalGapEmail, sendPolicyUpdateEmail, sendWeeklyDigestEmail } from "@/lib/emails";
import { sendWebPushByUserId } from "@/lib/push";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    const cronSecret = process.env.CRON_SECRET!;
    if (secret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: preferences, error: prefError } = await adminSupabase
            .from('user_preferences')
            .select('user_id, regions_of_interest, notify_critical_gaps, notify_policy_updates, notify_weekly_digest')
            .or('notify_critical_gaps.eq.true,notify_policy_updates.eq.true,notify_weekly_digest.eq.true');

        if (prefError || !preferences) {
            throw new Error(`Failed to fetch preferences: ${prefError?.message}`);
        }

        if (preferences.length === 0) {
            return NextResponse.json({ message: 'No users opted in for any notifications.' });
        }

        const results = [];

        for (const pref of preferences) {
            if (!pref.regions_of_interest || pref.regions_of_interest.length === 0) continue;

            const regionSlugs = pref.regions_of_interest.map((r: string) => r.toLowerCase().replace(/[^a-z0-9]+/g, "-"));

            const { data: userData } = await adminSupabase.auth.admin.getUserById(pref.user_id);
            if (!userData?.user?.email) {
                console.warn(`Could not resolve email for user ${pref.user_id}, skipping.`);
                continue;
            }
            const userEmail = userData.user.email;

            const userResults = [];

            if (pref.notify_critical_gaps) {
                const { data: badPromises } = await adminSupabase
                    .from('promises')
                    .select('quote')
                    .in('region_id', regionSlugs)
                    .lt('walk_o_meter_score', 70)
                    .order('walk_o_meter_score', { ascending: true })
                    .limit(1);

                if (badPromises && badPromises.length > 0) {
                    const res = await sendCriticalGapEmail(userEmail, pref.regions_of_interest, badPromises[0].quote);
                    await sendWebPushByUserId(pref.user_id, {
                        title: "Critical Promise Gap Detected",
                        body: `A promise in your region has a dangerously low score: "${badPromises[0].quote}"`,
                        url: "/promise-tracker"
                    });
                    userResults.push({ type: 'critical_gap', ...res });
                }
            }

            if (pref.notify_policy_updates) {
                const { data: recentPolicies } = await adminSupabase
                    .from('promises')
                    .select('quote')
                    .in('region_id', regionSlugs)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (recentPolicies && recentPolicies.length > 0) {
                    const res = await sendPolicyUpdateEmail(userEmail, pref.regions_of_interest, recentPolicies[0].quote);
                    await sendWebPushByUserId(pref.user_id, {
                        title: "New Policy Update",
                        body: `A new promise was tracked in your region: "${recentPolicies[0].quote}"`,
                        url: "/promise-tracker"
                    });
                    userResults.push({ type: 'policy_update', ...res });
                }
            }

            if (pref.notify_weekly_digest) {
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

                const { count: verifiedProgress } = await adminSupabase
                    .from('promises')
                    .select('*', { count: 'exact', head: true })
                    .in('region_id', regionSlugs)
                    .eq('category', 'progress_update')
                    .gte('updated_at', oneWeekAgo);

                const { count: newPolicies } = await adminSupabase
                    .from('promises')
                    .select('*', { count: 'exact', head: true })
                    .in('region_id', regionSlugs)
                    .eq('category', 'fulfillment')
                    .gte('created_at', oneWeekAgo);

                const { count: communityReports } = await adminSupabase
                    .from('walk_o_meter_reports')
                    .select('*', { count: 'exact', head: true })
                    .in('region_id', regionSlugs)
                    .gte('created_at', oneWeekAgo);

                const res = await sendWeeklyDigestEmail(userEmail, pref.regions_of_interest, {
                    verifiedProgress: verifiedProgress ?? 0,
                    newPolicies: newPolicies ?? 0,
                    communityReports: communityReports ?? 0,
                });
                await sendWebPushByUserId(pref.user_id, {
                    title: "Your Weekly Digest",
                    body: `This week: ${verifiedProgress} progress updates, ${newPolicies} new promises, ${communityReports} community reports.`,
                    url: "/dashboard" // Or appropriate link
                });
                userResults.push({ type: 'weekly_digest', ...res });
            }

            results.push({ userId: pref.user_id, email: userEmail, triggers: userResults });
        }

        return NextResponse.json({
            message: `Processed ${preferences.length} users.`,
            results
        });

    } catch (error) {
        console.error("Cron Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
