"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useModal } from "@/context/ModalContext";
import type { UserIdentity } from "@supabase/supabase-js";

interface LinkedAccountsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LinkedAccountsModal({ isOpen, onClose }: LinkedAccountsModalProps) {
    const [identities, setIdentities] = useState<UserIdentity[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const { showAlert, showConfirm } = useModal();

    const loadIdentities = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.identities) {
            setIdentities(user.identities);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadIdentities();
        }
    }, [isOpen, loadIdentities]);

    const handleLinkGoogle = async () => {
        setIsProcessing(true);
        const redirectUrl = typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?redirect=/profile`
            : undefined;

        const { error } = await supabase.auth.linkIdentity({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });

        if (error) {
            console.error(error);
            await showAlert("Link Failed", error.message);
            setIsProcessing(false);
        }
        // If successful, the user will be redirected away to Google OAuth flow.
    };

    const handleUnlink = async (identity: UserIdentity) => {
        if (identities.length <= 1) {
            await showAlert("Cannot Unlink", "You must have at least one identity linked to your account to sign in.");
            return;
        }

        const confirm = await showConfirm(
            "Unlink Account?",
            `Are you sure you want to unlink your ${identity.provider} identity?`
        );
        if (!confirm) return;

        setIsProcessing(true);
        const { error } = await supabase.auth.unlinkIdentity(identity);
        if (error) {
            console.error(error);
            await showAlert("Unlink Failed", error.message);
        } else {
            await loadIdentities(); // Refresh identities list
        }
        setIsProcessing(false);
    };

    if (!isOpen) return null;

    const hasGoogle = identities.some(i => i.provider === 'google');
    const hasEmail = identities.some(i => i.provider === 'email');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !isProcessing && onClose()} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                        <span className="material-symbols-outlined text-primary">link</span>
                        Linked Accounts
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-6">
                        Manage your connected sign-in providers here. Linking multiple accounts allows you to sign in through various methods using the same WIWOKDETOK profile.
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Email Provider */}
                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                        <span className="material-symbols-outlined">mail</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Email Address</p>
                                        <p className="text-xs text-slate-500">
                                            {hasEmail ? "Connected" : "Not connected"}
                                        </p>
                                    </div>
                                </div>
                                {hasEmail && (
                                    <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                                        Active
                                    </span>
                                )}
                            </div>

                            {/* Google Provider */}
                            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                        {/* Simple Google 'G' Icon */}
                                        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Google</p>
                                        <p className="text-xs text-slate-500">
                                            {hasGoogle ? "Connected" : "Not connected"}
                                        </p>
                                    </div>
                                </div>
                                {hasGoogle ? (
                                    <button
                                        onClick={() => handleUnlink(identities.find(i => i.provider === 'google')!)}
                                        disabled={isProcessing}
                                        className="text-xs font-bold text-slate-600 bg-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                                    >
                                        Unlink
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleLinkGoogle}
                                        disabled={isProcessing}
                                        className="text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {isProcessing ? "Loading..." : "Link"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
