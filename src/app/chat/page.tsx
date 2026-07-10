"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import {
    getSessions,
    getSessionMessages,
    createSession,
    sendMessage,
    archiveSession,
    restoreSession,
} from "@/app/actions/chat";
import { shareComplaintToMap, isComplaintSharedToMap } from "@/app/actions/reports";
import type { ChatSession, ChatMessage as ChatMessageType } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import ShareToMapModal from "@/components/ShareToMapModal";
import ChatMessage from "@/components/ChatMessage";
import { useAuthGuard } from "@/context/AuthGuardContext";
import { useDataSaver } from "@/context/DataSaverContext";
import { useModal } from "@/context/ModalContext";
import { compressImage } from "@/lib/image-utils";
import type { ComplaintDraft } from "@/lib/complaint-utils";
import {
    extractComplaintDraft,
    hasComplaintClear,
    stripComplaintMarkers,
    deriveComplaintDraftFromMessages,
    formatComplaintForWhatsApp,
} from "@/lib/complaint-utils";

const TEMPLATES = [
    { label: "Learn Regulations", icon: "school", message: "I want to learn about environmental regulations in my area. What laws protect citizens from pollution?" },
    { label: "Draft Surat Pengaduan", icon: "description", message: "I need to draft a formal complaint (Surat Pengaduan)." },
    // { label: "Report Pollution", icon: "error", message: "I want to report air pollution from a factory near ." },
];

const SESSIONS_SIDEBAR_STORAGE_KEY_HIDDEN = "chat-sessions-sidebar-hidden";
const SESSIONS_SIDEBAR_STORAGE_KEY_WIDTH = "chat-sessions-sidebar-width";
const SESSIONS_SIDEBAR_STORAGE_KEY_MOBILE_OPEN = "chat-sessions-sidebar-mobile-open";
const SESSIONS_SIDEBAR_WIDTH_DEFAULT = 288;
const SESSIONS_SIDEBAR_WIDTH_MIN = 200;
const SESSIONS_SIDEBAR_WIDTH_MAX = 480;

export default function ChatPage() {
    const [input, setInput] = useState("");
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>("");
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamedText, setStreamedText] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [complaintDraft, setComplaintDraft] = useState<ComplaintDraft | null>(null);
    const [shareModalStep, setShareModalStep] = useState<number | null>(null);
    const [shareLocation, setShareLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [shareLocationLoading, setShareLocationLoading] = useState(false);
    const [shareLocationError, setShareLocationError] = useState(false);
    const [shareSummary, setShareSummary] = useState("");
    const [shareConsent, setShareConsent] = useState(false);
    const [shareRegionId, setShareRegionId] = useState("");
    const [isSharing, setIsSharing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewPanelWidth, setPreviewPanelWidth] = useState(448);
    const [isResizingPreview, setIsResizingPreview] = useState(false);
    const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);
    const [hasUnseenPreviewChanges, setHasUnseenPreviewChanges] = useState(false);
    const lastSeenDraftRef = useRef<string>("");
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(448);
    const previewWidthRef = useRef(448);
    const [sessionsSidebarHidden, setSessionsSidebarHidden] = useState(false);
    const [sessionsSidebarWidth, setSessionsSidebarWidth] = useState(SESSIONS_SIDEBAR_WIDTH_DEFAULT);
    const [isResizingSessions, setIsResizingSessions] = useState(false);
    const sessionsResizeStartX = useRef(0);
    const sessionsResizeStartWidth = useRef(SESSIONS_SIDEBAR_WIDTH_DEFAULT);
    const sessionsWidthRef = useRef(SESSIONS_SIDEBAR_WIDTH_DEFAULT);
    const [isMd, setIsMd] = useState(false);
    const { dataSaver } = useDataSaver();

    useEffect(() => {
        const m = window.matchMedia("(min-width: 768px)");
        setIsMd(m.matches);
        const onChange = () => setIsMd(m.matches);
        m.addEventListener("change", onChange);
        return () => m.removeEventListener("change", onChange);
    }, []);
    const { showAlert } = useModal();
    const { isAuthenticated, requireAuth } = useAuthGuard();
    const [authChecked, setAuthChecked] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        setIsOffline(!navigator.onLine);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            requireAuth("access Bang Jaga");
        }
        setAuthChecked(true);
    }, [isAuthenticated, requireAuth]);

    // Resize document preview panel
    useEffect(() => {
        if (!isResizingPreview) return;
        const MIN = 280;
        const MAX = 720;
        const onMove = (e: MouseEvent) => {
            const delta = e.clientX - resizeStartX.current;
            const next = Math.min(MAX, Math.max(MIN, resizeStartWidth.current - delta));
            previewWidthRef.current = next;
            setPreviewPanelWidth(next);
        };
        const onUp = () => {
            setIsResizingPreview(false);
            resizeStartWidth.current = previewWidthRef.current;
            document.body.style.removeProperty("user-select");
        };
        document.body.style.userSelect = "none";
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [isResizingPreview]);

    // Mark document preview as having unseen changes when draft updates and drawer is closed
    useEffect(() => {
        if (!complaintDraft) return;
        const snap = JSON.stringify(complaintDraft);
        if (snap !== lastSeenDraftRef.current && !previewDrawerOpen) {
            setHasUnseenPreviewChanges(true);
        }
    }, [complaintDraft, previewDrawerOpen]);

    const openPreviewDrawer = useCallback(() => {
        setPreviewDrawerOpen(true);
    }, []);

    const closePreviewDrawer = useCallback(() => {
        setPreviewDrawerOpen(false);
        if (complaintDraft) {
            lastSeenDraftRef.current = JSON.stringify(complaintDraft);
            setHasUnseenPreviewChanges(false);
        }
    }, [complaintDraft]);

    // Load sessions sidebar prefs from localStorage (client-only)
    useEffect(() => {
        try {
            const h = localStorage.getItem(SESSIONS_SIDEBAR_STORAGE_KEY_HIDDEN);
            if (h !== null) setSessionsSidebarHidden(h === "true");
            const w = localStorage.getItem(SESSIONS_SIDEBAR_STORAGE_KEY_WIDTH);
            if (w !== null) {
                const n = parseInt(w, 10);
                if (!Number.isNaN(n)) {
                    const clamped = Math.min(SESSIONS_SIDEBAR_WIDTH_MAX, Math.max(SESSIONS_SIDEBAR_WIDTH_MIN, n));
                    setSessionsSidebarWidth(clamped);
                    sessionsResizeStartWidth.current = clamped;
                    sessionsWidthRef.current = clamped;
                }
            }
            const mobileOpen = localStorage.getItem(SESSIONS_SIDEBAR_STORAGE_KEY_MOBILE_OPEN);
            if (mobileOpen !== null) setSidebarOpen(mobileOpen === "true");
        } catch {
            /* ignore */
        }
    }, []);

    // Resize sessions sidebar (mouse + touch)
    useEffect(() => {
        if (!isResizingSessions) return;
        const getClientX = (e: MouseEvent | TouchEvent): number =>
            "touches" in e ? e.touches[0]?.clientX ?? 0 : (e as MouseEvent).clientX;
        const onMove = (e: MouseEvent | TouchEvent) => {
            const clientX = getClientX(e);
            const delta = clientX - sessionsResizeStartX.current;
            const next = Math.min(SESSIONS_SIDEBAR_WIDTH_MAX, Math.max(SESSIONS_SIDEBAR_WIDTH_MIN, sessionsResizeStartWidth.current + delta));
            sessionsWidthRef.current = next;
            setSessionsSidebarWidth(next);
        };
        const onUp = () => {
            setIsResizingSessions(false);
            sessionsResizeStartWidth.current = sessionsWidthRef.current;
            try {
                localStorage.setItem(SESSIONS_SIDEBAR_STORAGE_KEY_WIDTH, String(Math.round(sessionsWidthRef.current)));
            } catch {
                /* ignore */
            }
            document.body.style.removeProperty("user-select");
        };
        const onTouchEnd = () => {
            onUp();
        };
        document.body.style.userSelect = "none";
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd);
        window.addEventListener("touchcancel", onTouchEnd);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("touchend", onTouchEnd);
            window.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [isResizingSessions]);

    // Load sessions
    const loadSessions = useCallback(async (includeArchived = false) => {
        const existingSessions = await getSessions(includeArchived);
        setSessions(existingSessions);

        // Check for a specific session ID from the URL query param (/chat?session=xyz)
        const params = new URLSearchParams(window.location.search);
        const requestedSessionId = params.get("session");

        if (requestedSessionId && existingSessions.some(s => s.id === requestedSessionId)) {
            setActiveSessionId(requestedSessionId);
            return;
        }

        if (existingSessions.length > 0) {
            setActiveSessionId(existingSessions[0].id);
            return;
        }

        if (!includeArchived) {
            const newSession = await createSession();
            if (newSession) {
                setSessions([newSession]);
                setActiveSessionId(newSession.id);
            }
        }
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const handleArchiveSession = async (sessionId: string) => {
        const { success } = await archiveSession(sessionId);
        if (success) {
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (activeSessionId === sessionId) {
                const remaining = sessions.filter(s => s.id !== sessionId);
                setActiveSessionId(remaining.length > 0 ? remaining[0].id : "");
            }
        }
    };

    const handleRestoreSession = async (sessionId: string) => {
        const { success } = await restoreSession(sessionId);
        if (success) {
            await loadSessions(showArchived);
        }
    };

    // Load messages when session changes
    useEffect(() => {
        if (activeSessionId) {
            getSessionMessages(activeSessionId).then((msgs) => {
                setMessages(msgs);
                setComplaintDraft(deriveComplaintDraftFromMessages(msgs));
            });
        } else {
            setComplaintDraft(null);
        }
    }, [activeSessionId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamedText]);

    // Simulate typewriter streaming
    const streamText = useCallback((fullText: string, msg: ChatMessageType) => {
        setIsStreaming(true);
        setStreamedText("");
        let i = 0;
        const interval = setInterval(() => {
            setStreamedText(fullText.slice(0, i + 1));
            i++;
            if (i >= fullText.length) {
                clearInterval(interval);
                setIsStreaming(false);
                setMessages(prev => [...prev.filter((m) => m.id !== msg.id), { ...msg, content: fullText }]);
            }
        }, 15);
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);

            const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
            const imageFiles = files.filter(f => allowedTypes.includes(f.type));
            if (imageFiles.length < files.length) {
                await showAlert("Invalid File", "Only JPG, PNG, and WEBP images are allowed.");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }

            // Apply compression if data-saver is on
            const processedFiles = await globalThis.Promise.all(
                imageFiles.map(async (f) => {
                    if (dataSaver) {
                        return await compressImage(f);
                    }
                    return f;
                })
            );

            let newAttachments = [...attachments];
            let totalSessionSize = newAttachments.reduce((acc, f) => acc + f.size, 0);

            for (const file of processedFiles) {
                if (file.size > 5 * 1024 * 1024) {
                    await showAlert("File Too Large", `${file.name} exceeds the 5MB limit.`);
                    continue;
                }
                if (totalSessionSize + file.size > 20 * 1024 * 1024) {
                    await showAlert("Limit Reached", "Total attachment size cannot exceed 20MB.");
                    break;
                }
                newAttachments.push(file);
                totalSessionSize += file.size;
            }

            setAttachments(newAttachments.slice(0, 5)); // max 5 images
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleWhatsAppCopy = async () => {
        if (!complaintDraft) return;
        const text = formatComplaintForWhatsApp(complaintDraft);
        try {
            await navigator.clipboard.writeText(text);
            await showAlert("Berhasil disalin!", "Teks pengaduan telah disalin. Silakan paste (tempel) di WhatsApp.");
        } catch (e) {
            console.error("Failed to copy text:", e);
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
        }
    };

    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<{ stop(): void } | null>(null);

    const toggleListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
        if (!SR) {
            showAlert("Not Supported", "Speech recognition requires Chrome or Edge browser.");
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new SR() as any;
        recognition.lang = "id-ID";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            setIsListening(false);
            if (event.error === "not-allowed") {
                showAlert("Izin Ditolak", "Akses mikrofon ditolak. Izinkan akses mikrofon di pengaturan browser Anda.");
            } else if (event.error === "audio-capture") {
                showAlert("Mikrofon Tidak Ditemukan", "Tidak ada mikrofon yang terdeteksi. Sambungkan mikrofon dan coba lagi.");
            } else if (event.error !== "aborted" && event.error !== "no-speech") {
                showAlert("Kesalahan Suara", `Kesalahan pengenalan suara: ${event.error}`);
            }
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        };

        recognitionRef.current = recognition;
        setIsListening(true); // immediate visual feedback before onstart fires
        recognition.start();
    }, [isListening, showAlert]);

    const [isExporting, setIsExporting] = useState(false);
    const handleExportPDF = async () => {
        if (isExporting || !complaintDraft) return;
        setIsExporting(true);
        try {
            const res = await fetch("/api/export-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(complaintDraft),
            });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Surat_Pengaduan.pdf";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (e) {
            console.error("Failed to export PDF", e);
            await showAlert("Export Error", "Failed to export PDF");
        } finally {
            setIsExporting(false);
        }
    };

    const handleStartShare = async () => {
        if (!complaintDraft || !activeSessionId) return;
        const alreadyShared = await isComplaintSharedToMap(activeSessionId);
        if (alreadyShared) {
            await showAlert("Already shared", "This complaint was already shared to the map.");
            return;
        }
        setShareSummary(complaintDraft.subject);
        setShareModalStep(1);
        handleGetLocation();
    };

    const handleGetLocation = async () => {
        if (!navigator.geolocation) {
            await showAlert("Geolocation Unavailable", "Geolocation is not supported by your browser");
            return;
        }
        setShareLocationError(false);
        setShareLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setShareLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                setShareLocationLoading(false);
                setShareLocationError(false);
            },
            (err) => {
                console.error(err);
                setShareLocationError(true);
                setShareLocationLoading(false);
            }
        );
    };

    const handleConfirmShare = async () => {
        if (!shareLocation || !shareConsent) return;
        setIsSharing(true);
        try {
            if (!navigator.onLine || !isAuthenticated) {
                // Save offline / guest
                const drafts = JSON.parse(localStorage.getItem('wiwokdetok_drafts') || '[]');
                drafts.push({
                    sessionId: activeSessionId,
                    latitude: shareLocation.latitude,
                    longitude: shareLocation.longitude,
                    summary: shareSummary,
                    region_id: shareRegionId,
                    location_label: `${shareLocation.latitude.toFixed(4)}, ${shareLocation.longitude.toFixed(4)}`,
                    timestamp: Date.now()
                });
                localStorage.setItem('wiwokdetok_drafts', JSON.stringify(drafts));

                // If offline, maybe show step 8, but for guests show step 7 to not confuse them
                setShareModalStep(!navigator.onLine ? 8 : 7);
                return;
            }

            const res = await shareComplaintToMap({
                sessionId: activeSessionId,
                latitude: shareLocation.latitude,
                longitude: shareLocation.longitude,
                summary: shareSummary,
                region_id: shareRegionId,
                location_label: `${shareLocation.latitude.toFixed(4)}, ${shareLocation.longitude.toFixed(4)}`
            });

            if (res.success) {
                setShareModalStep(7);
            } else {
                await showAlert("Sharing Failed", res.message);
            }
        } catch (e) {
            console.error("Failed to share", e);
            // Fallback to offline draft
            const drafts = JSON.parse(localStorage.getItem('wiwokdetok_drafts') || '[]');
            drafts.push({
                sessionId: activeSessionId,
                latitude: shareLocation.latitude,
                longitude: shareLocation.longitude,
                summary: shareSummary,
                region_id: shareRegionId,
                location_label: `${shareLocation.latitude.toFixed(4)}, ${shareLocation.longitude.toFixed(4)}`,
                timestamp: Date.now()
            });
            localStorage.setItem('wiwokdetok_drafts', JSON.stringify(drafts));
            setShareModalStep(8);
        } finally {
            setIsSharing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (d: string) => {
        return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleSend = async (customText?: string) => {
        const text = customText || input;
        if (!text.trim() || isStreaming) {
            return;
        }

        if (isOffline) {
            await showAlert("Koneksi Terputus", "Anda sedang offline. Periksa koneksi internet Anda dan coba lagi.");
            return;
        }

        let sessionId = activeSessionId;
        if (!sessionId) {
            const newSession = await createSession();
            if (!newSession) {
                await showAlert("Chat Session Error", "Could not create a chat session. Please refresh and try again.");
                return;
            }
            sessionId = newSession.id;
            setSessions((prev) => [newSession, ...prev]);
            setActiveSessionId(newSession.id);
        }

        setInput("");
        setIsUploading(true);

        let uploadedUrls: string[] = [];

        // Upload attachments if any
        if (attachments.length > 0) {
            for (const file of attachments) {
                const fileName = `${Date.now()}-${file.name}`;
                const { data, error } = await supabase.storage
                    .from("chat_attachments")
                    .upload(fileName, file);

                if (!error && data) {
                    const { data: { publicUrl } } = supabase.storage
                        .from("chat_attachments")
                        .getPublicUrl(fileName);
                    uploadedUrls.push(publicUrl);
                }
            }
            setAttachments([]);
        }
        setIsUploading(false);

        // Add user message
        const userMsg: ChatMessageType = {
            id: `um${Date.now()}`,
            session_id: sessionId,
            role: "user",
            content: text,
            created_at: new Date().toISOString(),
            attachment_urls: uploadedUrls
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            // Call Gemini
            const response = await sendMessage(sessionId, text, uploadedUrls);
            if (response) {
                const draft = extractComplaintDraft(response.content);
                const clear = hasComplaintClear(response.content);
                const displayContent = stripComplaintMarkers(response.content);

                streamText(displayContent, { ...response, content: displayContent });

                if (draft) setComplaintDraft(draft);
                else if (clear) setComplaintDraft(null);
            } else {
                await showAlert("Bang Jaga Sibuk", "Maaf, Bang Jaga sedang tidak bisa merespons. Silakan coba sebentar lagi.");
            }
        } catch (e) {
            console.error(e);
            await showAlert("Gangguan Jaringan", "Terjadi kesalahan jaringan saat menghubungi Bang Jaga.");
        }
    };

    const handleNewSession = async () => {
        const newSess = await createSession();
        if (newSess) {
            setSessions(prev => [newSess, ...prev]);
            setActiveSessionId(newSess.id);
            setSidebarOpen(false);
            try {
                localStorage.setItem(SESSIONS_SIDEBAR_STORAGE_KEY_MOBILE_OPEN, "false");
            } catch {
                /* ignore */
            }
        }
    };

    if (!authChecked || !isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const groupSessions = () => {
        const groups: Record<string, ChatSession[]> = {
            "Today": [],
            "Yesterday": [],
            "Previous 7 Days": [],
            "Older": []
        };
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        sessions.forEach(s => {
            const date = new Date(s.last_message_at);
            date.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) groups["Today"].push(s);
            else if (diffDays === 1) groups["Yesterday"].push(s);
            else if (diffDays <= 7) groups["Previous 7 Days"].push(s);
            else groups["Older"].push(s);
        });

        return Object.entries(groups).filter(([_, group]) => group.length > 0);
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            <Navbar />

            <main className="flex-1 flex overflow-hidden">
                {isOffline && (
                    <div className="absolute top-16 left-0 right-0 z-40 bg-red-500 text-white text-center py-1.5 text-xs font-bold shadow-md flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">wifi_off</span>
                        Anda sedang offline. Beberapa fitur mungkin tidak tersedia.
                    </div>
                )}

                {/* Show sessions tab when sidebar is closed/hidden — all viewports */}
                {((isMd && sessionsSidebarHidden) || (!isMd && !sidebarOpen)) && (
                    <button
                        type="button"
                        onClick={() => {
                            if (isMd) {
                                setSessionsSidebarHidden(false);
                                try {
                                    localStorage.setItem(SESSIONS_SIDEBAR_STORAGE_KEY_HIDDEN, "false");
                                } catch {
                                    /* ignore */
                                }
                            } else {
                                setSidebarOpen(true);
                                try {
                                    localStorage.setItem(SESSIONS_SIDEBAR_STORAGE_KEY_MOBILE_OPEN, "true");
                                } catch {
                                    /* ignore */
                                }
                            }
                        }}
                        className="flex fixed left-0 top-[45%] -translate-y-1/2 z-30 w-10 h-24 rounded-r-xl bg-slate-200 text-slate-600 hover:bg-slate-300 border border-l-0 border-slate-300 items-center justify-center shadow-md"
                        aria-label="Show chat sessions"
                    >
                        <span className="material-symbols-outlined text-2xl">chevron_right</span>
                    </button>
                )}

                {/* Left Sidebar: Sessions */}
                <aside
                    className={`
                    fixed inset-y-0 left-0 z-20 bg-slate-50 border-r border-slate-200 transform transition-[transform,width] duration-300 md:relative md:translate-x-0 shrink-0
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
                    ${isMd && sessionsSidebarHidden ? "md:overflow-hidden" : ""}
                `}
                    style={{
                        width: isMd ? (sessionsSidebarHidden ? 0 : sessionsSidebarWidth) : sessionsSidebarWidth,
                    }}
                >
                    <div className="p-4 h-full flex flex-col w-72 md:w-full min-w-0 relative">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sessions</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isMd) {
                                        setSessionsSidebarHidden(true);
                                        try {
                                            localStorage.setItem(SESSIONS_SIDEBAR_STORAGE_KEY_HIDDEN, "true");
                                        } catch {
                                            /* ignore */
                                        }
                                    } else {
                                        setSidebarOpen(false);
                                        try {
                                            localStorage.setItem(SESSIONS_SIDEBAR_STORAGE_KEY_MOBILE_OPEN, "false");
                                        } catch {
                                            /* ignore */
                                        }
                                    }
                                }}
                                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 md:block"
                                aria-label="Hide sessions panel"
                            >
                                <span className="material-symbols-outlined text-lg">{isMd ? "chevron_left" : "close"}</span>
                            </button>
                        </div>
                        <button
                            onClick={handleNewSession}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 mb-4 shadow-md transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            New Consultation
                        </button>

                        {/* Archived toggle */}
                        <div className="flex items-center justify-between mb-3 px-1">
                            <button
                                onClick={() => {
                                    const next = !showArchived;
                                    setShowArchived(next);
                                    loadSessions(next);
                                }}
                                className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${showArchived ? "text-primary" : "text-slate-400 hover:text-slate-600"
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[14px]">{showArchived ? "inventory_2" : "archive"}</span>
                                {showArchived ? "Showing Archived" : "View Archived"}
                            </button>
                            {showArchived && (
                                <button
                                    onClick={() => {
                                        setShowArchived(false);
                                        loadSessions(false);
                                    }}
                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                                >
                                    Back
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                            {groupSessions().map(([groupName, groupSessions]) => (
                                <div key={groupName} className="space-y-1">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">{groupName}</h3>
                                    {groupSessions.map((s) => (
                                        <div
                                            key={s.id}
                                            className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 group cursor-pointer ${activeSessionId === s.id
                                                ? "bg-white shadow-sm border border-slate-200"
                                                : "hover:bg-slate-200/50 border border-transparent"
                                                } ${(s as any).archived_at ? "opacity-60" : ""}`}
                                            onClick={() => {
                                                setActiveSessionId(s.id);
                                                setSidebarOpen(false);
                                                try {
                                                    localStorage.setItem(SESSIONS_SIDEBAR_STORAGE_KEY_MOBILE_OPEN, "false");
                                                } catch {
                                                    /* ignore */
                                                }
                                            }}
                                        >
                                            <span className={`material-symbols-outlined text-sm mt-0.5 ${activeSessionId === s.id ? "text-primary" : "text-slate-400"}`}>chat</span>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-bold truncate ${activeSessionId === s.id ? "text-slate-900" : "text-slate-600"}`}>
                                                    {s.title}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {new Date(s.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if ((s as any).archived_at) {
                                                        handleRestoreSession(s.id);
                                                    } else {
                                                        handleArchiveSession(s.id);
                                                    }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all shrink-0"
                                                title={(s as any).archived_at ? "Restore session" : "Archive session"}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">
                                                    {(s as any).archived_at ? "unarchive" : "archive"}
                                                </span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-200">
                            <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                                <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Watchdog Tip</p>
                                <p className="text-[10px] text-orange-800 leading-relaxed">
                                    Include photos and location data to get more accurate legal analysis.
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Mobile resize handle (right edge of sidebar when open) */}
                    {!isMd && sidebarOpen && (
                        <div
                            role="separator"
                            aria-label="Resize sessions panel"
                            className="absolute top-0 right-0 bottom-0 w-4 cursor-col-resize flex items-center justify-center border-l border-slate-200 hover:bg-slate-100 active:bg-slate-200 touch-none"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                sessionsResizeStartX.current = e.clientX;
                                sessionsResizeStartWidth.current = sessionsSidebarWidth;
                                setIsResizingSessions(true);
                            }}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                const t = e.touches[0];
                                sessionsResizeStartX.current = t.clientX;
                                sessionsResizeStartWidth.current = sessionsSidebarWidth;
                                setIsResizingSessions(true);
                            }}
                            style={{ touchAction: "none" }}
                        >
                            <span className="w-1 h-12 rounded-full bg-slate-300" />
                        </div>
                    )}
                </aside>

                {/* Resize handle for sessions sidebar (desktop, when visible) */}
                {isMd && !sessionsSidebarHidden && (
                    <div
                        role="separator"
                        aria-label="Resize sessions panel"
                        className="w-1.5 shrink-0 cursor-col-resize border-r border-slate-200 hover:bg-primary/10 active:bg-primary/20 transition-colors group"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            sessionsResizeStartX.current = e.clientX;
                            sessionsResizeStartWidth.current = sessionsSidebarWidth;
                            setIsResizingSessions(true);
                        }}
                        style={{ touchAction: "none" }}
                    >
                        <span className="w-px h-full bg-slate-200 group-hover:bg-primary/40 mx-auto block" />
                    </div>
                )}

                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div
                        className="md:hidden absolute inset-0 bg-black/20 z-10"
                        onClick={() => {
                            setSidebarOpen(false);
                            try {
                                localStorage.setItem(SESSIONS_SIDEBAR_STORAGE_KEY_MOBILE_OPEN, "false");
                            } catch {
                                /* ignore */
                            }
                        }}
                    />
                )}

                {/* Center: Chat */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                        {messages.length === 0 && !isStreaming && (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-orange-500 text-3xl">pets</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">
                                    Halo! I&apos;m Bang Jaga
                                </h2>
                                <p className="text-sm text-slate-500 max-w-md mb-6">
                                    I&apos;m here to help you with environmental policies, regulations, and
                                    drafting formal complaints. Pick a template below to get started!
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {TEMPLATES.map((t) => (
                                        <button
                                            key={t.label}
                                            onClick={() => handleSend(t.message)}
                                            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-sm">{t.icon}</span>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages
                            .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
                            .map((msg) => (
                                <ChatMessage
                                    key={msg.id}
                                    message={msg}
                                    formatTime={formatTime}
                                />
                            ))}

                        {isStreaming && (
                            <ChatMessage
                                message={{
                                    id: "temp-streaming",
                                    role: "assistant",
                                    content: streamedText,
                                    created_at: new Date().toISOString(),
                                    session_id: activeSessionId,
                                    attachment_urls: []
                                }}
                                formatTime={() => "Just now"}
                                isStreaming={true}
                            />
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Template chips (shown when there are messages) */}
                    {messages.length > 0 && (
                        <div className="px-4 md:px-6 flex gap-2 flex-wrap">
                            {TEMPLATES.map((t) => (
                                <button
                                    key={t.label}
                                    onClick={() => handleSend(t.message)}
                                    disabled={isStreaming}
                                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">{t.icon}</span>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-4">
                        <div className="flex items-end gap-2">
                            <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                                {/* Attachment Preview */}
                                {attachments.length > 0 && (
                                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                                        {attachments.map((file, idx) => (
                                            <div key={idx} className="relative w-16 h-16 shrink-0 rounded-lg border border-slate-200 overflow-hidden group">
                                                <img src={URL.createObjectURL(file)} alt="attachment" className="w-full h-full object-cover" />
                                                <button onClick={() => removeAttachment(idx)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="material-symbols-outlined text-[12px]">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type your message here..."
                                        disabled={isStreaming}
                                        className="flex-1 min-w-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none disabled:opacity-50 h-10"
                                    />
                                    <button onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= 5 || isUploading} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors disabled:opacity-50 shrink-0">
                                        <span className="material-symbols-outlined text-2xl" aria-label="Add image" title="Add image">add_photo_alternate</span>
                                    </button>
                                    <button
                                        onClick={toggleListening}
                                        disabled={isStreaming}
                                        title={isListening ? "Stop listening" : "Speak in Indonesian"}
                                        className={`text-xs transition-colors disabled:opacity-50 shrink-0 ${isListening ? "text-red-500 animate-pulse" : "text-slate-500 hover:text-primary"}`}
                                    >
                                        <span className="material-symbols-outlined text-2xl">{isListening ? "mic_off" : "mic"}</span>
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isStreaming}
                                className="w-12 h-12 shrink-0 rounded-full bg-primary hover:bg-primary-dark flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed my-2"
                            >
                                <span className="material-symbols-outlined text-white text-lg">send</span>
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center mt-2">
                            Bang Jaga can make mistakes. Please verify legal information independently.
                        </p>
                    </div>
                </div>

                {/* Resize handle for document preview (lg only) */}
                <div
                    role="separator"
                    aria-label="Resize document preview"
                    className="hidden lg:flex w-1.5 shrink-0 cursor-col-resize border-l border-slate-200 hover:bg-primary/10 active:bg-primary/20 transition-colors group"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        resizeStartX.current = e.clientX;
                        resizeStartWidth.current = previewPanelWidth;
                        setIsResizingPreview(true);
                    }}
                    style={{ touchAction: "none" }}
                >
                    <span className="w-px h-full bg-slate-200 group-hover:bg-primary/40 mx-auto" />
                </div>
                {/* Right: Document Preview */}
                <aside
                    className="border-l border-slate-200 hidden lg:flex flex-col shrink-0"
                    style={{ width: previewPanelWidth }}
                >
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">description</span>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Document Preview</h3>
                            </div>
                        </div>
                        {complaintDraft && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-danger px-2 py-0.5 rounded animate-pulse">
                                    LIVE UPDATE
                                </span>
                                <button onClick={handleExportPDF} disabled={isExporting} className="p-1 rounded hover:bg-slate-50 disabled:opacity-50">
                                    <span className={`material-symbols-outlined text-slate-400 text-sm ${isExporting ? 'animate-spin' : ''}`}>
                                        {isExporting ? 'sync' : 'download'}
                                    </span>
                                </button>
                                <span className="text-xs text-slate-500">PDF</span>
                            </div>
                        )}
                    </div>

                    {complaintDraft ? (
                        <>
                            <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700">
                                <div className="border border-slate-200 rounded-xl p-6 space-y-4 bg-white">
                                    <div className="text-center space-y-1">
                                        <h4 className="font-bold text-sm">SURAT PENGADUAN MASYARAKAT</h4>
                                    </div>

                                    <div className="space-y-3 mt-6">
                                        <div>
                                            <p className="font-bold">Kepada Yth,</p>
                                            <p>{complaintDraft.recipient_title}</p>
                                            <p>{complaintDraft.recipient_office}</p>
                                        </div>

                                        <p className="font-bold mt-4">Perihal: {complaintDraft.subject}</p>

                                        <p className="leading-relaxed">
                                            {complaintDraft.violation_description}
                                        </p>

                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                            <p className="font-bold text-[10px] text-slate-500 uppercase">Detail:</p>
                                            <p><span className="font-semibold">Lokasi:</span> {complaintDraft.location}</p>
                                            <p><span className="font-semibold">Waktu:</span> {complaintDraft.time}</p>
                                            <p><span className="font-semibold">Jenis Pelanggaran:</span> {complaintDraft.violation_type}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                            <p className="font-bold text-[10px] text-slate-500 uppercase">Dasar Hukum:</p>
                                            <p className="italic">{complaintDraft.legal_basis}</p>
                                        </div>

                                        <p className="leading-relaxed">
                                            Besar harapan kami agar pihak berwenang segera melakukan investigasi dan penindakan sesuai hukum yang berlaku.
                                        </p>
                                    </div>

                                    <div className="pt-10 flex justify-end">
                                        <div className="text-center">
                                            <p>{new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</p>
                                            <div className="h-16" />
                                            <p className="font-bold underline">{complaintDraft.reporter_name || "Warga Pelapor"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-200">
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleWhatsAppCopy}
                                        className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">share</span>
                                        WhatsApp
                                    </button>
                                    <button
                                        onClick={handleStartShare}
                                        className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">map</span>
                                        Pin on Map
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-3 opacity-30">pending_actions</span>
                            <p className="text-xs leading-relaxed">
                                Once you draft a complaint with Bang Jaga, the formal document preview will appear here.
                            </p>
                        </div>
                    )}
                </aside>
            </main>

            {/* Mobile Document Preview Drawer Overlay */}
            {previewDrawerOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/20 z-30"
                    onClick={closePreviewDrawer}
                    aria-hidden
                />
            )}

            {/* Mobile Document Preview Drawer — top offset to sit below app navbar (same as Navbar mobile drawer) */}
            <aside
                className={`lg:hidden fixed top-[57px] right-0 bottom-0 z-40 w-full max-w-[min(28rem,100vw)] bg-white border-l border-slate-200 flex flex-col shadow-xl transition-transform duration-300 ${previewDrawerOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                aria-label="Document preview"
            >
                <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={closePreviewDrawer}
                            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                            aria-label="Hide document preview"
                        >
                            <span className="material-symbols-outlined text-2xl">chevron_right</span>
                        </button>
                        <span className="material-symbols-outlined text-primary shrink-0">description</span>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900">Document Preview</h3>
                            {hasUnseenPreviewChanges && (
                                <p className="text-[10px] text-primary font-semibold">Updated since you last viewed</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {hasUnseenPreviewChanges && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-primary px-2 py-0.5 rounded">
                                New
                            </span>
                        )}
                        {complaintDraft && (
                            <>
                                <button onClick={handleExportPDF} disabled={isExporting} className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-50">
                                    <span className={`material-symbols-outlined text-slate-500 text-lg ${isExporting ? "animate-spin" : ""}`}>download</span>
                                </button>
                                <span className="text-xs text-slate-500">PDF</span>
                            </>
                        )}
                    </div>
                </div>
                {complaintDraft ? (
                    <>
                        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700">
                            <div className="border border-slate-200 rounded-xl p-6 space-y-4 bg-white">
                                <div className="text-center space-y-1">
                                    <h4 className="font-bold text-sm">SURAT PENGADUAN MASYARAKAT</h4>
                                </div>
                                <div className="space-y-3 mt-6">
                                    <div>
                                        <p className="font-bold">Kepada Yth,</p>
                                        <p>{complaintDraft.recipient_title}</p>
                                        <p>{complaintDraft.recipient_office}</p>
                                    </div>
                                    <p className="font-bold mt-4">Perihal: {complaintDraft.subject}</p>
                                    <p className="leading-relaxed">{complaintDraft.violation_description}</p>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                        <p className="font-bold text-[10px] text-slate-500 uppercase">Detail:</p>
                                        <p><span className="font-semibold">Lokasi:</span> {complaintDraft.location}</p>
                                        <p><span className="font-semibold">Waktu:</span> {complaintDraft.time}</p>
                                        <p><span className="font-semibold">Jenis Pelanggaran:</span> {complaintDraft.violation_type}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                        <p className="font-bold text-[10px] text-slate-500 uppercase">Dasar Hukum:</p>
                                        <p className="italic">{complaintDraft.legal_basis}</p>
                                    </div>
                                    <p className="leading-relaxed">
                                        Besar harapan kami agar pihak berwenang segera melakukan investigasi dan penindakan sesuai hukum yang berlaku.
                                    </p>
                                </div>
                                <div className="pt-10 flex justify-end">
                                    <div className="text-center">
                                        <p>{new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</p>
                                        <div className="h-16" />
                                        <p className="font-bold underline">{complaintDraft.reporter_name || "Warga Pelapor"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 shrink-0">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleWhatsAppCopy}
                                    className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">share</span>
                                    WhatsApp
                                </button>
                                <button
                                    onClick={handleStartShare}
                                    className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">map</span>
                                    Pin on Map
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl mb-3 opacity-30">description</span>
                        <p className="text-xs leading-relaxed">
                            Once you draft a complaint with Bang Jaga, the formal document preview will appear here.
                        </p>
                    </div>
                )}
            </aside>

            {/* Share to Map Modal */}
            {shareModalStep !== null && (
                <ShareToMapModal
                    step={shareModalStep}
                    location={shareLocation}
                    locationLoading={shareLocationLoading}
                    locationError={shareLocationError}
                    onGetLocation={handleGetLocation}
                    summary={shareSummary}
                    setSummary={setShareSummary}
                    regionId={shareRegionId}
                    setRegionId={setShareRegionId}
                    consent={shareConsent}
                    setConsent={setShareConsent}
                    onClose={() => { setShareModalStep(null); setShareLocationError(false); }}
                    onFinalShare={handleConfirmShare}
                    isSharing={isSharing}
                />
            )}


            {/* Mobile Document Preview — rectangle tab sticking out from right edge */}
            {complaintDraft && (
                <button
                    onClick={openPreviewDrawer}
                    className="lg:hidden fixed right-0 top-[80%] -translate-y-1/2 z-30 w-12 h-16 rounded-l-xl bg-primary text-white shadow-lg hover:bg-primary-dark active:scale-[0.98] transition-all border border-r-0 border-primary-dark/30 flex flex-col items-center justify-center gap-0.5"
                    aria-label={hasUnseenPreviewChanges ? "Document preview (updated)" : "Document preview"}
                >
                    <span className="material-symbols-outlined text-3xl">description</span>
                    {hasUnseenPreviewChanges && (
                        <span className="absolute top-2 left-2 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white" aria-hidden />
                    )}
                </button>
            )}

        </div>
    );
}
