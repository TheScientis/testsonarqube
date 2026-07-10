"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useDataSaver } from "@/context/DataSaverContext";
import { useAuthGuard } from "@/context/AuthGuardContext";
import { useTranslations } from "@/context/I18nContext";

// Command Center (/) and Profile (/profile) omitted: accessible via logo and profile image
const navLinksData = [
    { href: "/promise-tracker", key: "promise_tracker", icon: "fact_check" },
    { href: "/chat", key: "chat", icon: "smart_toy" },
    { href: "/map", key: "map", icon: "speed" },
    { href: "/feed", key: "feed", icon: "list_alt" },
];

type NavbarProps = { rightExtra?: React.ReactNode };

export default function Navbar({ rightExtra }: NavbarProps = {}) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { dataSaver, toggleDataSaver } = useDataSaver();
    const { isAuthenticated, user } = useAuthGuard();
    const { t, locale, setLocale } = useTranslations();

    const navLinks = navLinksData.map(l => ({ ...l, label: t(`nav.${l.key}`) }));

    // Check active state — exact match for "/" and startsWith for others
    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userName = (user as any)?.user_metadata?.full_name || (user as any)?.email?.split("@")[0] || "User";
    const userInitial = userName.charAt(0).toUpperCase();

    return (
        <>
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8 lg:px-10 py-3 sticky top-0 z-50">
                {/* Left: Hamburger (mobile) + Logo + Brand */}
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        data-testid="navbar-mobile-toggle"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-50 transition-colors"
                        aria-label="Toggle navigation menu"
                    >
                        <span className="material-symbols-outlined text-slate-700 text-2xl">
                            {mobileOpen ? "close" : "menu"}
                        </span>
                    </button>
                    <Link href="/" className="flex items-center gap-2.5 text-slate-900" data-testid="navbar-brand">
                        <div className="size-6 text-primary">
                            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 42.4379C4 42.4379 14.0962 36.0744 24 41.1692C35.0664 46.8624 44 42.2078 44 42.2078L44 7.01134C44 7.01134 35.068 11.6577 24.0031 5.96913C14.0971 0.876274 4 7.27094 4 7.27094L4 42.4379Z" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-bold leading-tight tracking-tight">WIWOKDETOK</h1>
                    </Link>
                </div>

                {/* Center: Desktop Nav — all links visible */}
                <nav className="hidden lg:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const active = isActive(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                data-testid={`navbar-link-${link.href.replace(/^\//, "").replace(/\//g, "-") || "home"}`}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active
                                    ? "text-primary bg-primary/5 font-bold"
                                    : "text-slate-600 hover:text-primary hover:bg-slate-50"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* Data-Saver toggle (desktop only) */}
                    <button
                        onClick={toggleDataSaver}
                        className="hidden xl:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xs text-slate-500">eco</span>
                        <span className="text-xs font-medium text-slate-500">{t("nav.data_saver")}</span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${dataSaver ? 'bg-primary' : 'bg-slate-200'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-all ${dataSaver ? 'left-4' : 'left-0'}`} />
                        </div>
                    </button>

                    {/* Optional right slot (e.g. chat document preview on mobile) */}
                    {rightExtra != null ? <div className="lg:hidden flex items-center">{rightExtra}</div> : null}

                    {/* Language Switcher */}
                    <button
                        onClick={() => setLocale(locale === "id" ? "en" : "id")}
                        className="flex flex-col items-center justify-center w-9 h-9 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                        title={locale === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia"}
                    >
                        <span className="text-[10px] font-black leading-none text-slate-700">{locale.toUpperCase()}</span>
                    </button>

                    {/* Auth-dependent UI — avatar always visible for profile nav; name from sm up */}
                    {isAuthenticated ? (
                        <Link
                            href="/profile"
                            data-testid="navbar-profile"
                            className="flex items-center gap-2 bg-slate-50 px-2 sm:px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors shrink-0"
                            title={userName}
                        >
                            {(user as any)?.user_metadata?.avatar_url ? (
                                <img src={(user as any).user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                                    {userInitial}
                                </div>
                            )}
                            <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate hidden sm:inline">{userName}</span>
                        </Link>
                    ) : (
                        <div className="hidden md:flex items-center gap-2">
                            <Link
                                href="/login"
                                data-testid="navbar-login"
                                className="flex items-center justify-center rounded-lg h-9 px-4 bg-transparent hover:bg-slate-50 text-slate-900 text-sm font-bold border border-slate-200 transition-colors"
                            >
                                {t("nav.login")}
                            </Link>
                            <Link
                                href="/register"
                                data-testid="navbar-signup"
                                className="flex items-center justify-center rounded-lg h-9 px-4 bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-sm transition-colors"
                            >
                                {t("nav.signup")}
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            {/* Mobile nav drawer */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 top-[57px] z-40 flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    {/* Drawer */}
                    <nav className="relative w-72 max-w-[80vw] bg-white shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
                        <div className="flex-1 overflow-y-auto py-4">
                            {navLinks.map((link) => {
                                const active = isActive(link.href);
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        data-testid={`navbar-link-${link.href.replace(/^\//, "").replace(/\//g, "-") || "home"}`}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${active
                                            ? "text-primary bg-primary/5 font-bold border-l-4 border-primary"
                                            : "text-slate-700 hover:bg-slate-50 hover:text-primary border-l-4 border-transparent"
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-xl">{link.icon}</span>
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Mobile auth buttons */}
                        <div className="border-t border-slate-200 p-4 space-y-2">
                            {isAuthenticated ? (
                                <Link
                                    href="/profile"
                                    data-testid="navbar-profile"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 w-full rounded-lg h-10 px-3 bg-slate-50 text-slate-900 text-sm font-bold border border-slate-200 transition-colors"
                                >
                                    {(user as any)?.user_metadata?.avatar_url ? (
                                        <img src={(user as any).user_metadata.avatar_url} alt="Profile" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                                            {userInitial}
                                        </div>
                                    )}
                                    {userName}
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        data-testid="navbar-login"
                                        onClick={() => setMobileOpen(false)}
                                        className="flex items-center justify-center w-full rounded-lg h-10 bg-transparent text-slate-900 text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
                                    >
                                        {t("nav.login")}
                                    </Link>
                                    <Link
                                        href="/register"
                                        data-testid="navbar-signup"
                                        onClick={() => setMobileOpen(false)}
                                        className="flex items-center justify-center w-full rounded-lg h-10 bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-sm transition-colors"
                                    >
                                        {t("nav.signup")}
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </>
    );
}
