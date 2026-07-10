"use client";

import { useState, useEffect } from "react";
import { getPromiseComments, commentOnPromise, flagPromiseComment } from "@/app/actions/promises";
import type { PromiseComment } from "@/lib/types";
import { useAuthGuard } from "@/context/AuthGuardContext";

interface CommentThreadProps {
    promiseId: string;
    commentCount: number;
    /** When provided, the trigger button is rendered via this callback (e.g. inside an action bar); thread still renders below. */
    renderTrigger?: (trigger: React.ReactNode) => React.ReactNode;
}

export default function CommentThread({ promiseId, commentCount, renderTrigger }: CommentThreadProps) {
    const [comments, setComments] = useState<PromiseComment[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");
    const [flaggedCommentIds, setFlaggedCommentIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const { requireAuth } = useAuthGuard();

    const loadComments = async (nextPage = 1) => {
        if (loaded && nextPage === 1) return;
        setLoading(true);
        const data = await getPromiseComments(promiseId, nextPage);
        setComments((prev) => nextPage === 1 ? data.comments : [...prev, ...data.comments]);
        setHasMore(data.hasMore);
        setPage(nextPage);
        setLoaded(true);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen && !loaded) {
            loadComments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const submitComment = async () => {
        if (!text.trim()) return;
        if (!requireAuth("comment on this promise")) return;

        setSubmitting(true);
        setError("");
        const result = await commentOnPromise(promiseId, text.trim());
        if (result.success && result.comment) {
            setComments((prev) => [...prev, result.comment!]);
            setText("");
            setError("");
        } else if (result.error) {
            setError(result.error);
        }
        setSubmitting(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitComment();
    };

    const handleFlagComment = async (commentId: string) => {
        if (!requireAuth("flag this comment")) return;
        if (flaggedCommentIds.has(commentId)) return;
        setFlaggedCommentIds((prev) => new Set(prev).add(commentId));
        await flagPromiseComment(commentId);
        setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, flag_count: c.flag_count + 1 } : c));
    };

    const timeAgo = (d: string) => {
        const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const displayCount = commentCount + comments.filter((c) => c.id.startsWith("c") && c.id.length > 5).length;
    const trigger = (
        <button
            data-testid="promise-card-comment"
            onClick={handleToggle}
            className="flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-primary hover:bg-slate-100 transition-all"
        >
            <span className="material-symbols-outlined text-base">chat_bubble</span>
            {displayCount}
        </button>
    );

    const threadContent = isOpen && (
        <div className="border-t border-slate-100 bg-slate-50/50">
            <div className="px-5 py-4">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : comments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">
                        No comments yet. Be the first to share your thoughts.
                    </p>
                ) : (
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                        {comments.map((c) => (
                            <div key={c.id} className="flex gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-slate-400 text-xs">person</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-800">{c.user_name}</span>
                                        <span className="text-[10px] text-slate-400">{timeAgo(c.created_at)}</span>
                                        {!c.hidden && c.flag_count < 5 && (
                                            <button
                                                onClick={() => handleFlagComment(c.id)}
                                                disabled={flaggedCommentIds.has(c.id)}
                                                className="ml-auto text-slate-300 hover:text-danger disabled:opacity-50 transition-colors"
                                                title="Flag comment as inappropriate"
                                                type="button"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">flag</span>
                                            </button>
                                        )}
                                    </div>
                                    {c.hidden || c.flag_count >= 5 ? (
                                        <p className="mt-0.5 text-xs italic text-slate-400">
                                            This comment has been removed for review.
                                        </p>
                                    ) : (
                                        <>
                                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{c.text}</p>
                                            {c.like_count > 0 && (
                                                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 mt-1">
                                                    <span className="material-symbols-outlined text-[10px]">thumb_up</span>
                                                    {c.like_count}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        {hasMore && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => void loadComments(page + 1)}
                                className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors border border-primary/10 mt-2"
                            >
                                {loading ? "Loading..." : "Load more comments"}
                            </button>
                        )}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value);
                            if (error) setError("");
                        }}
                        placeholder="Add a comment..."
                        maxLength={500}
                        className="flex-1 h-11 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!text.trim() || submitting}
                        className="h-11 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-40"
                    >
                        {submitting ? "..." : "Post"}
                    </button>
                </form>
                {error && (
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2">
                        <p className="text-xs text-danger" aria-live="polite">
                            {error}
                        </p>
                        <button
                            type="button"
                            onClick={() => void submitComment()}
                            disabled={!text.trim() || submitting}
                            className="shrink-0 text-xs font-bold text-danger hover:underline disabled:opacity-40"
                        >
                            Try again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    if (renderTrigger) {
        return (
            <>
                {renderTrigger(trigger)}
                {threadContent}
            </>
        );
    }

    return (
        <div>
            {trigger}
            {threadContent}
        </div>
    );
}
