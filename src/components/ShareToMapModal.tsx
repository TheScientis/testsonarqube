"use client";

import { useState, useEffect } from "react";
import { getRegions } from "@/lib/regions";
import { useModal } from "@/context/ModalContext";
import { getCurrentUser } from "@/lib/auth";
import { getUserPreferences } from "@/app/actions/preferences";

interface ShareToMapModalProps {
    step: number | null;
    onClose: () => void;
    location: { latitude: number; longitude: number } | null;
    locationLoading?: boolean;
    locationError?: boolean;
    onGetLocation: () => void;
    summary: string;
    setSummary: (val: string) => void;
    regionId: string;
    setRegionId: (val: string) => void;
    consent: boolean;
    setConsent: (val: boolean) => void;
    onFinalShare: () => void;
    isSharing: boolean;
}

export default function ShareToMapModal({
    step,
    onClose,
    location,
    locationLoading = false,
    locationError = false,
    onGetLocation,
    summary,
    setSummary,
    regionId,
    setRegionId,
    consent,
    setConsent,
    onFinalShare,
    isSharing
}: ShareToMapModalProps) {
    const { showConfirm } = useModal();
    const [defaultRegionFetched, setDefaultRegionFetched] = useState(false);

    useEffect(() => {
        if (step !== 1 || defaultRegionFetched) return;
        let cancelled = false;
        (async () => {
            const user = await getCurrentUser();
            if (cancelled || !user?.id) return;
            const prefs = await getUserPreferences(user.id);
            const first = prefs.regions_of_interest?.[0];
            if (!first) return;
            const regions = getRegions();
            const match = regions.find((r) => r.id === first || r.label === first);
            if (match) setRegionId(match.id);
            setDefaultRegionFetched(true);
        })();
        return () => { cancelled = true; };
    }, [step, defaultRegionFetched, setRegionId]);

    if (step === null) return null;

    const formReady = Boolean(location && summary.trim() && regionId && consent);

    const handleShareClick = async () => {
        if (!formReady) return;
        const ok = await showConfirm(
            "Share to map?",
            "Your complaint will be visible on the Walk-o-Meter map. Continue?"
        );
        if (ok) onFinalShare();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">map</span>
                        <h3 className="font-bold text-slate-800 text-sm">Share to Walk-o-Meter</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-3">
                    {step === 1 && (
                        <>
                            {!location && (
                                <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4 space-y-3">
                                    {locationLoading ? (
                                        <div className="flex items-center justify-center gap-2 text-slate-600 text-sm">
                                            <span className="material-symbols-outlined animate-spin text-xl">refresh</span>
                                            Getting location…
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm font-medium text-slate-800">
                                                {locationError
                                                    ? "Location was denied. Allow location access to share your complaint to the map."
                                                    : "Location required to share to the map."}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={onGetLocation}
                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-lg">location_on</span>
                                                {locationError ? "Allow location" : "Use my location"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            <p className="text-xs text-slate-600 bg-amber-50/80 border border-amber-100 rounded-lg px-3 py-2">
                                Your exact location is abstracted; only region is public. Photo (if any) will be visible.
                            </p>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Summary</label>
                                <textarea
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    placeholder="Masukkan ringkasan laporan..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Region</label>
                                <select
                                    value={regionId}
                                    onChange={(e) => setRegionId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                                    <option value="">Select region</option>
                                    {getRegions().map((r) => (
                                        <option key={r.id} value={r.id}>{r.label}</option>
                                    ))}
                                </select>
                            </div>

                            <label className="flex gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={consent}
                                    onChange={(e) => setConsent(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span className="text-xs text-slate-600 leading-relaxed select-none">
                                    I declare this report is accurate and agree to the terms.
                                </span>
                            </label>

                            <button
                                onClick={handleShareClick}
                                disabled={!formReady || isSharing}
                                className="w-full py-3 bg-primary hover:bg-primary/90 disabled:bg-slate-200 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isSharing ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                                        Sharing…
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">send</span>
                                        Share to map
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {step === 7 && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-2">Shared</h4>
                            <p className="text-sm text-slate-600 mb-4">Your report is now on the Walk-o-Meter map.</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-sm transition-all"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {step === 8 && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-4xl text-blue-600">cloud_off</span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-2">Saved offline</h4>
                            <p className="text-sm text-slate-600 mb-4">Your report will sync when you’re back online.</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-sm transition-all"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
