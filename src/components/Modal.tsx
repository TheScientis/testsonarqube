"use client";

import { useEffect, useRef, useState } from "react";

export type ModalType = "alert" | "confirm" | "prompt";

export interface ModalProps {
    isOpen: boolean;
    type: ModalType;
    title: string;
    description?: string;
    inputPlaceholder?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (value?: string) => void;
    onCancel: () => void;
}

export default function Modal({
    isOpen,
    type,
    title,
    description,
    inputPlaceholder,
    confirmText = "OK",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
}: ModalProps) {
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset input and focus it when opened as a prompt
    useEffect(() => {
        if (isOpen) {
            setInputValue("");
            if (type === "prompt" && inputRef.current) {
                setTimeout(() => inputRef.current?.focus(), 50); // Small delay for enter animation
            }
        }
    }, [isOpen, type]);

    if (!isOpen) return null;

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        onConfirm(type === "prompt" ? inputValue : undefined);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>

                    {description && (
                        <p className="text-sm text-slate-500 mb-4">{description}</p>
                    )}

                    {type === "prompt" && (
                        <form onSubmit={handleSubmit} className="mt-2 text-left">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={inputPlaceholder}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </form>
                    )}
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    {type !== "alert" && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors focus:ring-2 focus:ring-slate-300 outline-none"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm shadow-primary/20 transition-all focus:ring-2 focus:ring-primary/30 outline-none"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
