"use server";

import { supabase } from "@/lib/supabase";
import type { Promise as PromiseType } from "@/lib/types";

export interface DashboardStats {
  totalCommitments: number;
  totalKept: number;
  actionGapPercent: number;
  trustScore: string;
  commitmentsChange: string;
  keptChange: string;
  gapChange: string;
  trustChange: string;
}

export interface TrendingGap {
  label: string;
  gap: string;
  percent: number;
  promised: string;
  actual: string;
}

export interface FeaturedPromise {
  quote: string;
  politician_name: string;
  politician_role: string;
  date: string;
  alertTitle: string;
  alertDesc: string;
  image_url: string | null;
}

export async function getDashboardStats(): globalThis.Promise<DashboardStats> {
  const { count: total } = await supabase
    .from("promises")
    .select("*", { count: "exact", head: true });

  const { count: kept } = await supabase
    .from("promises")
    .select("*", { count: "exact", head: true })
    .eq("category", "fulfillment");

  const commitments = total ?? 0;
  const keptCount = kept ?? 0;
  const gapPercent =
    commitments > 0
      ? Math.round(((commitments - keptCount) / commitments) * 100)
      : 0;

  let trustLevel = "Low";
  if (gapPercent < 30) trustLevel = "High";
  else if (gapPercent < 50) trustLevel = "Medium";

  return {
    totalCommitments: commitments,
    totalKept: keptCount,
    actionGapPercent: gapPercent,
    trustScore: commitments === 0 ? "N/A" : trustLevel,
    commitmentsChange: "Real-time",
    keptChange: "Real-time",
    gapChange: "Live",
    trustChange: "Live",
  };
}

export async function getDashboardFeed(): globalThis.Promise<PromiseType[]> {
  const { data, error } = await supabase
    .from("promises")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("Failed to get dashboard feed", error);
    throw error;
  }

  return (data ?? []) as PromiseType[];
}

export async function getTrendingGaps(): globalThis.Promise<TrendingGap[]> {
  const { data, error } = await supabase
    .from("promises")
    .select("quote, walk_o_meter_score, walk_o_meter_count, politician_name")
    .order("walk_o_meter_score", { ascending: true })
    .limit(6);

  if (error) {
    console.error("Failed to get trending gaps", error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  return data.map((p) => ({
    label: p.quote.length > 30 ? p.quote.substring(0, 30) + "..." : p.quote,
    gap: `-${100 - p.walk_o_meter_score}%`,
    percent: p.walk_o_meter_score,
    promised: "100%",
    actual: `${p.walk_o_meter_score}%`,
  }));
}

export async function getFeaturedPromise(): globalThis.Promise<FeaturedPromise | null> {
  const { data, error } = await supabase
    .from("promises")
    .select("*")
    .order("like_count", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    quote: data.quote,
    politician_name: data.politician_name,
    politician_role: data.politician_role || "Politician",
    date: new Date(data.date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    alertTitle: `Walk-o-Meter: ${data.walk_o_meter_score}%`,
    alertDesc: data.watchdog_commentary || "No commentary available.",
    image_url: data.image_url,
  };
}
