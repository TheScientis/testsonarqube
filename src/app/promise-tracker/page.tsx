"use client";

import Navbar from "@/components/Navbar";
import { useState, useEffect, useCallback } from "react";
import { getPromiseFeed, getPromiseFeedFacets, reactToPromise, getPendingPromises } from "@/app/actions/promises";
import type { Promise } from "@/lib/types";
import { getRegions, getRegionLabel } from "@/lib/regions";
import SubmitPromiseModal from "@/components/SubmitPromiseModal";
import VerificationModal from "@/components/VerificationModal";
import CommentThread from "@/components/CommentThread";
import { useAuthGuard } from "@/context/AuthGuardContext";
import { useModal } from "@/context/ModalContext";

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const CATEGORIES = [
    { value: "all", label: "All Promises" },
    { value: "new_promise", label: "New Promises" },
    { value: "progress_update", label: "Progress Updates" },
    { value: "fulfillment", label: "Fulfillment" },
];

export default function PromiseTrackerPage() {
    const [promises, setPromises] = useState<Promise[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [feedError, setFeedError] = useState("");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [category, setCategory] = useState("all");
    const [region, setRegion] = useState("all");
    const [year, setYear] = useState("all");
    const [status, setStatus] = useState("all");
    const [availableRegions, setAvailableRegions] = useState<string[]>([]);
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
    const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
    const [pendingUnfollowId, setPendingUnfollowId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [verifyingPromise, setVerifyingPromise] = useState<Promise | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingPromises, setPendingPromises] = useState<any[]>([]);
    const { requireAuth, isAuthenticated } = useAuthGuard();
    const { showAlert, showConfirm } = useModal();

    useEffect(() => {
        if (isAuthenticated) {
            void getPendingPromises().then(setPendingPromises);
        } else {
            setPendingPromises([]);
        }
    }, [isAuthenticated, isSubmitModalOpen]); // Refresh when modal closes too

    const loadPromises = useCallback(async (nextPage = 1, append = false) => {
        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await getPromiseFeed({
                search: debouncedSearch,
                category,
                region,
                year,
                status,
                page: nextPage,
            });

            setFeedError("");
            setPromises((prev) => (append ? [...prev, ...data.promises] : data.promises));
            setHasMore(data.has_more);
            setPage(nextPage);
        } catch {
            if (!append) {
                setPromises([]);
            }
            setFeedError("Couldn't load promises. Check your connection.");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [debouncedSearch, category, region, year, status]);

    useEffect(() => {
        void loadPromises(1);
    }, [loadPromises]);

    useEffect(() => {
        void (async () => {
            try {
                const facets = await getPromiseFeedFacets();
                setAvailableRegions(facets.regions);
                setAvailableYears(facets.years);
            } catch {
                setAvailableRegions([]);
                setAvailableYears([]);
            }
        })();
    }, []);

    useEffect(() => {
        if (!pendingUnfollowId) return;

        const timeout = window.setTimeout(() => {
            setPendingUnfollowId((current) => (current === pendingUnfollowId ? null : current));
        }, 2500);

        return () => window.clearTimeout(timeout);
    }, [pendingUnfollowId]);

    const handleLike = async (id: string) => {
        if (!requireAuth("like this promise")) return;
        const already = likedIds.has(id);
        const next = new Set(likedIds);
        if (already) next.delete(id); else next.add(id);
        setLikedIds(next);
        await reactToPromise(id, "like");
    };

    const handleFollow = async (id: string) => {
        if (!followedIds.has(id)) {
            if (!requireAuth("follow this promise")) return;
            const next = new Set(followedIds);
            next.add(id);
            setFollowedIds(next);
            setPendingUnfollowId(null);
            await reactToPromise(id, "follow");
            return;
        }

        if (pendingUnfollowId !== id) {
            setPendingUnfollowId(id);
            return;
        }

        const next = new Set(followedIds);
        next.delete(id);
        setFollowedIds(next);
        setPendingUnfollowId(null);
        await reactToPromise(id, "follow");
    };

    const handleFlag = async (id: string) => {
        if (!requireAuth("flag this promise")) return;

        const isCurrentlyFlagged = flaggedIds.has(id);

        if (!isCurrentlyFlagged) {
            const confirmed = await showConfirm(
                "Flag as BS",
                "Are you sure you want to flag this promise as BS? The community trust score will be affected and moderators will review it."
            );
            if (!confirmed) return;
        }

        const next = new Set(flaggedIds);
        if (isCurrentlyFlagged) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setFlaggedIds(next);
        await reactToPromise(id, "flag");
        await showAlert(
            "Success",
            isCurrentlyFlagged ? "Flag removed." : "Promise flagged successfully!"
        );
    };

    const handleShare = async (p: Promise) => {
        const url = `${window.location.origin}/promise-tracker?search=${encodeURIComponent(p.politician_name)}`;
        const text = `Check out this promise by ${p.politician_name} on WIWOKDETOK: "${p.quote}"`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `WIWOKDETOK Promise Tracker: ${p.politician_name}`,
                    text: text,
                    url: url,
                });
            } catch (err) {
                console.error("Error sharing:", err);
            }
        } else {
            navigator.clipboard.writeText(`${text}\n${url}`);
            await showAlert("Link Copied", "Link copied to clipboard!");
        }
    };

    const scoreColor = (score: number) => {
        if (score >= 60) return "text-primary";
        if (score >= 30) return "text-amber-500";
        return "text-danger";
    };

    const scoreBg = (score: number) => {
        if (score >= 60) return "bg-primary/10";
        if (score >= 30) return "bg-amber-50";
        return "bg-danger/10";
    };

    const categoryBadge = (cat: string) => {
        switch (cat) {
            case "new_promise":
                return { label: "New Promise", color: "bg-blue-100 text-blue-700" };
            case "progress_update":
                return { label: "Progress", color: "bg-amber-100 text-amber-700" };
            case "fulfillment":
                return { label: "Fulfillment", color: "bg-primary/10 text-primary" };
            default:
                return { label: cat, color: "bg-slate-100 text-slate-600" };
        }
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

    const formatRegionLabelFallback = (value: string) =>
        value
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");

    const facetRegionSet = new Set(availableRegions);
    const regionOptionsFromCanonical = getRegions()
        .filter((r) => facetRegionSet.has(r.id))
        .map((r) => ({ value: r.id, label: getRegionLabel(r.id) ?? r.label }));
    const regionOptionsUnknown = availableRegions
        .filter((id) => getRegionLabel(id) === undefined)
        .map((id) => ({ value: id, label: formatRegionLabelFallback(id) }));
    const regionOptions = [...regionOptionsFromCanonical, ...regionOptionsUnknown];

    const handleLoadMore = async () => {
        if (!hasMore || loadingMore) return;
        await loadPromises(page + 1, true);
    };

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">The Talk Ledger</h1>
                    {process.env.NODE_ENV !== "development" && (
                        <button
                            data-testid="promise-tracker-submit-new"
                            onClick={() => {
                                if (requireAuth("submit a new promise")) {
                                    setIsSubmitModalOpen(true);
                                }
                            }}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">add_circle</span>
                            Submit New Promise
                        </button>
                    )}
                </div>
                {/* Search */}
                <div className="relative group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                        search
                    </span>
                    <input
                        data-testid="promise-tracker-search-input"
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Regions, Politicians, or Promises..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>

                <div
                    data-testid="promise-tracker-filters"
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
                >
                    <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Region</span>
                        <select
                            data-testid="promise-tracker-region-select"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="all">All regions</option>
                            {regionOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Year</span>
                        <select
                            data-testid="promise-tracker-year-select"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="all">All years</option>
                            {availableYears.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>
                    {/* Status filter - commented out
                    <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</span>
                        <select
                            data-testid="promise-tracker-status-select"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="all">All statuses</option>
                            <option value="active">Active</option>
                            <option value="404">Source unavailable</option>
                            <option value="paywalled">Paywalled</option>
                        </select>
                    </label>
                    */}
                </div>

                <SubmitPromiseModal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} />

                {verifyingPromise && (
                    <VerificationModal
                        promiseId={verifyingPromise.id}
                        onClose={() => setVerifyingPromise(null)}
                        onSuccess={() => void loadPromises(1)}
                    />
                )}

                {/* Category Tabs */}
                <div data-testid="promise-tracker-category-tabs" className="flex items-center gap-2 overflow-x-auto pb-1">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            data-testid={`promise-tracker-category-${cat.value}`}
                            onClick={() => setCategory(cat.value)}
                            className={`min-h-[44px] px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${category === cat.value
                                ? "bg-primary text-white shadow-sm"
                                : "bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                data-testid="promise-tracker-skeleton"
                                className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse"
                            >
                                <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                                <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                                <div className="h-3 bg-slate-100 rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && feedError && (
                    <div className="rounded-2xl border border-danger/20 bg-danger/5 px-5 py-6 text-center">
                        <p className="text-sm font-medium text-danger">{feedError}</p>
                        <button
                            onClick={() => void loadPromises(1)}
                            className="mt-3 text-sm font-bold text-danger hover:underline"
                        >
                            Retry
                        </button>
                    </div>
                )}
                {!loading && !feedError && promises.length === 0 && (
                    <div className="text-center py-16">
                        <span className="material-symbols-outlined text-5xl text-slate-300">search_off</span>
                        <p data-testid="promise-tracker-empty-message" className="text-sm text-slate-500 mt-3">
                            {region !== "all" && debouncedSearch === "" && category === "all" && year === "all" && status === "all"
                                ? "No promises tracked in this region yet."
                                : "No promises found matching your filters."}
                        </p>
                        <button
                            data-testid="promise-tracker-clear-filters"
                            onClick={() => {
                                setSearch("");
                                setCategory("all");
                                setRegion("all");
                                setYear("all");
                                setStatus("all");
                            }}
                            className="mt-3 text-sm text-primary font-bold hover:underline"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* Pending Submissions */}
                {!loading && pendingPromises.length > 0 && (
                    <div className="space-y-3 mb-2">
                        {pendingPromises.map((p) => (
                            <div key={p.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                                <span className="material-symbols-outlined text-amber-500 mt-0.5">pending_actions</span>
                                <div className="flex-1">
                                    <h4 className="font-bold text-amber-900 text-sm">Under review &mdash; we&apos;ll notify you when it&apos;s live.</h4>
                                    <p className="text-amber-800 text-xs mt-1 font-medium italic border-l-2 border-amber-300 pl-2 py-0.5">&ldquo;{p.quote}&rdquo;</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Promise Cards */}
                {!loading && (
                    <div className="space-y-4">
                        {promises.map((p) => {
                            const badge = categoryBadge(p.category);
                            const isExpanded = expandedId === p.id;
                            return (
                                <article
                                    key={p.id}
                                    id={`promise-${p.id}`}
                                    data-testid="promise-tracker-card"
                                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                                >
                                    <div className="p-5 md:p-6">
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-white text-sm">
                                                        person
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 data-testid="promise-card-politician-name" className="text-sm font-bold text-slate-900">
                                                        {p.politician_name}
                                                    </h3>
                                                    <p className="text-xs text-slate-400">
                                                        {p.politician_role} · {formatDate(p.date)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    data-testid="promise-card-category-badge"
                                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${badge.color}`}
                                                >
                                                    {badge.label}
                                                </span>
                                                {p.source_status === "404" && (
                                                    <span data-testid="promise-card-source-unavailable" className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-1 rounded-full">
                                                        Source Unavailable
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Quote */}
                                        <blockquote data-testid="promise-card-quote" className="text-base text-slate-700 leading-relaxed mb-4 border-l-4 border-primary pl-4 italic">
                                            &ldquo;{p.quote}&rdquo;
                                        </blockquote>

                                        {/* Walk-o-Meter score */}
                                        <div className="flex justify-between items-start lg:items-center flex-col lg:flex-row mb-4 gap-3">
                                            <div
                                                data-testid="promise-card-walk-o-meter"
                                                className={`flex-1 w-full flex items-center gap-3 rounded-lg px-4 py-3 ${scoreBg(
                                                    p.walk_o_meter_score
                                                )}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-lg text-slate-500">speed</span>
                                                    <span className="hidden md:inline text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                        Walk-o-Meter
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-500 ${p.walk_o_meter_score >= 60
                                                                ? "bg-primary"
                                                                : p.walk_o_meter_score >= 30
                                                                    ? "bg-amber-400"
                                                                    : "bg-danger"
                                                                }`}
                                                            style={{ width: `${p.walk_o_meter_score}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span data-testid="promise-card-score" className={`text-lg font-black ${scoreColor(p.walk_o_meter_score)}`}>
                                                    {p.walk_o_meter_score}%
                                                </span>
                                                <span data-testid="promise-card-vote-count" className="text-xs text-slate-400">
                                                    ({p.walk_o_meter_count} votes)
                                                </span>
                                            </div>

                                            <button
                                                data-testid="promise-card-verify"
                                                onClick={() => {
                                                    if (requireAuth("verify this promise")) {
                                                        setVerifyingPromise(p);
                                                    }
                                                }}
                                                className="px-4 py-3 lg:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg whitespace-nowrap flex items-center gap-2 justify-center w-full lg:w-auto transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                                                Verify Evidence
                                            </button>
                                        </div>

                                        {/* AI Summary (expandable) */}
                                        {p.summary_what && (
                                            <button
                                                data-testid="promise-card-ai-summary-toggle"
                                                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                                                className="w-full text-left mb-3"
                                            >
                                                <div className="flex items-center gap-2 text-primary text-xs font-bold mb-1">
                                                    <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                                    AI Summary
                                                    <span className="material-symbols-outlined text-xs ml-auto">
                                                        {isExpanded ? "expand_less" : "expand_more"}
                                                    </span>
                                                </div>
                                                {isExpanded && (
                                                    <div data-testid="promise-card-ai-summary-details" className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-100 mt-1">
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                                                WHAT
                                                            </span>
                                                            <p className="text-sm text-slate-600">{p.summary_what}</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                                                                WHEN
                                                            </span>
                                                            <p className="text-sm text-slate-600">{p.summary_when}</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                                                                BUDGET
                                                            </span>
                                                            <p className="text-sm text-slate-600">{p.summary_budget}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        )}

                                        {/* Watchdog Commentary */}
                                        {p.watchdog_commentary && (
                                            <div data-testid="promise-card-watchdog-commentary" className="flex gap-3 bg-slate-800 text-white rounded-lg p-4 mb-4">
                                                <div className="w-8 h-8 rounded-full bg-orange-400/20 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-orange-300 text-sm">
                                                        pets
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300 mb-1">
                                                        Bang Jaga says
                                                    </p>
                                                    <p className="text-sm text-slate-300 leading-relaxed">
                                                        {p.watchdog_commentary}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Source */}
                                        <div className={`flex items-center gap-1 text-xs mb-4 ${p.source_status === "404" ? "text-danger" : "text-slate-400"}`}>
                                            <span className="material-symbols-outlined text-[12px]">{p.source_status === "404" ? "link_off" : "link"}</span>
                                            Source:{" "}
                                            {p.source_status === "404" ? (
                                                <span className="flex items-center gap-1">
                                                    <span className="line-through opacity-70" title={p.source_url}>{p.source_domain}</span>
                                                    <span className="font-medium bg-danger/10 px-1.5 py-0.5 rounded text-[9px]">Original source no longer available</span>
                                                </span>
                                            ) : (
                                                <a
                                                    data-testid="promise-card-source-link"
                                                    href={p.source_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    {p.source_domain}
                                                </a>
                                            )}
                                        </div>
                                        {p.source_status === "paywalled" && (
                                            <p className="mb-4 text-[11px] font-medium text-amber-600">
                                                Source behind paywall — see AI summary below.
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions bar: like, share, comment, follow, flag in one row */}
                                    <CommentThread
                                        promiseId={p.id}
                                        commentCount={p.comment_count}
                                        renderTrigger={(trigger) => (
                                            <div className="border-t border-slate-100 px-4 py-1 flex items-center justify-between bg-slate-50/50 min-h-[52px]">
                                                <div className="flex items-center gap-0.5">
                                                    <button
                                                        data-testid="promise-card-like"
                                                        onClick={() => handleLike(p.id)}
                                                        className={`flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium transition-all ${likedIds.has(p.id)
                                                            ? "text-primary bg-primary/10"
                                                            : "text-slate-500 hover:text-primary hover:bg-slate-100"
                                                            }`}
                                                    >
                                                        <span className="material-symbols-outlined text-base">
                                                            {likedIds.has(p.id) ? "thumb_up" : "thumb_up"}
                                                        </span>
                                                        {p.like_count + (likedIds.has(p.id) ? 1 : 0)}
                                                    </button>
                                                    {/* Share button commented out for now
                                                    <button
                                                        data-testid="promise-card-share"
                                                        onClick={() => handleShare(p)}
                                                        className="flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-primary hover:bg-slate-100 transition-all"
                                                        title="Share this promise"
                                                    >
                                                        <span className="material-symbols-outlined text-base">share</span>
                                                    </button>
                                                    */}
                                                    {trigger}
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    <div className="relative group">
                                                        <button
                                                            data-testid="promise-card-follow"
                                                            onClick={() => handleFollow(p.id)}
                                                            className={`flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium transition-all ${followedIds.has(p.id)
                                                                ? "text-primary bg-primary/10"
                                                                : "text-slate-500 hover:text-primary hover:bg-slate-100"
                                                                }`}
                                                        >
                                                            <span className="material-symbols-outlined text-base">
                                                                {followedIds.has(p.id) ? "notifications_active" : "notifications"}
                                                            </span>
                                                            <span className="hidden sm:inline">{followedIds.has(p.id) ? "Following" : "Follow"}</span>
                                                        </button>
                                                        {pendingUnfollowId === p.id && (
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded shadow-lg whitespace-nowrap pointer-events-none z-10 animate-in fade-in zoom-in-95 duration-200">
                                                                Tap again to unfollow
                                                                <div className="absolute w-2 h-2 bg-slate-900 rotate-45 -bottom-1 left-1/2 -translate-x-1/2" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        data-testid="promise-card-flag"
                                                        onClick={() => handleFlag(p.id)}
                                                        title={flaggedIds.has(p.id) ? "Remove flag" : "Flag this promise"}
                                                        className={`flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium transition-all ${flaggedIds.has(p.id) ? "text-danger bg-danger/10" : "text-slate-500 hover:text-danger hover:bg-danger/5"}`}>
                                                        <span className="material-symbols-outlined text-base">flag</span>
                                                        <span className="hidden sm:inline">{flaggedIds.has(p.id) ? "Flagged" : "Flag as BS"}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    />
                                </article>
                            );
                        })}
                    </div>
                )}
                {!loading && promises.length > 0 && (
                    <div className="flex flex-col items-center gap-3 pt-2">
                        {hasMore ? (
                            <button
                                data-testid="promise-tracker-load-more"
                                onClick={() => void handleLoadMore()}
                                disabled={loadingMore}
                                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loadingMore && <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />}
                                {loadingMore ? "Loading..." : "Load More"}
                            </button>
                        ) : (
                            <p className="text-sm text-slate-500">
                                You&apos;ve seen all promises in this view.
                            </p>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}
