"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp, signInWithGoogle } from "@/lib/auth";
import { getRegions } from "@/lib/regions";

function RegisterContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/";
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [region, setRegion] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { error: authError } = await signUp(email, password, name);
            if (authError) {
                setError(authError);
            } else {
                router.push(redirectTo);
            }
        } catch {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-8">
                <div className="size-6 text-primary">
                    <svg fill="currentColor" viewBox="0 0 48 48">
                        <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" />
                    </svg>
                </div>
                <span className="text-xl font-black tracking-tight text-slate-900">WIWOKDETOK</span>
            </div>

            <div className="w-full max-w-[900px] bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
                {/* Left panel - Benefits (hidden on mobile) */}
                <div className="hidden md:flex p-10 flex-col justify-center bg-slate-50 border-r border-slate-100">
                    <h3 className="text-xl font-bold text-slate-900 mb-8">Watchdog Benefits</h3>
                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary text-lg">policy</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">Track local promises</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Keep an eye on environmental commitments and ensure they are met by local
                                    authorities.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    description
                                </span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">Draft legal letters</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Use our templates to easily draft and submit formal complaints or legal
                                    inquiries.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary text-lg">
                                    notifications_active
                                </span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">Get real-time alerts</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Receive instant notifications on policy updates and critical environmental
                                    actions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right panel - Form */}
                <div className="p-10 flex flex-col justify-center relative">
                    <div className="absolute top-6 right-6 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <span className="text-xs font-semibold text-slate-700">Bang Jaga</span>
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-500 text-sm">person</span>
                        </div>
                    </div>

                    <h1 className="text-2xl font-black text-slate-900">Create an Account</h1>
                    <p className="text-sm text-slate-500 mt-2">
                        Join the civic technology environmental accountability platform today.
                    </p>

                    {error && (
                        <div data-testid="auth-error-message" className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                            {error}
                        </div>
                    )}

                    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Full Name
                            </label>
                            <input
                                data-testid="auth-name-input"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Rizky Adhiotomo"
                                required
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Email Address
                            </label>
                            <input
                                data-testid="auth-email-input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="rizky.adhi@example.com"
                                required
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Password
                            </label>
                            <input
                                data-testid="auth-password-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Primary Region
                            </label>
                            <select
                                data-testid="auth-region-select"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            >
                                <option value="">Select your primary region</option>
                                {getRegions().map((r) => (
                                    <option key={r.id} value={r.id}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            data-testid="auth-register-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-sm mt-2 disabled:opacity-50"
                        >
                            {loading ? "Creating account..." : "Buat Akun"}
                        </button>
                    </form>
                    <div className="my-4 flex items-center gap-4">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs text-slate-400">or</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <button
                        onClick={() => signInWithGoogle(redirectTo)}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary font-semibold hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <RegisterContent />
        </Suspense>
    );
}
