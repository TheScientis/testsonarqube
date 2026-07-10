"use client";

import { useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { submitRagFeedback } from "@/app/actions/chat";
import { stripComplaintMarkers } from "@/lib/complaint-utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
    message: ChatMessageType;
    formatTime: (d: string) => string;
    isStreaming?: boolean;
}

export default function ChatMessage({ message, formatTime, isStreaming }: ChatMessageProps) {
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [correction, setCorrection] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);

    const handleFeedbackSubmit = async () => {
        if (!correction.trim() || hasSubmittedFeedback) return;
        setIsSubmitting(true);
        try {
            await submitRagFeedback(message.id, message.content, correction);
            setFeedbackOpen(false);
            setCorrection("");
            setHasSubmittedFeedback(true);
        } catch (e) {
            console.error("Feedback failed", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isAssistant = message.role === "assistant";
    const displayContent = stripComplaintMarkers(message.content);

    return (
        <div className={`flex gap-3 ${!isAssistant ? "flex-row-reverse" : ""}`}>
            <div
                className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${isAssistant ? "bg-orange-100" : "bg-slate-200"
                    }`}
            >
                <span className="material-symbols-outlined text-sm">
                    {isAssistant ? "pets" : "person"}
                </span>
            </div>
            <div className={`max-w-lg ${!isAssistant ? "text-right" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                    {!isAssistant && (
                        <span className="text-xs text-slate-400">{formatTime(message.created_at)}</span>
                    )}
                    <span className="text-sm font-semibold text-slate-700">
                        {isAssistant ? "Bang Jaga" : "You"}
                    </span>
                    {isAssistant && isStreaming && (
                        <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                    {isAssistant && !isStreaming && (
                        <span className="text-xs text-slate-400">{formatTime(message.created_at)}</span>
                    )}
                </div>
                <div
                    className={`rounded-2xl p-4 text-sm ${isAssistant
                        ? "bg-slate-50 border border-slate-100 text-slate-700 text-left"
                        : "bg-slate-100 text-slate-700 text-left"
                        }`}
                >
                    {isAssistant ? (
                        <div className="chat-markdown prose prose-sm prose-slate max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {displayContent}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <span className="whitespace-pre-line">{displayContent}</span>
                    )}
                    {isStreaming && <span className="inline-block w-1.5 h-4 bg-primary ml-1 animate-caret" />}
                </div>

                {isAssistant && message.id !== "temp-streaming" && (
                    <div className="flex justify-end mt-1.5 pt-1 border-t border-slate-100">
                        {hasSubmittedFeedback ? (
                            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                Reported
                            </span>
                        ) : (
                            <button
                                onClick={() => setFeedbackOpen(!feedbackOpen)}
                                className="text-[10px] font-medium text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[14px]">flag</span>
                                Report Inaccurate Law
                            </button>
                        )}
                    </div>
                )}

                {feedbackOpen && isAssistant && (
                    <div className="mt-2 bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <p className="text-xs font-bold text-slate-700">Suggest a correction for Bang Jaga:</p>
                        <textarea
                            value={correction}
                            onChange={e => setCorrection(e.target.value)}
                            placeholder="Contoh: Sebenarnya, Perda No. 3 Tahun 2013 sudah diperbarui menjadi..."
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none h-16"
                        />
                        <div className="flex gap-2 justify-end mt-1">
                            <button
                                onClick={() => setFeedbackOpen(false)}
                                disabled={isSubmitting}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFeedbackSubmit}
                                disabled={isSubmitting || !correction.trim()}
                                className="text-[10px] font-bold bg-primary text-white hover:bg-primary-dark transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50"
                            >
                                {isSubmitting ? "Submitting..." : "Submit Feedback"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
