"use client";

import Navbar from "@/components/Navbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserActivity } from "@/app/actions/profile";
import { getUserPreferences, saveUserPreferences, type UserPreferences } from "@/app/actions/preferences";
import { calculateXP, getWatchdogLevel, getNextLevel } from "@/lib/gamification";
import { useModal } from "@/context/ModalContext";
import LinkedAccountsModal from "@/components/LinkedAccountsModal";
import { getRegions, getRegionLabel } from "@/lib/regions";

export default function ProfilePage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [activities, setActivities] = useState<any[]>([]);
    const [xp, setXp] = useState(0);
    const [isVerifiedCitizen, setIsVerifiedCitizen] = useState(false);
    const [prefs, setPrefs] = useState<UserPreferences | null>(null);
    const [isLinkedAccountsOpen, setIsLinkedAccountsOpen] = useState(false);
    const [showRegionPicker, setShowRegionPicker] = useState(false);
    const router = useRouter();
    const { showPrompt, showConfirm, showAlert } = useModal();

    useEffect(() => {
        async function loadUser() {
            const currentUser = await getCurrentUser();
            console.log("currentUser", currentUser);
            if (currentUser) {
                setUser(currentUser);

                const [commentsRes, reportsRes] = await Promise.all([
                    supabase.from('promise_comments').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(5),
                    supabase.from('walk_o_meter_reports').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(5)
                ]);

                const combined = [];
                if (commentsRes.data) {
                    combined.push(...commentsRes.data.map(c => ({
                        type: 'comment',
                        title: 'Commented on Promise',
                        desc: c.text,
                        time: new Date(c.created_at).toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
                        rawTime: new Date(c.created_at).getTime(),
                        icon: 'chat_bubble',
                        iconColor: 'text-slate-500',
                        iconBg: 'bg-slate-100',
                        badges: []
                    })));
                }
                if (reportsRes.data) {
                    combined.push(...reportsRes.data.map(r => ({
                        type: 'report',
                        title: r.report_type === 'promise_verification' ? `Verified Evidence (${r.vote?.toUpperCase()})` : 'Submitted Complaint',
                        desc: r.description,
                        time: new Date(r.created_at).toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
                        rawTime: new Date(r.created_at).getTime(),
                        icon: r.report_type === 'promise_verification' ? 'verified' : 'description',
                        iconColor: 'text-primary',
                        iconBg: 'bg-primary/10',
                        badges: r.report_type === 'promise_verification' ? [{ label: "Verified", color: "bg-primary/10 text-primary" }] : []
                    })));
                }

                combined.sort((a, b) => b.rawTime - a.rawTime);
                setActivities(combined.slice(0, 5));

                // Fetch real XP data
                const activityCounts = await getUserActivity(currentUser.id);
                setXp(calculateXP(activityCounts));
                setIsVerifiedCitizen(activityCounts.reports >= 3);

                // Fetch Preferences
                const p = await getUserPreferences(currentUser.id);
                setPrefs(p);
            }
            setLoading(false);
        }
        loadUser();
    }, []);

    const handleTogglePref = async (key: keyof UserPreferences) => {
        if (!prefs || !user) return;
        const newPrefs = { ...prefs, [key]: !prefs[key] };
        setPrefs(newPrefs);
        await saveUserPreferences(newPrefs);
    };

    const availableRegions = getRegions().filter((r) => !prefs?.regions_of_interest?.includes(r.id));

    const handleAddRegion = async (regionId: string) => {
        if (!prefs || !user) return;
        const newPrefs = { ...prefs, regions_of_interest: [...prefs.regions_of_interest, regionId] };
        setPrefs(newPrefs);
        await saveUserPreferences(newPrefs);
        setShowRegionPicker(false);
    };

    const handleRemoveRegion = async (idx: number) => {
        if (!prefs || !user) return;
        const confirmed = await showConfirm("Remove Region", "Are you sure you want to remove this region of interest?");
        if (!confirmed) return;
        const newRegions = [...prefs.regions_of_interest];
        newRegions.splice(idx, 1);
        const newPrefs = { ...prefs, regions_of_interest: newRegions };
        if (prefs.default_region_id && prefs.regions_of_interest[idx] === prefs.default_region_id) {
            newPrefs.default_region_id = newRegions[0] ?? null;
        }
        setPrefs(newPrefs);
        await saveUserPreferences(newPrefs);
    };

    const handleDefaultRegionChange = async (regionId: string) => {
        if (!prefs || !user) return;
        const value = regionId === "" ? null : regionId;
        const newPrefs = { ...prefs, default_region_id: value ?? null };
        setPrefs(newPrefs);
        await saveUserPreferences(newPrefs);
    };

    const handleUpdateEmail = async () => {
        const email = await showPrompt("Update Email", "Enter your new email address:", "user@example.com");
        if (!email) return;
        const { error } = await supabase.auth.updateUser({ email });
        if (error) await showAlert("Update Failed", "Error updating email: " + error.message);
        else await showAlert("Email Sent", "A confirmation email has been sent to your new address.");
    };

    const handleUpdatePassword = async () => {
        const password = await showPrompt("Update Password", "Enter your new password:");
        if (!password) return;
        const { error } = await supabase.auth.updateUser({ password });
        if (error) await showAlert("Update Failed", "Error updating password: " + error.message);
        else await showAlert("Password Updated", "Your password has been updated successfully.");
    };

    const handleManageLinkedAccounts = () => {
        setIsLinkedAccountsOpen(true);
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/login");
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="flex-1 flex justify-center items-center min-h-[50vh]">
                    <div data-testid="profile-loading-spinner" className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            </>
        );
    }

    if (!user) {
        return (
            <>
                <Navbar />
                <div className="flex-1 flex flex-col justify-center items-center py-20">
                    <span className="material-symbols-outlined text-6xl text-slate-300">account_circle</span>
                    <h2 data-testid="profile-not-logged-in-message" className="text-xl font-bold mt-4">You are not logged in</h2>
                    <p data-testid="profile-sign-in-to-view-message" className="text-slate-500 mt-2">Sign in to view your profile and activities.</p>
                    <button data-testid="profile-go-to-login" onClick={() => router.push("/login")} className="mt-6 px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark">
                        Go to Login
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <LinkedAccountsModal isOpen={isLinkedAccountsOpen} onClose={() => setIsLinkedAccountsOpen(false)} />
            <main className="flex-1 w-full max-w-[1200px] mx-auto p-6 md:p-8 lg:p-10 flex flex-col gap-8">
                {/* Profile Header */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-start gap-6">
                    <div className="w-28 h-28 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border-4 border-white shadow-lg overflow-hidden">
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-400 text-5xl">person</span>
                        )}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            {user?.user_metadata?.full_name || "Watchdog User"}
                            {isVerifiedCitizen && (
                                <span className="material-symbols-outlined text-primary" title="Verified Citizen (Verified phone & 3+ reports)">verified</span>
                            )}
                        </h1>
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-sm">mail</span> {user.email || "No email provided"}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-primary" /> Member since {new Date(user.created_at || Date.now()).getFullYear()}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                                <span className="material-symbols-outlined text-xs">location_on</span> Indonesia
                            </span>
                        </div>
                    </div>
                    {/* Watchdog Level */}
                    {(() => {
                        const level = getWatchdogLevel(xp);
                        const next = getNextLevel(xp);
                        return (
                            <div data-testid="profile-watchdog-level-card" className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-5 min-w-[240px]">
                                <p data-testid="profile-watchdog-level-label" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Watchdog Level</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="material-symbols-outlined text-primary text-lg">{level.icon}</span>
                                    <h3 data-testid="profile-watchdog-level-name-id" className="text-lg font-bold">{level.nameId}</h3>
                                </div>
                                <p data-testid="profile-watchdog-level-name-en" className="text-xs text-slate-500 mt-0.5">{level.name}</p>
                                <div className="flex items-center justify-between text-xs text-slate-400 mt-3">
                                    <span data-testid="profile-watchdog-xp">{xp} XP</span>
                                    {next ? (
                                        <span data-testid="profile-watchdog-next-level">Next: {next.level.nameId} ({next.xpNeeded} XP left)</span>
                                    ) : (
                                        <span data-testid="profile-watchdog-next-level">MAX LEVEL</span>
                                    )}
                                </div>
                                <div data-testid="profile-watchdog-progress-track" className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                    <div data-testid="profile-watchdog-progress-fill" className="bg-primary h-2 rounded-full transition-all" style={{ width: `${next ? next.progress : 100}%` }} />
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left: Engagement History */}
                    <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 data-testid="profile-engagement-history-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">history</span> Engagement History
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">Your recent civic actions and tracking contributions.</p>
                            </div>
                            <button className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                Filter <span className="material-symbols-outlined text-[14px]">tune</span>
                            </button>
                        </div>
                        <div className="space-y-6">
                            {activities.length > 0 ? (
                                activities.map((act, i) => (
                                    <HistoryItem key={i} icon={act.icon} iconColor={act.iconColor} iconBg={act.iconBg} title={act.title} desc={act.desc} time={act.time} badges={act.badges} />
                                ))
                            ) : (
                                <div className="text-center py-6 text-slate-500 text-sm">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inbox</span>
                                    <p data-testid="profile-engagement-history-empty">No recent activity. Start engaging by verifying promises or submitting complaints!</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 text-center">
                            <button className="text-primary text-sm font-bold hover:underline">Load More Activity</button>
                        </div>
                    </div>

                    {/* Right: Preferences + Account */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        {/* Preference Center */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-slate-500">tune</span> Preference Center
                            </h2>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Default region</label>
                                <p className="text-xs text-slate-500 mb-2">Used for Bang Jaga and verification when a single region is needed.</p>
                                <select
                                    value={prefs?.default_region_id ?? ""}
                                    onChange={(e) => handleDefaultRegionChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                >
                                    <option value="">First region of interest</option>
                                    {getRegions().map((r) => (
                                        <option key={r.id} value={r.id}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-slate-700">Regions of Interest</span>
                                </div>
                                <div className="space-y-2 mb-4">
                                    {prefs?.regions_of_interest.map((region, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 group">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-slate-400 text-sm">location_city</span>
                                                {getRegionLabel(region) ?? region}
                                            </div>
                                            <button onClick={() => handleRemoveRegion(idx)} className="text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                    {showRegionPicker ? (
                                        <div className="space-y-2">
                                            <p className="text-xs text-slate-500">Choose a region:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {availableRegions.map((r) => (
                                                    <button key={r.id} type="button" onClick={() => handleAddRegion(r.id)} className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
                                                        {r.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <button type="button" onClick={() => setShowRegionPicker(false)} className="text-xs text-slate-500 hover:text-slate-700">
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setShowRegionPicker(true)} disabled={availableRegions.length === 0} className="w-full flex items-center justify-center gap-1 text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg py-2 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                            + Add Region
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Notification Triggers</h4>
                                <div className="space-y-3">
                                    <ToggleItem label="Critical Action Gaps" desc="Alerts when promises miss targets by >30%" checked={!!prefs?.notify_critical_gaps} onChange={() => handleTogglePref("notify_critical_gaps")} />
                                    <ToggleItem label="New Policy Announcements" desc="Updates in your regions of interest" checked={!!prefs?.notify_policy_updates} onChange={() => handleTogglePref("notify_policy_updates")} />
                                    <ToggleItem label="Weekly Digest" desc="Summary of environmental accountability" checked={!!prefs?.notify_weekly_digest} onChange={() => handleTogglePref("notify_weekly_digest")} />
                                </div>
                            </div>
                        </div>

                        {/* Account Controls */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-slate-500">manage_accounts</span> Account Controls
                            </h2>
                            <div className="space-y-3">
                                <AccountItem icon="mail" label="Email Address" value={user.email || "Not set"} action="Change" onClick={handleUpdateEmail} />
                                <AccountItem icon="key" label="Password" value={user.updated_at ? `Last updated ${new Date(user.updated_at).toLocaleDateString()}` : "Manage password"} action="Update" onClick={handleUpdatePassword} />
                                <AccountItem
                                    icon="link"
                                    label="Linked Accounts"
                                    value={user.identities && user.identities.length > 0 ? `${user.identities.length} connected` : "No external accounts"}
                                    action="Manage"
                                    onClick={handleManageLinkedAccounts}
                                />
                                {/* Manage regulations: hidden from UI; accessible only via direct link /admin/regulations */}
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                                <button data-testid="profile-sign-out" onClick={handleSignOut} className="text-danger text-sm font-bold hover:underline">Sign Out</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

function HistoryItem({ icon, iconColor, iconBg, title, desc, time, badges }: { icon: string; iconColor: string; iconBg: string; title: string; desc: string; time: string; badges: { label: string; color: string }[] }) {
    return (
        <div data-testid="profile-activity-item" className="flex gap-4">
            <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
                <span className={`material-symbols-outlined ${iconColor} text-lg`}>{icon}</span>
            </div>
            <div className="flex-1">
                <div className="flex items-start justify-between">
                    <h4 className="text-sm font-bold text-slate-900">{title}</h4>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">{time}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{desc}</p>
                {badges.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                        {badges.map((b) => (
                            <span key={b.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.color}`}>{b.label}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ToggleItem({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
    return (
        <div className="flex items-center justify-between cursor-pointer" onClick={onChange}>
            <div>
                <p className="text-sm font-medium text-slate-700 select-none">{label}</p>
                <p className="text-xs text-slate-400 select-none">{desc}</p>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? "bg-primary" : "bg-slate-200"}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
            </div>
        </div>
    );
}

function AccountItem({ icon, label, value, action, onClick }: { icon: string; label: string; value: string; action: string; onClick?: () => void }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-500 text-lg">{icon}</span>
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{value}</p>
            </div>
            <button onClick={onClick} className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-3 py-1 hover:bg-slate-50 transition-colors">{action}</button>
        </div>
    );
}
