"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * /chat/[sessionId] — redirects to /chat?session={sessionId}
 * The main chat page handles loading the appropriate session.
 */
export default function ChatSessionPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const router = useRouter();

    useEffect(() => {
        if (sessionId) {
            router.replace(`/chat?session=${sessionId}`);
        } else {
            router.replace("/chat");
        }
    }, [sessionId, router]);

    return (
        <div className="flex h-screen items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
}
