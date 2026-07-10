"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getMapReports, getLeaderboard } from "@/app/actions/reports";
import type { WalkOMeterReport, LeaderboardEntry } from "@/lib/types";
import VerificationModal from "@/components/VerificationModal";
import { useAuthGuard } from "@/context/AuthGuardContext";
import { useDataSaver } from "@/context/DataSaverContext";
import { useModal } from "@/context/ModalContext";
import { verifyReportEvidence } from "@/app/actions/reports";

const FILTER_TYPES = [
    { value: "all", label: "All Reports" },
    { value: "promise_verification", label: "Verifications" },
    { value: "bang_jaga_complaint", label: "Complaints" },
];

const SORT_OPTIONS = [
    { value: "recent", label: "Most Recent" },
    { value: "verified", label: "Most Verified" },
];

function getOptimizedImageUrl(url: string | null | undefined, dataSaver: boolean) {
    if (!url) return "/assets/no-evidence.png";
    if (!dataSaver) return url;

    if (url.includes("/storage/v1/object/public/")) {
        return url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + "?width=400&quality=30";
    }
    return url;
}

export default function FeedPage() {
    const [reports, setReports] = useState<WalkOMeterReport[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasNewPosts, setHasNewPosts] = useState(false);
    const [initialLoadTime, setInitialLoadTime] = useState<number>(Date.now());
    const [filterType, setFilterType] = useState("all");
    const [sortBy, setSortBy] = useState("recent");
    const [showFilter, setShowFilter] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [verifyingReport, setVerifyingReport] = useState<WalkOMeterReport | null>(null);
    const [verifiedIds, setVerifiedIds] = useState<Record<string, "yes" | "no">>({});
    const { requireAuth, isAuthenticated } = useAuthGuard();
    const { dataSaver } = useDataSaver();
    const { showAlert } = useModal();

    const [provinces, setProvinces] = useState<{ name: string, value: string }[]>([]);
    const [regencies, setRegencies] = useState<{ name: string, value: string }[]>([]);
    const [selectedProvince, setSelectedProvince] = useState("all");
    const [selectedRegency, setSelectedRegency] = useState("all");
    const [showMobileRegion, setShowMobileRegion] = useState(false);

    // Initialize state from URL params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const prov = params.get("province");
        if (prov) {
            setSelectedProvince(prov);
            // Also open the filter panel if a region is pre-selected
            setShowFilter(true);
        }
    }, []);

    // Map old province names (from provinces GeoJSON) → regency GeoJSON province names
    const normalizeProvinceName = (raw: string) => {
        const map: Record<string, string> = {
            "DI. ACEH": "Aceh",
            "SUMATERA UTARA": "Sumatera Utara",
            "SUMATERA BARAT": "Sumatera Barat",
            "RIAU": "Riau",
            "JAMBI": "Jambi",
            "SUMATERA SELATAN": "Sumatera Selatan",
            "BENGKULU": "Bengkulu",
            "LAMPUNG": "Lampung",
            "DKI JAKARTA": "DKI Jakarta",
            "JAWA BARAT": "Jawa Barat",
            "JAWA TENGAH": "Jawa Tengah",
            "DI. YOGYAKARTA": "Daerah Istimewa Yogyakarta",
            "JAWA TIMUR": "Jawa Timur",
            "BALI": "Bali",
            "NUSA TENGGARA BARAT": "Nusa Tenggara Barat",
            "NUSA TENGGARA TIMUR": "Nusa Tenggara Timur",
            "KALIMANTAN BARAT": "Kalimantan Barat",
            "KALIMANTAN TENGAH": "Kalimantan Tengah",
            "KALIMANTAN SELATAN": "Kalimantan Selatan",
            "KALIMANTAN TIMUR": "Kalimantan Timur",
            "SULAWESI UTARA": "Sulawesi Utara",
            "SULAWESI TENGAH": "Sulawesi Tengah",
            "SULAWESI SELATAN": "Sulawesi Selatan",
            "SULAWESI TENGGARA": "Sulawesi Tenggara",
            "MALUKU": "Maluku",
            "IRIAN JAYA TIMUR": "Papua",
            "MALUKU UTARA": "Maluku Utara",
            "BANTEN": "Banten",
            "GORONTALO": "Gorontalo",
            "KEPULAUAN BANGKA BELITUNG": "Kepulauan Bangka Belitung",
            "KEPULAUAN RIAU": "Kepulauan Riau",
            "SULAWESI BARAT": "Sulawesi Barat",
            "PAPUA BARAT": "Papua Barat",
            "KALIMANTAN UTARA": "Kalimantan Utara",
            "PAPUA SELATAN": "Papua Selatan",
            "PAPUA TENGAH": "Papua Tengah",
            "PAPUA PEGUNUNGAN": "Papua Pegunungan",
            "PAPUA BARAT DAYA": "Papua Barat Daya",
        };
        return map[raw.toUpperCase()] || raw;
    };

    const formatProvinceName = (raw: string) => {
        return raw
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(" ");
    };

    const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    useEffect(() => {
        fetch("/geo/indonesia-provinces.json")
            .then(res => res.json())
            .then(data => {
                const provs = new Set<string>();
                if (data.features) {
                    data.features.forEach((f: any) => {
                        if (f.properties?.Propinsi) provs.add(f.properties.Propinsi);
                    });
                }
                const formatted = Array.from(provs).map(p => ({
                    name: formatProvinceName(p),
                    value: slugify(formatProvinceName(p))
                })).sort((a, b) => a.name.localeCompare(b.name));
                setProvinces(formatted);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedProvince === "all") {
            setRegencies([]);
            return;
        }

        // Find raw province name corresponding to the selected slug
        const provMap = provinces.find(p => p.value === selectedProvince)?.name || "";
        const normalized = normalizeProvinceName(provMap.toUpperCase());

        fetch("/geo/indonesia-regencies.json")
            .then(res => res.json())
            .then(data => {
                const regs = new Set<string>();
                if (data.features) {
                    data.features.forEach((f: any) => {
                        if (f.properties?.WADMPR === normalized && f.properties?.WADMKK) {
                            regs.add(f.properties.WADMKK);
                        }
                    });
                }
                const formatted = Array.from(regs).map(r => ({
                    name: formatProvinceName(r),
                    value: slugify(formatProvinceName(r))
                })).sort((a, b) => a.name.localeCompare(b.name));
                setRegencies(formatted);
            })
            .catch(console.error);
    }, [selectedProvince, provinces]);
    useEffect(() => {
        setLoading(true);
        const regionSlug = selectedRegency !== "all" ? selectedRegency : (selectedProvince !== "all" ? selectedProvince : undefined);
        Promise.all([
            getMapReports({ report_type: filterType, region_id: regionSlug }),
            getLeaderboard(regionSlug),
        ]).then(([r, l]) => {
            let sorted = [...r];
            if (sortBy === "verified") {
                sorted.sort((a, b) => b.verification_count - a.verification_count);
            }
            setReports(sorted);
            setLeaderboard(l);
            setLoading(false);
            setHasNewPosts(false);
            setInitialLoadTime(Date.now());
        });
    }, [filterType, sortBy, selectedProvince, selectedRegency]);

    // Polling for new posts
    useEffect(() => {
        if (dataSaver) return; // Pause polling in Data Saver mode

        const regionSlug = selectedRegency !== "all" ? selectedRegency : (selectedProvince !== "all" ? selectedProvince : undefined);
        const interval = setInterval(async () => {
            try {
                const fresh = await getMapReports({ report_type: filterType, region_id: regionSlug });
                if (fresh.length > 0) {
                    const newestCurrent = reports.length > 0 ? Math.max(...reports.map(r => new Date(r.created_at).getTime())) : 0;
                    const newestFetched = Math.max(...fresh.map(r => new Date(r.created_at).getTime()));

                    if (newestFetched > newestCurrent && newestFetched > initialLoadTime) {
                        setHasNewPosts(true);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 15000); // Check every 15s

        return () => clearInterval(interval);
    }, [filterType, selectedProvince, selectedRegency, reports, initialLoadTime, dataSaver]);

    const handleOpenVerification = async (report: WalkOMeterReport) => {
        if (!requireAuth("verify this report")) return;

        // Disable locally instantly for UX
        const optimisticVote = "yes";
        setVerifiedIds(prev => ({ ...prev, [report.id]: optimisticVote }));

        const res = await verifyReportEvidence(report.id);
        if (res.success) {
            setReports(prev => prev.map(r => r.id === report.id ? {
                ...r,
                verification_count: res.count,
                trust_tier: res.tier
            } : r));
        } else {
            // Revert optimistic
            const copy = { ...verifiedIds };
            delete copy[report.id];
            setVerifiedIds(copy);
        }
    };

    const timeAgo = (d: string) => {
        const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 w-full max-w-[1200px] mx-auto p-6 md:p-8 flex gap-6">
                {/* Main feed */}
                <div className="flex-1 min-w-0">
                    <div className="mb-6">
                        <h1 className="text-xl font-bold text-slate-900">Evidence Feed</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Community reports and verifications in your area.
                        </p>
                    </div>

                    {/* Filters - Scrollable on mobile */}
                    <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 no-scrollbar">
                        <div className="flex items-center gap-2 min-w-max">
                            <div className="relative">
                                <button
                                    onClick={() => { setShowFilter(!showFilter); setShowSort(false); }}
                                    className={`flex items-center gap-1.5 min-h-[44px] px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${filterType !== "all"
                                        ? "border-primary bg-primary/5 text-primary"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-sm">tune</span>
                                    {FILTER_TYPES.find((f) => f.value === filterType)?.label}
                                </button>
                                {showFilter && (
                                    <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 min-w-[180px]">
                                        {FILTER_TYPES.map((f) => (
                                            <button
                                                key={f.value}
                                                onClick={() => { setFilterType(f.value); setShowFilter(false); }}
                                                className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${filterType === f.value
                                                    ? "text-primary bg-primary/5 font-bold"
                                                    : "text-slate-600 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => { setShowSort(!showSort); setShowFilter(false); }}
                                    className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:border-primary hover:text-primary transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">sort</span>
                                    {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
                                </button>
                                {showSort && (
                                    <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 min-w-[180px]">
                                        {SORT_OPTIONS.map((s) => (
                                            <button
                                                key={s.value}
                                                onClick={() => { setSortBy(s.value); setShowSort(false); }}
                                                className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === s.value
                                                    ? "text-primary bg-primary/5 font-bold"
                                                    : "text-slate-600 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Mobile region filter toggle — only shown below lg */}
                            <button
                                onClick={() => setShowMobileRegion(!showMobileRegion)}
                                className={`lg:hidden flex items-center gap-1.5 min-h-[44px] px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${selectedProvince !== "all"
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
                                    }`}
                            >
                                <span className="material-symbols-outlined text-sm">filter_alt</span>
                                Region
                                {selectedProvince !== "all" && (
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                )}
                            </button>

                            <Link
                                href="/map"
                                className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:border-primary hover:text-primary transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">map</span> Map View
                            </Link>
                            {isAuthenticated && (
                                <Link
                                    href="/chat?action=report"
                                    className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 bg-primary text-white shadow-sm rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">add_circle</span> Submit Report
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Mobile region filter panel */}
                    {showMobileRegion && (
                        <div className="lg:hidden bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Province</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    value={selectedProvince}
                                    onChange={(e) => {
                                        setSelectedProvince(e.target.value);
                                        setSelectedRegency("all");
                                    }}
                                >
                                    <option value="all">All Provinces</option>
                                    {provinces.map(p => (
                                        <option key={p.value} value={p.value}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">City/Regency</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:bg-slate-50"
                                    value={selectedRegency}
                                    onChange={(e) => setSelectedRegency(e.target.value)}
                                    disabled={selectedProvince === "all"}
                                >
                                    <option value="all">All Regencies</option>
                                    {regencies.map(r => (
                                        <option key={r.value} value={r.value}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Data Saver Banner */}
                    {dataSaver && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-4">
                            <span className="material-symbols-outlined text-amber-600 text-lg">data_saver_on</span>
                            <p className="text-xs font-medium">Data Saver is ON — images compressed, live updates paused.</p>
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-9 h-9 rounded-full bg-slate-200" />
                                        <div>
                                            <div className="h-3 bg-slate-200 rounded w-24 mb-1" />
                                            <div className="h-2 bg-slate-100 rounded w-16" />
                                        </div>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && reports.length === 0 && (
                        <div className="text-center py-16">
                            <span className="material-symbols-outlined text-5xl text-slate-300">search_off</span>
                            <p className="text-sm text-slate-500 mt-3">No reports found for this region and filter.</p>
                            <button
                                onClick={() => setFilterType("all")}
                                className="mt-3 text-sm text-primary font-bold hover:underline"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}

                    {/* Feed cards */}
                    {!loading && (
                        <div className="space-y-4">
                            {hasNewPosts && (
                                <button
                                    onClick={() => {
                                        setLoading(true);
                                        const regionSlug = selectedRegency !== "all" ? selectedRegency : (selectedProvince !== "all" ? selectedProvince : undefined);
                                        getMapReports({ report_type: filterType, region_id: regionSlug }).then((r) => {
                                            let sorted = [...r];
                                            if (sortBy === "verified") sorted.sort((a, b) => b.verification_count - a.verification_count);
                                            setReports(sorted);
                                            setHasNewPosts(false);
                                            setLoading(false);
                                            setInitialLoadTime(Date.now());
                                            window.scrollTo({ top: 0, behavior: "smooth" });
                                        });
                                    }}
                                    className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold py-3 rounded-xl transition-colors shadow-sm animate-in fade-in slide-in-from-top-4"
                                >
                                    ↑ New posts available. Click to refresh.
                                </button>
                            )}
                            {reports.map((report) => {
                                const isComplaint = report.report_type === "bang_jaga_complaint";
                                const userVote = verifiedIds[report.id];
                                return (
                                    <article
                                        key={report.id}
                                        className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                                            report.trust_tier === "ground_truth"
                                                ? "border-2 border-emerald-300 ring-1 ring-emerald-100"
                                                : isComplaint
                                                    ? "border border-amber-200"
                                                    : "border border-slate-200"
                                        }`}
                                    >
                                        <div className="p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-slate-500 text-sm">
                                                            person
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-bold text-slate-900">
                                                                {report.user_name}
                                                            </span>
                                                            <span
                                                                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isComplaint
                                                                    ? "text-danger bg-danger/10"
                                                                    : "text-primary bg-primary/10"
                                                                    }`}
                                                            >
                                                                {isComplaint ? "Complaint" : "Verification"}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400">
                                                            {timeAgo(report.created_at)}
                                                            {report.location_label && ` · ${report.location_label}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                {report.trust_tier === "ground_truth" && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20 bg-primary/5 px-2.5 py-1 rounded-full shrink-0">
                                                        <span className="material-symbols-outlined text-[12px]">verified</span>
                                                        Ground Truth
                                                    </span>
                                                )}
                                                {report.status !== "pending" && (
                                                    <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shrink-0 ${report.status === "resolved" ? "text-green-600 bg-green-50 border-green-200" : report.status === "accepted" ? "text-blue-600 bg-blue-50 border-blue-200" : "text-slate-600 bg-slate-50 border-slate-200"}`}>
                                                        {report.status === "resolved" ? <span className="material-symbols-outlined text-[12px]">check_circle</span> : null}
                                                        {report.status}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-slate-700 mb-3">
                                                {report.description}{" "}
                                                {report.tags.map((tag) => (
                                                    <span key={tag} className="text-primary font-semibold">
                                                        #{tag}{" "}
                                                    </span>
                                                ))}
                                            </p>

                                            {/* Image placeholder / Data Saver */}
                                            {report.report_type === "promise_verification" &&
                                                report.trust_tier === "ground_truth" && (
                                                    <div className="w-full h-48 bg-slate-100/80 rounded-xl flex items-center justify-center mb-3 overflow-hidden border border-slate-200">
                                                        <img
                                                            src={getOptimizedImageUrl(report.photo_url, dataSaver)}
                                                            alt="Proof"
                                                            className={`w-full h-full object-cover ${dataSaver ? "opacity-90 blur-[1px]" : ""}`}
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}

                                            {/* Promise link */}
                                            {report.promise_id ? (
                                                <Link
                                                    href={`/promise-tracker#promise-${report.promise_id}`}
                                                    className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline mb-2"
                                                >
                                                    <span className="material-symbols-outlined text-[12px]">link</span>
                                                    View Original Promise
                                                </Link>
                                            ) : report.report_type === "promise_verification" ? (
                                                <p className="text-xs text-slate-400 italic mb-2">Original promise no longer available.</p>
                                            ) : null}
                                        </div>

                                        {/* Verify bar (only for verifications) */}
                                        {report.report_type === "promise_verification" && (
                                            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-700">
                                                        Verify this evidence?
                                                    </p>
                                                    <p className="text-[10px] text-primary">
                                                        {report.verification_count} people have verified this.
                                                    </p>
                                                </div>
                                                {userVote ? (
                                                    <span
                                                        className="text-sm font-bold text-primary flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">how_to_reg</span> Verified
                                                    </span>
                                                ) : isAuthenticated ? (
                                                    <div className="flex flex-wrap gap-2 justify-end">
                                                        <button
                                                            onClick={() => handleOpenVerification(report)}
                                                            className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">verified</span>
                                                            Verify
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                await getMapReports({ report_type: "bang_jaga_complaint", region_id: report.id }); // Fake loading
                                                                await showAlert("Shared to Map", "Report has been successfully shared to the map (Simulation).");
                                                            }}
                                                            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">map</span>
                                                            Share to Map
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right sidebar */}
                <aside className="w-72 hidden lg:flex flex-col gap-6 shrink-0">
                    {/* Region Filter */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-lg">filter_alt</span>
                            Region Filter
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Province</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    value={selectedProvince}
                                    onChange={(e) => {
                                        setSelectedProvince(e.target.value);
                                        setSelectedRegency("all");
                                    }}
                                >
                                    <option value="all">All Provinces</option>
                                    {provinces.map(p => (
                                        <option key={p.value} value={p.value}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">City/Regency</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:bg-slate-50"
                                    value={selectedRegency}
                                    onChange={(e) => setSelectedRegency(e.target.value)}
                                    disabled={selectedProvince === "all"}
                                >
                                    <option value="all">All Regencies</option>
                                    {regencies.map(r => (
                                        <option key={r.value} value={r.value}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Regional Leaderboard */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary text-lg">leaderboard</span>
                            Regional Leaderboard
                        </h3>
                        <div className="space-y-3">
                            {leaderboard.map((entry) => {
                                const trendIcon = entry.trend === "up" ? "arrow_upward" : "arrow_forward";
                                const trendColor = entry.trend === "up" ? "text-primary" : "text-slate-400";
                                const rankColors = [
                                    "bg-primary/10 text-primary",
                                    "bg-blue-50 text-blue-500",
                                    "bg-slate-100 text-slate-500",
                                ];
                                return (
                                    <div
                                        key={entry.rank}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rankColors[entry.rank - 1]
                                                }`}
                                        >
                                            {entry.rank}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-slate-900">{entry.region_name}</p>
                                            <p className="text-[10px] text-primary font-medium">
                                                {entry.resolved_count} Resolved
                                            </p>
                                        </div>
                                        <div className={`flex items-center gap-0.5 text-sm font-bold ${trendColor}`}>
                                            <span className="material-symbols-outlined text-xs">{trendIcon}</span>
                                            {entry.resolution_rate}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>
            </main>
            {/* FAB */}
            <Link
                href="/chat"
                className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary-dark rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
            >
                <span className="material-symbols-outlined text-white text-2xl">smart_toy</span>
            </Link>
        </div>
    );
}
