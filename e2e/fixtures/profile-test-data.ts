/**
 * Test data and constants for Profile / Watchdog Level E2E tests.
 *
 * Level names and XP thresholds must match src/lib/gamification.ts (WATCHDOG_LEVELS, XP_REWARDS).
 */

/** First level: 0 XP. */
export const LEVEL_WARGA_BARU = "Warga Baru";
export const LEVEL_WARGA_BARU_EN = "New Citizen";

/** Second level: 100 XP. */
export const LEVEL_WARGA_AKTIF = "Warga Aktif";
export const LEVEL_WARGA_AKTIF_EN = "Active Citizen";

/** XP rewards per action (must match gamification.ts). */
export const XP_REWARDS = {
  comment: 10,
  like: 2,
  flag: 15,
  report_complaint: 30,
  report_verification: 50,
} as const;

/** Baseline XP and "next" text for a fresh user (0 XP). */
export const BASELINE = {
  xp: 0,
  levelNameId: LEVEL_WARGA_BARU,
  levelNameEn: LEVEL_WARGA_BARU_EN,
  nextText: `Next: ${LEVEL_WARGA_AKTIF} (100 XP left)`,
} as const;

/** XP needed to reach Warga Aktif. */
export const XP_TO_WARGA_AKTIF = 100;

/**
 * Generate a unique email for E2E registration (avoids collisions across runs).
 */
export function generateUniqueEmail(): string {
  const ts = Date.now();
  const r = Math.floor(Math.random() * 1e6);
  return `e2e-watchdog-${ts}-${r}@example.com`;
}

/**
 * Generate a fresh user payload for registration.
 */
export function generateFreshUser(): { name: string; email: string; password: string } {
  return {
    name: "E2E Watchdog User",
    email: generateUniqueEmail(),
    password: "TestPass123!",
  };
}
