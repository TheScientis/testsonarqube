"use client";

import { useEffect } from "react";
import { shareComplaintToMap } from "@/app/actions/reports";

export default function SyncDrafts() {
    useEffect(() => {
        const syncDrafts = async () => {
            if (!navigator.onLine) return;

            try {
                const draftsJson = localStorage.getItem('wiwokdetok_drafts');
                if (!draftsJson) return;

                const drafts = JSON.parse(draftsJson);
                if (!Array.isArray(drafts) || drafts.length === 0) return;

                const pendingDrafts = [];

                // Try to sync each draft
                for (const draft of drafts) {
                    try {
                        const res = await shareComplaintToMap(draft);
                        if (!res.success) {
                            console.error("Failed to sync draft:", res.message);
                            pendingDrafts.push(draft);
                        } else {
                            console.log("Draft synced successfully!");
                        }
                    } catch (e) {
                        console.error("Error syncing draft", e);
                        pendingDrafts.push(draft);
                    }
                }

                if (pendingDrafts.length > 0) {
                    localStorage.setItem('wiwokdetok_drafts', JSON.stringify(pendingDrafts));
                } else {
                    localStorage.removeItem('wiwokdetok_drafts');
                }
            } catch (e) {
                console.error("Error parsing drafts:", e);
            }
        };

        // Try syncing on mount
        syncDrafts();

        // And try syncing when coming back online
        window.addEventListener('online', syncDrafts);
        return () => window.removeEventListener('online', syncDrafts);
    }, []);

    return null;
}
