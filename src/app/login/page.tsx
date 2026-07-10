"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signInWithGoogle } from "@/lib/auth";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { error: authError } = await signIn(email, password);
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-[900px] bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
                {/* Left panel - Mascot (hidden on mobile) */}
                <div className="hidden md:flex bg-gradient-to-b from-slate-800 to-slate-900 p-10 flex-col items-center justify-center text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.15),transparent_70%)]" />
                    <div className="relative z-10">
                        <div className="w-48 h-48 mx-auto mb-6 bg-slate-700/50 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-8xl text-primary">pets</span>
                        </div>
                        <h2 className="text-3xl font-black leading-tight">
                            Selamat Datang,
                            <br />
                            Watchdog.
                        </h2>
                        <p className="mt-4 text-slate-300 text-sm max-w-xs mx-auto">
                            Akses command center Anda untuk memantau, melaporkan, dan menjaga akuntabilitas
                            lingkungan.
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
                            <div className="size-4 text-primary">
                                <svg fill="currentColor" viewBox="0 0 48 48">
                                    <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" />
                                </svg>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">WIWOKDETOK</span>
                        </div>
                    </div>
                </div>

                {/* Right panel - Form */}
                <div className="p-10 flex flex-col justify-center">
                    <h1 className="text-2xl font-black text-slate-900">Masuk ke Akun</h1>
                    <p className="text-sm text-slate-500 mt-2">
                        Lanjutkan perjuangan mengawal kebijakan lingkungan.
                    </p>

                    {error && (
                        <div data-testid="auth-error-message" className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                            {error}
                        </div>
                    )}

                    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                                    mail
                                </span>
                                <input
                                    data-testid="auth-email-input"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="contoh@email.com"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-sm font-semibold text-slate-700">Password</label>
                                <Link href="#" data-testid="auth-lupa-password" className="text-sm text-primary font-semibold hover:underline">
                                    Lupa Password?
                                </Link>
                            </div>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                                    lock
                                </span>
                                <input
                                    data-testid="auth-password-input"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                                <button
                                    type="button"
                                    data-testid="auth-password-visibility-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <span className="material-symbols-outlined text-lg">
                                        {showPassword ? "visibility" : "visibility_off"}
                                    </span>
                                </button>
                            </div>
                        </div>
                        <button
                            data-testid="auth-login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
                        >
                            {loading ? "Signing in..." : "Masuk"}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs text-slate-400">Atau lanjutkan dengan</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <button
                        onClick={() => signInWithGoogle(redirectTo)}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-lg py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Google
                    </button>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        Belum punya akun?{" "}
                        <Link href="/register" className="text-primary font-semibold hover:underline">
                            Daftar sekarang
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
