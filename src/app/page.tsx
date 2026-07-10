"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  getDashboardStats,
  getDashboardFeed,
  getTrendingGaps,
  getFeaturedPromise,
  type DashboardStats,
  type TrendingGap,
  type FeaturedPromise,
} from "@/app/actions/dashboard";
import type { Promise } from "@/lib/types";
import { useTranslations } from "@/context/I18nContext";

export default function HomePage() {
  const { t } = useTranslations();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [feed, setFeed] = useState<Promise[]>([]);
  const [gaps, setGaps] = useState<TrendingGap[]>([]);
  const [featured, setFeatured] = useState<FeaturedPromise | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDashboardStats().then(setStats);
    getDashboardFeed().then(setFeed);
    getTrendingGaps().then(setGaps);
    getFeaturedPromise().then(setFeatured);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      window.location.href = `/promise-tracker?search=${encodeURIComponent(search.trim())}`;
    } else {
      window.location.href = `/promise-tracker`;
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-[1440px] mx-auto p-6 md:p-8 lg:p-10 flex flex-col gap-8">
        {/* Hero */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-4 max-w-4xl">
            <h1 className="text-[2rem] sm:text-5xl md:text-[57px] font-black tracking-normal text-slate-900 leading-tight md:leading-none">
              {t("hero.title_main")} <span className="text-primary">{t("hero.title_highlight")}</span>
            </h1>
            <p className="text-base md:text-xl text-slate-500 max-w-2xl">
              {t("hero.subtitle")}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-4 max-w-md w-full md:w-auto">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-blue-600 text-2xl">robot_2</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900">Bang Jaga Says:</h4>
              <p className="text-sm text-blue-700 mt-1">
                {stats && gaps.length > 0
                  ? `"Welcome to the Command Center! Our overall action gap is ${stats.actionGapPercent}%. Keep an eye on the ${gaps[0].label} sector."`
                  : `"Welcome to the Command Center. Loading latest data..."`}
              </p>
            </div>
          </div>
        </div>

        {/* Talk vs Walk banner */}
        {featured && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden rounded-xl border border-slate-200 min-h-[500px] md:h-[400px] shadow-sm md:grid-rows-1">
            <div className="relative bg-slate-50 flex flex-col justify-start md:justify-center min-h-[280px] md:min-h-0 min-w-0 overflow-hidden p-4 py-5 sm:p-[clamp(1.25rem,4vw,2.5rem)] md:p-[clamp(1.5rem,5vw,4rem)] border-b md:border-b-0 md:border-r border-slate-200 [container-type:size]">
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-6 md:left-6 flex items-center gap-2">
                <div className="bg-primary/10 text-primary p-1 sm:p-1.5 rounded-md">
                  <span className="material-symbols-outlined text-base sm:text-lg md:text-xl">format_quote</span>
                </div>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-500">The Talk</span>
              </div>
              <blockquote
                className="font-bold text-slate-800 leading-snug md:leading-tight mt-12 sm:mt-14 md:mt-0 break-words text-[clamp(1rem,4vw,1.375rem)] md:text-[clamp(1.25rem,2.5vw+0.75rem,1.75rem)] flex-1 min-h-0"
              >
                &quot;{featured.quote}&quot;
              </blockquote>
              <div className="mt-auto pt-3 sm:pt-4 md:pt-4 flex items-center gap-2 sm:gap-3 shrink-0 text-xs md:text-sm">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-slate-300 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-slate-500 text-xs md:text-sm">person</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate text-xs sm:text-sm">{featured.politician_name}</p>
                  <p className="text-slate-500 opacity-90 text-[0.8em] sm:text-[0.9em]">{featured.date}</p>
                </div>
              </div>
            </div>
            <div className="relative flex flex-col justify-end min-h-[220px] md:min-h-0 p-6 md:p-8 overflow-hidden transition-all duration-700 bg-slate-800">
              <img
                src={featured.image_url || "/assets/no-evidence.png"}
                alt="The Walk Background"
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700 grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/25 z-10" />
              <div className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 z-20">
                <div className="bg-danger/90 text-white p-1.5 rounded-md">
                  <span className="material-symbols-outlined text-lg md:text-xl">warning</span>
                </div>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-white">The Walk</span>
              </div>
              <div className="relative z-20 pt-14 md:pt-16 pb-1">
                <p className="text-danger font-bold text-sm md:text-lg mb-1 flex items-center gap-2 drop-shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-danger animate-pulse" /> Critical Alert
                </p>
                <h3 className="text-white text-lg md:text-2xl font-bold drop-shadow-md">{featured.alertTitle}</h3>
                <p className="text-slate-100 text-xs md:text-sm mt-2 max-w-md font-medium px-2 md:px-1 border-l-2 border-danger/50 italic leading-relaxed drop-shadow-md [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                  &quot;{featured.alertDesc}&quot;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Grid: Main + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative group w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                placeholder="Search Regions, Politicians, or specific Promises..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 right-2 hidden sm:flex items-center">
                <button type="submit" className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <span className="material-symbols-outlined">tune</span>
                </button>
              </div>
            </form>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {stats ? (
                <>
                  <StatCard label={t("stats.commitments_tracked")} value={stats.totalCommitments.toLocaleString()} change={stats.commitmentsChange} positive />
                  <StatCard label={t("stats.promises_kept")} value={stats.totalKept.toLocaleString()} change={stats.keptChange} positive />
                  <StatCard label={t("stats.action_gap")} value={`${stats.actionGapPercent}%`} change={stats.gapChange} positive={false} />
                  <StatCard label={t("stats.trust_score")} value={stats.trustScore} change={stats.trustChange} neutral />
                </>
              ) : (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-32 animate-pulse">
                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-4" />
                    <div className="h-6 bg-slate-100 rounded w-2/3" />
                  </div>
                ))
              )}
            </div>

            {/* Live Ledger Feed */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Live Ledger Feed</h3>
                <Link href="/promise-tracker" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                  View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {feed.length > 0 ? (
                  feed.map((p) => (
                    <FeedItem
                      key={p.id}
                      icon={p.category === "fulfillment" ? "check_circle" : p.walk_o_meter_score < 30 ? "warning" : "trending_up"}
                      color={p.category === "fulfillment" ? "text-primary" : p.walk_o_meter_score < 30 ? "text-danger" : "text-amber-500"}
                      bg={p.category === "fulfillment" ? "bg-primary/10" : p.walk_o_meter_score < 30 ? "bg-danger/10" : "bg-amber-50"}
                      title={p.politician_name}
                      desc={p.quote.length > 80 ? p.quote.substring(0, 80) + "..." : p.quote}
                      time={new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-30">inbox</span>
                    <p className="text-sm font-medium">No recent activity on the ledger.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Map Preview */}
            <div className="bg-slate-900 rounded-xl overflow-hidden shadow-sm flex flex-col group relative border border-slate-800">
              <div className="p-4 flex items-center justify-between z-10 relative bg-gradient-to-b from-slate-900 to-slate-900/0">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">public</span>
                  Walk-o-Meter Map
                </h3>
              </div>
              <div className="relative h-48 w-full bg-slate-800 flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/map-preview.png"
                  alt="Map Preview"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/10 transition-colors" />
                <Link href="/map" className="relative z-10 px-6 py-2.5 bg-white text-slate-900 rounded-full text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">explore</span>
                  Interactive Map
                </Link>
              </div>
            </div>

            {/* Trending Gaps */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-slate-900">Trending Gaps</h3>
                <span className="material-symbols-outlined text-slate-400">more_horiz</span>
              </div>
              <div className="space-y-6 flex-1">
                {gaps.map((g, i) => (
                  <GapBar
                    key={i}
                    label={g.label}
                    gap={g.gap}
                    percent={g.percent}
                    color={g.percent < 40 ? "bg-danger" : "bg-warning"}
                    textColor={g.percent < 40 ? "text-danger" : "text-warning"}
                    promised={g.promised}
                    actual={g.actual}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value, change, positive, neutral }: { label: string; value: string; change: string; positive?: boolean; neutral?: boolean }) {
  const changeColor = neutral ? "text-warning bg-warning/10" : positive ? "text-primary bg-primary/10" : "text-danger bg-danger/10";
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 hover:border-primary/50 transition-colors group">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider group-hover:text-primary transition-colors">{label}</p>
      <div>
        <p className="text-3xl font-black text-slate-900">{value}</p>
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${changeColor} px-1.5 py-0.5 rounded mt-1`}>
          {change}
        </span>
      </div>
    </div>
  );
}

function FeedItem({ icon, color, bg, title, desc, time }: { icon: string; color: string; bg: string; title: string; desc: string; time: string }) {
  return (
    <div className="p-4 hover:bg-slate-50 transition-colors flex gap-4 items-start cursor-pointer">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0 ${color}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">{time}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{desc}</p>
      </div>
    </div>
  );
}

function GapBar({ label, gap, percent, color, textColor, promised, actual }: { label: string; gap: string; percent: number; color: string; textColor: string; promised: string; actual: string }) {
  return (
    <div className="flex flex-col gap-2 group cursor-pointer">
      <div className="flex justify-between items-start gap-3 text-sm">
        <span className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors line-clamp-2 leading-snug flex-1">{label}</span>
        <span className={`font-bold ${textColor} px-2 py-0.5 rounded text-xs shrink-0 bg-slate-50`}>{gap}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${percent}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>Promised: {promised}</span>
        <span>Actual: {actual}</span>
      </div>
    </div>
  );
}
