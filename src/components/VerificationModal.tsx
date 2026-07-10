"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { submitVerificationReport } from "@/app/actions/reports";
import { useModal } from "@/context/ModalContext";
import { getRegions } from "@/lib/regions";
import { getCurrentUser } from "@/lib/auth";
import { getUserPreferences } from "@/app/actions/preferences";

interface VerificationModalProps {
    promiseId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function VerificationModal({
    promiseId,
    onClose,
    onSuccess
}: VerificationModalProps) {
    const [photo, setPhoto] = useState<File | null>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [description, setDescription] = useState("");
    const [regionId, setRegionId] = useState("");
    const [locationLabel, setLocationLabel] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showAlert, showConfirm } = useModal();

    useEffect(() => {
        if (navigator.geolocation) {
            handleGetLocation();
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const user = await getCurrentUser();
            if (cancelled || !user?.id) return;
            const prefs = await getUserPreferences(user.id);
            const first = prefs.default_region_id ?? prefs.regions_of_interest?.[0];
            if (!first) return;
            const regions = getRegions();
            const match = regions.find((r) => r.id === first || r.label === first);
            if (match) setRegionId(match.id);
        })();
        return () => { cancelled = true; };
    }, []);

    const handleGetLocation = async () => {
        if (!navigator.geolocation) {
            await showAlert("Geolocation Unavailable", "Geolocation is not supported by your browser");
            return;
        }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                if (!locationLabel.trim()) setLocationLabel("Current location");
                setLocationLoading(false);
            },
            async (err) => {
                console.error(err);
                setLocationLoading(false);
                await showAlert("Location Denied", "Allow GPS to verify you're at the site.");
            }
        );
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setPhoto(e.target.files[0]);
    };

    const formReady = Boolean(location && regionId && locationLabel.trim());

    const handleSubmitWithVote = async (vote: "yes" | "no") => {
        if (!formReady) return;
        const confirmed = await showConfirm(
            vote === "yes" ? "Submit as Yes?" : "Submit as No?",
            vote === "yes"
                ? "Your ground check will be recorded as \"Yes, it is happening.\" Continue?"
                : "Your ground check will be recorded as \"No, it's not happening.\" Continue?"
        );
        if (!confirmed) return;

        setIsSubmitting(true);
        try {
            let photoUrl = "";
            if (photo) {
                const fileName = `${Date.now()}-verify-${promiseId}.jpg`;
                const { data, error: uploadError } = await supabase.storage
                    .from("verification_photos")
                    .upload(fileName, photo);
                if (!uploadError && data) {
                    const { data: { publicUrl } } = supabase.storage.from("verification_photos").getPublicUrl(fileName);
                    photoUrl = publicUrl;
                }
            }

            const res = await submitVerificationReport({
                promise_id: promiseId,
                vote,
                description: description.trim() || (vote === "yes" ? "Verified on the ground." : "Verified not happening."),
                latitude: location.latitude,
                longitude: location.longitude,
                photo_url: photoUrl,
                region_id: regionId,
                location_label: locationLabel.trim()
            });

            if (res.success) {
                onSuccess();
                onClose();
            } else {
                await showAlert("Verification Failed", res.message);
            }
        } catch (e) {
            console.error("Submission failed", e);
            await showAlert("Error", "Failed to submit verification.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div data-testid="verification-modal" className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">verified</span>
                        <h3 className="font-bold text-slate-800 text-sm">Ground check</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-3">
                    {/* Location is fetched in background on mount (no UI) */}

                    {/* Photo (optional) - full width at top */}
                    <div className="w-full">
                        <p className="text-xs font-semibold text-slate-600 mb-1.5">Photo (optional)</p>
                        {photo ? (
                            <div className="relative w-full aspect-video rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                                <img src={URL.createObjectURL(photo)} alt="Preview" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setPhoto(null)} className="absolute top-2 right-2 w-8 h-8 bg-slate-800/80 text-white rounded-full flex items-center justify-center hover:bg-slate-800">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                        ) : (
                            <>
                                <label
                                    htmlFor="verification-photo-input"
                                    className="w-full flex items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 hover:border-primary hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                                    Add photo
                                </label>
                                <input
                                    id="verification-photo-input"
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                            </>
                        )}
                    </div>

                    {/* Region + label */}
                    <div className="grid grid-cols-1 gap-2">
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
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Place name</label>
                            <input
                                type="text"
                                value={locationLabel}
                                onChange={(e) => setLocationLabel(e.target.value)}
                                placeholder="e.g. Jembatan Jatinegara"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* Optional note */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Note (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What do you see?"
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        />
                    </div>

                    {/* Vote = submit buttons with confirmation (bottom) */}
                    <div className="pt-2">
                        <p className="text-xs font-semibold text-slate-600 mb-1.5">Is this happening?</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleSubmitWithVote("yes")}
                                disabled={!formReady || isSubmitting}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-all border-2 border-primary bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                Yes, it is
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSubmitWithVote("no")}
                                disabled={!formReady || isSubmitting}
                                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-all border-2 border-danger bg-danger text-white hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-lg">cancel</span>
                                No, it&apos;s not
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
