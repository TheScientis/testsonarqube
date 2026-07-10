/**
 * WIWOKDETOK Gamification System
 * 7 Watchdog Levels with XP thresholds
 */

export interface WatchdogLevel {
    name: string;
    nameId: string; // Indonesian name
    minXP: number;
    icon: string;
}

export const WATCHDOG_LEVELS: WatchdogLevel[] = [
    { name: "New Citizen", nameId: "Warga Baru", minXP: 0, icon: "person" },
    { name: "Active Citizen", nameId: "Warga Aktif", minXP: 100, icon: "visibility" },
    { name: "Field Agent", nameId: "Agen Lapangan", minXP: 500, icon: "explore" },
    { name: "Inspector", nameId: "Inspektur", minXP: 1000, icon: "policy" },
    { name: "Senior Inspector", nameId: "Inspektur Senior", minXP: 2000, icon: "verified_user" },
    { name: "Watchdog Captain", nameId: "Kapten Pengawas", minXP: 5000, icon: "military_tech" },
    { name: "Environmental Guardian", nameId: "Penjaga Lingkungan", minXP: 10000, icon: "shield" },
];

/** XP rewards per action */
export const XP_REWARDS = {
    comment: 10,
    like: 2,
    follow: 5,
    flag: 15,
    report_verification: 50,
    report_complaint: 30,
    promise_submission: 40,
    daily_login: 5,
};

/** Calculate XP from activity counts */
export function calculateXP(activities: {
    comments: number;
    reports: number;
    verifications: number;
    likes: number;
    flags: number;
}): number {
    return (
        activities.comments * XP_REWARDS.comment +
        activities.reports * XP_REWARDS.report_complaint +
        activities.verifications * XP_REWARDS.report_verification +
        activities.likes * XP_REWARDS.like +
        activities.flags * XP_REWARDS.flag
    );
}

/** Get current level based on XP */
export function getWatchdogLevel(xp: number): WatchdogLevel {
    let level = WATCHDOG_LEVELS[0];
    for (const l of WATCHDOG_LEVELS) {
        if (xp >= l.minXP) level = l;
        else break;
    }
    return level;
}

/** Get next level info */
export function getNextLevel(xp: number): { level: WatchdogLevel; xpNeeded: number; progress: number } | null {
    const currentIdx = WATCHDOG_LEVELS.findIndex((l) => xp < l.minXP);
    if (currentIdx === -1) return null; // Max level reached
    const nextLevel = WATCHDOG_LEVELS[currentIdx];
    const prevXP = currentIdx > 0 ? WATCHDOG_LEVELS[currentIdx - 1].minXP : 0;
    const xpNeeded = nextLevel.minXP - xp;
    const progress = ((xp - prevXP) / (nextLevel.minXP - prevXP)) * 100;
    return { level: nextLevel, xpNeeded, progress };
}
