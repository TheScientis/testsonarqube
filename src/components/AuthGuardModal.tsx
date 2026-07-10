"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signInWithGoogle } from "@/lib/auth";

interface AuthGuardModalProps {
    isOpen: boolean;
    onClose: () => void;
    actionLabel?: string;
    redirectAfter?: string;
}

export default function AuthGuardModal({
    isOpen,
    onClose,
    actionLabel = "perform this action",
    redirectAfter,
}: AuthGuardModalProps) {
    const router = useRouter();
    const [mode, setMode] = useState<"prompt" | "login">("prompt");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const result = await signIn(email, password);
        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            setLoading(false);
            onClose();
            if (redirectAfter) router.push(redirectAfter);
            else router.refresh();
        }
    };

    const handleGoogleLogin = async () => {
        await signInWithGoogle(redirectAfter || window.location.pathname);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Bottom Sheet / Modal */}
            <div data-testid="auth-guard-modal" className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors z-10"
                >
                    <span className="material-symbols-outlined text-slate-500 text-lg">close</span>
                </button>

                {mode === "prompt" ? (
                    <div className="p-6 sm:p-8 text-center">
                        {/* Icon */}
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-primary text-3xl">lock</span>
                        </div>

                        <h2 className="text-xl font-black text-slate-900 mb-2">
                            Sign in Required
                        </h2>
                        <p className="text-sm text-slate-500 mb-6">
                            You need to sign in to {actionLabel}. Join WIWOKDETOK to help track political accountability.
                        </p>

                        {/* Google OAuth */}
                        <button
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-3 h-12 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all mb-3 shadow-sm"
                        >
                            <svg width="18" height="18" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            </svg>
                            Continue with Google
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-xs text-slate-400 font-medium">or</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        {/* Email login */}
                        <button
                            onClick={() => setMode("login")}
                            className="w-full h-12 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                        >
                            Sign in with Email
                        </button>

                        <p className="text-xs text-slate-400 mt-4">
                            Don&apos;t have an account?{" "}
                            <button
                                onClick={() => {
                                    onClose();
                                    router.push(`/register${redirectAfter ? `?redirect=${encodeURIComponent(redirectAfter)}` : ""}`);
                                }}
                                className="text-primary font-bold hover:underline"
                            >
                                Sign up
                            </button>
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="p-6 sm:p-8">
                        <button
                            type="button"
                            onClick={() => setMode("prompt")}
                            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Back
                        </button>

                        <h2 className="text-xl font-black text-slate-900 mb-6">
                            Sign in with Email
                        </h2>

                        {error && (
                            <div data-testid="auth-error-message" className="bg-danger/10 text-danger text-sm font-medium px-4 py-2.5 rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                                <input
                                    data-testid="auth-email-input"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                                <input
                                    data-testid="auth-password-input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            data-testid="auth-login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 mt-6 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
