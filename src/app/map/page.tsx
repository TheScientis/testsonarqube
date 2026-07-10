"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { getMapReports } from "@/app/actions/reports";
import type { WalkOMeterReport } from "@/lib/types";
import { useDataSaver } from "@/context/DataSaverContext";
import { useAuthGuard } from "@/context/AuthGuardContext";

// Indonesia bounds (SW corner to NE corner)
const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
    [-11.5, 94.5], // Southwest
    [6.5, 141.5],  // Northeast
];

const INDONESIA_CENTER: [number, number] = [-2.5, 118];

// Map old province names (from provinces GeoJSON) → regency GeoJSON province names
function normalizeProvinceName(raw: string): string {
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
}

function formatProvinceName(raw: string): string {
    return raw
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function slugify(text: string) {
    return text.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^\w-]+/g, "");
}

export default function MapPage() {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provinceLayerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const regencyLayerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const regencyDataRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leafletRef = useRef<any>(null);

    const [reports, setReports] = useState<WalkOMeterReport[]>([]);
    const [selectedReport, setSelectedReport] = useState<WalkOMeterReport | null>(null);
    const [hasNewPosts, setHasNewPosts] = useState(false);
    const [initialLoadTime, setInitialLoadTime] = useState<number>(Date.now());
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState(false);
    const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
    const [activeProvince, setActiveProvince] = useState<string | null>(null);
    const [hoveredRegency, setHoveredRegency] = useState<string | null>(null);
    const [activeRegency, setActiveRegency] = useState<string | null>(null);

    const viewLevelRef = useRef<'country' | 'province' | 'regency'>('country');
    const activeProvinceLayerRef = useRef<any>(null);
    const activeRegencyLayerRef = useRef<any>(null);
    const zoomOutToProvinceRef = useRef<(() => void) | null>(null);
    const resetToProvincesRef = useRef<(() => void) | null>(null);

    const { dataSaver } = useDataSaver();
    const { isAuthenticated } = useAuthGuard();

    // Load reports
    useEffect(() => {
        getMapReports().then((r) => {
            setReports(r);
            setInitialLoadTime(Date.now());
            setHasNewPosts(false);
        });
    }, []);

    // Polling for Map
    useEffect(() => {
        if (dataSaver) return;

        const interval = setInterval(async () => {
            try {
                const fresh = await getMapReports();
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
        }, 15000);

        return () => clearInterval(interval);
    }, [reports, initialLoadTime, dataSaver]);

    // Initialize Leaflet map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        let cancelled = false;

        async function initMap() {
            try {
                const L = (await import("leaflet")).default;
                leafletRef.current = L;

                // Import Leaflet CSS
                if (!document.querySelector('link[href*="leaflet.css"]')) {
                    const link = document.createElement("link");
                    link.rel = "stylesheet";
                    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                    document.head.appendChild(link);
                }

                // Fix Leaflet default icon path issue in Webpack/Next.js
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete (L.Icon.Default.prototype as any)._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                });

                if (cancelled || !mapContainerRef.current) return;

                const map = L.map(mapContainerRef.current, {
                    center: INDONESIA_CENTER,
                    zoom: 5,
                    minZoom: 4,
                    maxZoom: 18,
                    maxBounds: L.latLngBounds(INDONESIA_BOUNDS),
                    maxBoundsViscosity: 1.0,
                    zoomControl: false,
                    attributionControl: false, // Remove leaflet attribution
                });

                // Clean old tiles/layers if any
                if (mapRef.current) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    mapRef.current.eachLayer((l: any) => mapRef.current?.removeLayer(l));
                }

                // Conditionally add base tiles based on dataSaver
                if (!dataSaver) {
                    L.tileLayer(
                        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
                        {
                            subdomains: "abcd",
                            maxZoom: 20,
                        }
                    ).addTo(map);
                    mapContainerRef.current.style.backgroundColor = "";
                } else {
                    mapContainerRef.current.style.backgroundColor = "#e2e8f0"; // slate-200 background instead of tiles
                }

                // Zoom control top-left
                L.control.zoom({ position: "topleft" }).addTo(map);

                // ── Load Indonesia provinces GeoJSON ──
                try {
                    const [provRes, regRes] = await Promise.all([
                        fetch("/geo/indonesia-provinces.json"),
                        fetch("/geo/indonesia-regencies.json"),
                    ]);
                    const provGeoJson = await provRes.json();
                    const regGeoJson = await regRes.json();

                    regencyDataRef.current = regGeoJson;

                    const provinceLayer = L.geoJSON(provGeoJson, {
                        style: () => ({
                            color: "#10B981",
                            weight: 1.5,
                            opacity: 0.65,
                            fillColor: "#10B981",
                            fillOpacity: 0.04,
                            interactive: true,
                        }),
                        onEachFeature: (feature: any, layer: any) => {
                            const rawName = feature.properties?.Propinsi || "";
                            const displayName = formatProvinceName(rawName);
                            const normalizedName = normalizeProvinceName(rawName);

                            // Store for later use
                            layer._provinceName = displayName;
                            layer._normalizedName = normalizedName;

                            // Hover effects
                            layer.on({
                                mouseover: (e: any) => {
                                    const target = e.target;
                                    target.setStyle({
                                        weight: 2.5,
                                        color: "#059669",
                                        fillOpacity: 0.12,
                                    });
                                    target.bringToFront();
                                    setHoveredProvince(displayName);
                                },
                                mouseout: (e: any) => {
                                    provinceLayer.resetStyle(e.target);
                                    setHoveredProvince(null);
                                },
                                click: (e: any) => {
                                    L.DomEvent.stopPropagation(e);
                                    handleProvinceClick(
                                        displayName,
                                        normalizedName,
                                        e.target
                                    );
                                },
                            });

                            // Tooltip with province name
                            layer.bindTooltip(displayName, {
                                sticky: true,
                                direction: "top",
                                className: "province-tooltip",
                            });
                        },
                    }).addTo(map);

                    provinceLayerRef.current = provinceLayer;
                } catch (err) {
                    console.error("Failed to load GeoJSON:", err);
                }

                mapRef.current = map;

                // Click on map background → reset to 1 step up
                map.on("click", () => {
                    if (viewLevelRef.current === 'regency') {
                        zoomOutToProvinceRef.current?.();
                    } else if (viewLevelRef.current === 'province') {
                        resetToProvincesRef.current?.();
                    }
                });

                setTimeout(() => {
                    map.invalidateSize();
                }, 100);

                if (!cancelled) setMapReady(true);
            } catch (err) {
                console.error("Map init error:", err);
                if (!cancelled) setMapError(true);
            }
        }

        initMap();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataSaver]);

    // Handlers mapped to refs to avoid stale closures
    zoomOutToProvinceRef.current = () => {
        const map = mapRef.current;
        if (!map) return;

        if (activeProvinceLayerRef.current) {
            const bounds = activeProvinceLayerRef.current.getBounds();
            map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8 });
        }
        viewLevelRef.current = 'province';
        setActiveRegency(null);

        if (regencyLayerRef.current) {
            regencyLayerRef.current.eachLayer((layer: any) => {
                regencyLayerRef.current.resetStyle(layer);
            });
        }
        if (activeRegencyLayerRef.current) {
            activeRegencyLayerRef.current = null;
        }
    };

    resetToProvincesRef.current = () => {
        const map = mapRef.current;
        if (!map) return;

        viewLevelRef.current = 'country';
        activeProvinceLayerRef.current = null;
        activeRegencyLayerRef.current = null;

        if (regencyLayerRef.current) {
            map.removeLayer(regencyLayerRef.current);
            regencyLayerRef.current = null;
        }

        // Restore province layer
        if (provinceLayerRef.current) {
            provinceLayerRef.current.addTo(map);
            provinceLayerRef.current.eachLayer((layer: any) => {
                provinceLayerRef.current.resetStyle(layer);
            });
        }

        setActiveProvince(null);
        setActiveRegency(null);
        map.flyTo(INDONESIA_CENTER, 5, { duration: 0.8 });
    };

    const zoomOutToProvince = useCallback(() => {
        zoomOutToProvinceRef.current?.();
    }, []);

    // Reset to province view
    const resetToProvinces = useCallback(() => {
        resetToProvincesRef.current?.();
    }, []);

    const handleRegencyClick = useCallback(
        (regName: string, targetLayer: any) => {
            const map = mapRef.current;
            if (!map) return;

            viewLevelRef.current = 'regency';

            // Reset previous active regency style if any
            if (activeRegencyLayerRef.current && regencyLayerRef.current) {
                regencyLayerRef.current.resetStyle(activeRegencyLayerRef.current);
            }

            activeRegencyLayerRef.current = targetLayer;
            setActiveRegency(regName);
            setHoveredRegency(null);

            // Highlight the clicked regency
            targetLayer.setStyle({
                weight: 3,
                color: "#059669",
                fillColor: "#10B981",
                fillOpacity: 0.25,
            });
            targetLayer.bringToFront();

            // Fly to regency bounds
            const bounds = targetLayer.getBounds();
            map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8 });
        },
        []
    );

    // Handle province click → zoom + show regencies
    const handleProvinceClick = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (displayName: string, normalizedName: string, targetLayer: any) => {
            const map = mapRef.current;
            const L = leafletRef.current;
            if (!map || !L || !regencyDataRef.current) return;

            setHoveredProvince(null);
            activeProvinceLayerRef.current = targetLayer;
            viewLevelRef.current = 'province';

            // Remove old regency layer
            if (regencyLayerRef.current) {
                map.removeLayer(regencyLayerRef.current);
                regencyLayerRef.current = null;
            }

            // Fly to province bounds
            const bounds = targetLayer.getBounds();
            map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8 });

            // Hide province layer when zoomed in
            if (provinceLayerRef.current) {
                map.removeLayer(provinceLayerRef.current);
            }

            // Filter regencies belonging to this province
            const filtered = {
                type: "FeatureCollection" as const,
                features: regencyDataRef.current.features.filter(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (f: any) => f.properties?.WADMPR === normalizedName
                ),
            };

            if (filtered.features.length === 0) return;

            const regencyLayer = L.geoJSON(filtered, {
                style: () => ({
                    color: "#059669",
                    weight: 1.2,
                    opacity: 0.8,
                    fillColor: "#10B981",
                    fillOpacity: 0.08,
                    interactive: true,
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onEachFeature: (feature: any, layer: any) => {
                    const regName = feature.properties?.WADMKK || "";

                    layer.on({
                        mouseover: (e: any) => {
                            if (viewLevelRef.current === 'regency' && activeRegencyLayerRef.current === e.target) {
                                return;
                            }
                            e.target.setStyle({
                                weight: 2.5,
                                color: "#047857",
                                fillOpacity: 0.2,
                            });
                            e.target.bringToFront();
                            setHoveredRegency(regName);
                        },
                        mouseout: (e: any) => {
                            setHoveredRegency(null);
                            if (viewLevelRef.current === 'regency' && activeRegencyLayerRef.current === e.target) {
                                return;
                            }
                            regencyLayer.resetStyle(e.target);
                        },
                        click: (e: any) => {
                            L.DomEvent.stopPropagation(e);
                            handleRegencyClick(regName, e.target);
                        }
                    });

                    layer.bindTooltip(regName, {
                        sticky: true,
                        direction: "top",
                        className: "regency-tooltip",
                    });
                },
            }).addTo(map);

            regencyLayerRef.current = regencyLayer;
            setActiveProvince(displayName);
            setActiveRegency(null);
        },
        [handleRegencyClick]
    );

    // Add markers when map + reports are ready
    useEffect(() => {
        if (!mapRef.current || !mapReady || reports.length === 0) return;

        async function addMarkers() {
            const L = (await import("leaflet")).default;
            if (!mapRef.current) return;

            reports.forEach((report) => {
                const isComplaint = report.report_type === "bang_jaga_complaint";

                // Custom div icon matching app design
                const icon = L.divIcon({
                    className: "custom-map-marker",
                    html: `
                        <div class="marker-pin ${isComplaint ? "marker-complaint" : report.trust_tier === "ground_truth" ? "marker-ground-truth" : "marker-verification"}">
                            <span class="material-symbols-outlined" style="font-size:14px;color:white;">
                                ${isComplaint ? "report" : report.trust_tier === "ground_truth" ? "workspace_premium" : "verified"}
                            </span>
                        </div>
                    `,
                    iconSize: [36, 36],
                    iconAnchor: [18, 36],
                    popupAnchor: [0, -40],
                });

                const marker = L.marker([report.latitude, report.longitude], { icon }).addTo(
                    mapRef.current!
                );

                // Build popup content
                const popupContent = `
                    <div class="report-popup">
                        <div class="popup-header">
                            <span class="popup-badge ${isComplaint ? "badge-complaint" : "badge-verification"}">
                                ${isComplaint ? "COMPLAINT" : "VERIFICATION"}
                            </span>
                        </div>
                        <h3 class="popup-title">${report.description}</h3>
                        <p class="popup-meta">
                            <span class="material-symbols-outlined popup-meta-icon">schedule</span>
                            ${timeAgo(report.created_at)}${report.location_label ? ` · ${report.location_label}` : ""}
                        </p>
                        ${report.status !== "pending" ? `<div style="margin-top:8px; margin-bottom:8px;"><span style="display:inline-flex; align-items:center; gap:4px; font-size:9px; font-weight:700; text-transform:uppercase; padding:2px 6px; border-radius:9999px; ${report.status === "resolved" ? "color:#16a34a; background-color:#f0fdf4; border:1px solid #bbf7d0;" : report.status === "accepted" ? "color:#2563eb; background-color:#eff6ff; border:1px solid #bfdbfe;" : "color:#475569; background-color:#f8fafc; border:1px solid #e2e8f0;"}">${report.status}</span></div>` : ""}
                        ${report.tags.length > 0
                        ? `<div class="popup-tags">${report.tags.map((t) => `<span class="popup-tag">#${t}</span>`).join("")}</div>`
                        : ""
                    }
                        ${report.trust_tier === "ground_truth"
                        ? `<div class="popup-ground-truth">
                                <span class="material-symbols-outlined popup-meta-icon">verified</span>
                                Ground Truth · ${report.verification_count} verifications
                            </div>`
                        : ""
                    }
                        ${report.promise_id
                        ? `<a href="/promise-tracker#promise-${report.promise_id}" class="popup-promise-link mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline hover:text-primary-dark transition-colors" style="display:inline-flex; align-items:center; gap:4px; margin-top:8px; font-size:11px; font-weight:600; color:#10b981; text-decoration:none;">
                                <span class="material-symbols-outlined" style="font-size:14px;">link</span>
                                View Original Promise
                           </a>`
                        : ""
                    }
                    </div>
                `;

                marker.bindPopup(popupContent, {
                    maxWidth: 280,
                    minWidth: 220,
                    className: "app-popup",
                    autoPanPadding: L.point(60, 60),
                    keepInView: true,
                });

                marker.on("click", () => {
                    setSelectedReport(report);
                });
            });
        }

        addMarkers();
    }, [mapReady, reports]);

    const timeAgo = (d: string) => {
        const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const flyToReport = useCallback(
        (report: WalkOMeterReport) => {
            if (!mapRef.current) return;
            setSelectedReport(report);
            mapRef.current.flyTo([report.latitude, report.longitude], 14, {
                duration: 1.5,
            });
        },
        []
    );

    return (
        <div className="h-screen flex flex-col">
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
                {/* Map area */}
                <div className="flex-1 relative">
                    {/* Map container */}
                    <div
                        ref={mapContainerRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ minHeight: "400px", zIndex: 0 }}
                    />

                    {/* Province hover / active label */}
                    {(hoveredProvince || activeProvince || hoveredRegency || activeRegency) && (
                        <div
                            className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/92 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/60 px-5 py-2.5 pointer-events-none"
                            style={{ zIndex: 1000 }}
                        >
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-base">
                                    location_on
                                </span>
                                <div className="flex items-center flex-wrap">
                                    {!activeProvince ? (
                                        <span>{hoveredProvince}</span>
                                    ) : (
                                        <>
                                            <span>{activeProvince}</span>
                                            {(activeRegency || hoveredRegency) && (
                                                <>
                                                    <span className="text-slate-400 mx-1.5 material-symbols-outlined text-[14px]">chevron_right</span>
                                                    <span>{hoveredRegency || activeRegency}</span>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                                {(activeProvince || activeRegency) && !hoveredProvince && !hoveredRegency && (
                                    <span className="text-[10px] font-medium text-slate-400 ml-2 whitespace-nowrap hidden sm:inline-block">
                                        (click outside border to zoom out)
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Back to overview button when zoomed into province */}
                    {activeProvince && (
                        <div className="absolute top-4 left-4 sm:left-16 flex flex-col gap-2" style={{ zIndex: 1000 }}>
                            <button
                                onClick={resetToProvinces}
                                className="bg-white/92 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/60 px-3 sm:px-4 py-2 flex items-center gap-2 hover:bg-white transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-slate-600 text-base">
                                    arrow_back
                                </span>
                                <span className="text-xs font-bold text-slate-700 hidden sm:inline-block">All Provinces</span>
                            </button>
                            {activeRegency && (
                                <button
                                    onClick={zoomOutToProvince}
                                    className="bg-white/92 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/60 px-3 sm:px-4 py-2 flex items-center gap-2 hover:bg-white transition-colors cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-slate-600 text-base">
                                        arrow_back
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 hidden sm:inline-block">{activeProvince}</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Data Saver Banner */}
                    {dataSaver && (
                        <div
                            className="absolute top-4 right-4 flex items-center gap-2 bg-amber-50/95 backdrop-blur-sm border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 shadow-md"
                            style={{ zIndex: 1000 }}
                        >
                            <span className="material-symbols-outlined text-amber-600 text-lg">data_saver_on</span>
                            <p className="text-xs font-medium">Data Saver ON — reduced tiles, live updates paused.</p>
                        </div>
                    )}

                    {/* New Posts Pill */}
                    {hasNewPosts && (
                        <button
                            onClick={() => {
                                getMapReports().then((r) => {
                                    setReports(r);
                                    setHasNewPosts(false);
                                    setInitialLoadTime(Date.now());
                                });
                            }}
                            className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary/95 text-white backdrop-blur-md rounded-full shadow-lg px-5 py-2.5 font-bold text-xs flex items-center gap-2 hover:bg-primary transition-all cursor-pointer animate-in fade-in slide-in-from-top-4"
                            style={{ zIndex: 1000 }}
                        >
                            <span className="material-symbols-outlined text-[16px]">refresh</span>
                            New reports available
                        </button>
                    )}

                    {/* Map error state */}
                    {mapError && (
                        <div
                            className="absolute inset-0 flex items-center justify-center bg-slate-100"
                            style={{ zIndex: 1000 }}
                        >
                            <div className="text-center">
                                <span className="material-symbols-outlined text-5xl text-slate-300">
                                    error
                                </span>
                                <p className="text-sm text-slate-500 mt-2">
                                    Map failed to load. Check your connection.
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-3 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Floating Submit Report Button */}
                    {isAuthenticated && (
                        <Link
                            href="/chat?action=report"
                            className="absolute bottom-6 right-6 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary-dark hover:shadow-xl transition-all hover:-translate-y-1 flex items-center justify-center group"
                            style={{ zIndex: 1000 }}
                            title="Submit a New Report"
                        >
                            <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                            <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[120px] transition-all duration-300 ease-in-out font-bold text-sm pl-0 group-hover:pl-2">
                                Submit Report
                            </span>
                        </Link>
                    )}
                </div>

                {/* Right sidebar: Evidence Feed */}
                <aside className="w-80 border-l border-slate-200 flex flex-col shrink-0 hidden lg:flex bg-white">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">
                                description
                            </span>
                            <h3 className="font-bold text-slate-900">Evidence Feed</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/feed"
                                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                            >
                                <span className="material-symbols-outlined text-sm">list</span>
                                List View
                            </Link>
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />

                            <span className="text-xs font-bold text-primary">LIVE</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {reports.map((report) => {
                            const isComplaint =
                                report.report_type === "bang_jaga_complaint";
                            return (
                                <button
                                    key={report.id}
                                    onClick={() => flyToReport(report)}
                                    className="block w-full text-left bg-white rounded-xl border border-slate-200 p-3 hover:shadow-sm transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-slate-500 text-sm">
                                                    person
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">
                                                    {report.user_name}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {timeAgo(report.created_at)}
                                                    {report.location_label &&
                                                        ` · ${report.location_label}`}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${isComplaint
                                                ? "text-danger bg-danger/10 border-danger/20"
                                                : "text-primary bg-primary/10 border-primary/20"
                                                }`}
                                        >
                                            {isComplaint ? "COMPLAINT" : "VERIFICATION"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 line-clamp-2">
                                        {report.description}{" "}
                                        {report.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="text-primary font-semibold"
                                            >
                                                #{tag}{" "}
                                            </span>
                                        ))}
                                    </p>
                                    {report.trust_tier === "ground_truth" && (
                                        <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-primary">
                                            <span className="material-symbols-outlined text-[10px]">
                                                verified
                                            </span>
                                            Ground Truth
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="p-3 border-t border-slate-200">
                        <Link
                            href={activeProvince ? `/feed?province=${slugify(activeProvince)}` : "/feed"}
                            className="block w-full text-center py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Explore All Reports
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
