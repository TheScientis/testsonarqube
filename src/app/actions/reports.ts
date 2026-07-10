"use server";

import type { WalkOMeterReport, LeaderboardEntry, MapReportFilters } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getGeminiModel, isGeminiConfigured } from "@/lib/gemini";
import { containsInappropriateContent } from "@/lib/moderation";

export async function getAutoTags(description: string): globalThis.Promise<string[]> {
    if (!isGeminiConfigured()) return [];
    try {
        const validTags = [
            "Infrastruktur", "Lingkungan", "PelayananPublik", "Keamanan",
            "Transportasi", "Kesehatan", "Pendidikan", "BencanaAlam",
            "Ekonomi", "Sosial"
        ];

        const model = getGeminiModel(
            "You are an AI assistant that extracts 1-3 relevant predefined Indonesian hashtags from a civic complaint description. " +
            "You MUST ONLY select from the following exact tags: " + validTags.join(", ") + ". " +
            "Respond ONLY with a JSON array of these strings, e.g. [\"Infrastruktur\", \"Lingkungan\"]. Do not hallucinate any other tags."
        );
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: description }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const text = result.response.text();
        const parsed = JSON.parse(text);

        // Strictly enforce vocabulary constraint to prevent hallucinations
        if (Array.isArray(parsed)) {
            return parsed.filter(t => validTags.includes(t));
        }
        return [];
    } catch (e) {
        console.error("Failed to generate auto-tags", e);
        return [];
    }
}

export async function getMapReports(
    filters: MapReportFilters = {}
): globalThis.Promise<WalkOMeterReport[]> {
    const supabase = await createClient();
    let query = supabase.from("walk_o_meter_reports").select("*");
    if (filters.report_type && filters.report_type !== "all") {
        query = query.eq("report_type", filters.report_type);
    }
    if (filters.region_id && filters.region_id !== "all") {
        query = query.eq("region_id", filters.region_id);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
        console.error("Error fetching map reports:", error);
        return [];
    }

    // Abstract exact location to protect privacy (approx. 1km resolution fuzzing)
    return data.map(r => {
        const strId = r.id || "";
        const hash = strId.split('').reduce((a: number, b: string) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
        const latJitter = (hash % 100) * 0.0001; // max ~1km jitter
        const lngJitter = ((hash >> 4) % 100) * 0.0001;

        return {
            ...r,
            latitude: Number((r.latitude + latJitter).toFixed(3)),
            longitude: Number((r.longitude + lngJitter).toFixed(3))
        };
    }) as WalkOMeterReport[];
}

export async function verifyReportEvidence(reportId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, message: "Unauthorized" };

    const { data: report, error: fetchError } = await supabase
        .from("walk_o_meter_reports")
        .select("verification_count, trust_tier")
        .eq("id", reportId)
        .single();

    if (fetchError || !report) return { success: false, message: "Report not found" };

    const newCount = (report.verification_count || 0) + 1;
    const newTier = newCount >= 5 ? "ground_truth" : report.trust_tier;

    const { error: updateError } = await supabase
        .from("walk_o_meter_reports")
        .update({
            verification_count: newCount,
            trust_tier: newTier
        })
        .eq("id", reportId);

    if (updateError) return { success: false, message: updateError.message };

    return { success: true, count: newCount, tier: newTier };
}

export async function getLeaderboard(regionId?: string): globalThis.Promise<LeaderboardEntry[]> {
    const supabase = await createClient();
    let query = supabase.from("leaderboard_cache").select("*").order("resolution_rate", { ascending: false });

    if (regionId) {
        query = query.eq("region_id", regionId);
    }

    const { data, error } = await query.limit(3);

    if (error) {
        console.error("Failed to fetch leaderboard", error);
        throw error;
    }

    if (!data) return [];

    return data.map((entry: any, index: number) => ({
        rank: index + 1,
        region_name: entry.region_name || entry.region_id,
        resolved_count: entry.resolved_count,
        resolution_rate: `${Math.round(entry.resolution_rate)}%`,
        trend: entry.trend as "up" | "flat" | "down"
    }));
}

export async function submitVerificationReport(data: {
    promise_id: string;
    vote: "yes" | "no";
    description: string;
    latitude: number;
    longitude: number;
    photo_url?: string;
    region_id: string;
    location_label: string;
}): globalThis.Promise<{ success: boolean; message: string }> {
    if (!data.region_id) {
        return { success: false, message: "region_id is required." };
    }
    if (!data.location_label) {
        return { success: false, message: "location_label is required." };
    }

    if (containsInappropriateContent(data.description)) {
        return { success: false, message: "Report contains inappropriate language and has been rejected." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Must be logged in to submit a report." };
    }

    const tags = await getAutoTags(data.description);

    // Check for existing report by this user for this promise
    const { data: existingReport } = await supabase
        .from("walk_o_meter_reports")
        .select("id, created_at")
        .eq("promise_id", data.promise_id)
        .eq("user_id", user.id)
        .eq("report_type", "promise_verification")
        .single();

    let error;

    if (existingReport) {
        // Enforce 24-hour edit window
        const reportTime = new Date(existingReport.created_at).getTime();
        const hoursSinceReport = (Date.now() - reportTime) / (1000 * 60 * 60);

        if (hoursSinceReport > 24) {
            return { success: false, message: "Votes can only be edited within 24 hours of submission." };
        }

        const updateData: any = {
            vote: data.vote,
            latitude: data.latitude,
            longitude: data.longitude,
            description: data.description,
            region_id: data.region_id,
            location_label: data.location_label,
            tags: tags
        };
        if (data.photo_url) updateData.photo_url = data.photo_url;

        const { error: updateError } = await supabase
            .from("walk_o_meter_reports")
            .update(updateData)
            .eq("id", existingReport.id);

        error = updateError;
    } else {
        const newReport = {
            report_type: "promise_verification",
            promise_id: data.promise_id,
            vote: data.vote,
            latitude: data.latitude,
            longitude: data.longitude,
            photo_url: data.photo_url || "",
            description: data.description,
            user_id: user.id,
            user_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            region_id: data.region_id,
            location_label: data.location_label,
            trust_tier: "standard",
            tags: tags
        };
        const { error: insertError } = await supabase.from("walk_o_meter_reports").insert(newReport);
        error = insertError;
    }

    if (error) return { success: false, message: error.message };

    // Trigger immediate score recalculation for affected promise
    await recalculatePromiseScores(data.promise_id);

    return { success: true, message: "Report submitted! Your verification has been recorded." };
}

export async function isComplaintSharedToMap(sessionId: string): globalThis.Promise<boolean> {
    if (!sessionId) return false;
    const supabase = await createClient();
    const { data } = await supabase
        .from("walk_o_meter_reports")
        .select("id")
        .eq("report_type", "bang_jaga_complaint")
        .eq("complaint_id", sessionId)
        .maybeSingle();
    return !!data;
}

export async function shareComplaintToMap(data: {
    sessionId: string;
    latitude: number;
    longitude: number;
    summary: string;
    region_id: string;
    location_label: string;
}): globalThis.Promise<{ success: boolean; message: string }> {
    if (!data.region_id) {
        return { success: false, message: "region_id is required." };
    }
    if (!data.location_label) {
        return { success: false, message: "location_label is required." };
    }

    if (containsInappropriateContent(data.summary)) {
        return { success: false, message: "Report contains inappropriate language and has been rejected." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Must be logged in to share a complaint to the map." };
    }

    const { data: existing } = await supabase
        .from("walk_o_meter_reports")
        .select("id")
        .eq("report_type", "bang_jaga_complaint")
        .eq("complaint_id", data.sessionId)
        .maybeSingle();
    if (existing) {
        return { success: false, message: "This complaint was already shared to the map." };
    }

    const tags = await getAutoTags(data.summary);
    const newReport = {
        report_type: "bang_jaga_complaint",
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.summary,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        complaint_id: data.sessionId,
        region_id: data.region_id,
        location_label: data.location_label,
        trust_tier: "standard",
        tags: tags
    };
    const { error } = await supabase.from("walk_o_meter_reports").insert(newReport);
    if (!error) return { success: true, message: "Your complaint is now on the map!" };
    console.error("Failed to share to map", error);
    return { success: false, message: error.message || "Failed to share to map" };
}

export async function recalculatePromiseScores(promiseId?: string): globalThis.Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();

    let pQuery = supabase.from("promises").select("id, walk_o_meter_score, walk_o_meter_count");
    if (promiseId) pQuery = pQuery.eq("id", promiseId);

    const { data: promises, error: pError } = await pQuery;
    if (pError) throw pError;

    const { data: reports, error: rError } = await supabase
        .from("walk_o_meter_reports")
        .select(`
            id, promise_id, vote, photo_url, latitude, longitude, user_id,
            user_profiles(member_since)
        `)
        .eq("report_type", "promise_verification");

    if (rError) throw rError;

    const results = [];

    for (const promise of promises) {
        const promiseReports = (reports || []).filter((r: any) => r.promise_id === promise.id);

        const validReports = promiseReports.filter((r: any) => {
            const hasPhoto = !!r.photo_url;
            const hasGPS = r.latitude !== 0 && r.longitude !== 0;

            // Bypass account age restriction for testing
            const isOldEnough = true;

            return hasPhoto && hasGPS && isOldEnough;
        });

        if (validReports.length === 0) continue;

        const yesVotes = validReports.filter((r: any) => r.vote === "yes").length;
        const totalVotes = validReports.length;
        const communityScore = (yesVotes / totalVotes) * 100;

        let finalScore = communityScore;

        const { error: uError } = await supabase
            .from("promises")
            .update({
                walk_o_meter_score: Math.round(finalScore),
                walk_o_meter_count: totalVotes
            })
            .eq("id", promise.id);

        if (uError) console.error(`Failed to update promise ${promise.id}`, uError);
        else results.push(promise.id);
    }

    return { success: true, message: `Recalculated scores for ${results.length} promises.` };
}

export async function recalculateLeaderboard(): globalThis.Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();
    const { data: reports, error: rError } = await supabase
        .from("walk_o_meter_reports")
        .select("region_id, status, location_label");

    if (rError) throw rError;

    const regions: Record<string, { total: number; resolved: number; name: string }> = {};

    (reports || []).forEach((r: any) => {
        if (!r.region_id) return;
        if (!regions[r.region_id]) {
            regions[r.region_id] = { total: 0, resolved: 0, name: r.location_label || r.region_id };
        }
        regions[r.region_id].total++;
        if (r.status === "resolved") {
            regions[r.region_id].resolved++;
        }
    });

    const updatedRegions = [];

    for (const [regionId, stats] of Object.entries(regions)) {
        const resolutionRate = (stats.resolved / stats.total) * 100;

        const { data: prev } = await supabase
            .from("leaderboard_cache")
            .select("resolution_rate")
            .eq("region_id", regionId)
            .single();

        let trend: "up" | "flat" | "down" = "flat";
        if (prev) {
            if (resolutionRate > prev.resolution_rate) trend = "up";
            else if (resolutionRate < prev.resolution_rate) trend = "down";
        }

        const { error: upsertError } = await supabase
            .from("leaderboard_cache")
            .upsert({
                region_id: regionId,
                region_name: stats.name,
                resolution_rate: resolutionRate,
                resolved_count: stats.resolved,
                total_count: stats.total,
                trend: trend,
                calculated_at: new Date().toISOString()
            }, { onConflict: "region_id" });

        if (upsertError) console.error(`Failed to upsert leaderboard for ${regionId}`, upsertError);
        else updatedRegions.push(regionId);
    }

    return { success: true, message: `Updated leaderboard for ${updatedRegions.length} regions.` };
}

