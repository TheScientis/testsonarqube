/**
 * Test data constants for the Promise Tracker (The Talk Ledger) E2E tests.
 *
 * Uses dynamic assertions where possible — tests read from the DOM instead of
 * hardcoding expected values, so they work with any Supabase data.
 */

// ── Category Labels (as displayed in the UI tab buttons) ──

export const CATEGORY_LABELS = {
  ALL: "All Promises",
  NEW: "New Promises",
  PROGRESS: "Progress Updates",
  FULFILLMENT: "Fulfillment",
} as const;

// ── Search Queries ──

export const SEARCH_QUERIES = {
  /** Returns zero results (used for empty-state tests). */
  NO_RESULTS: "xyznonexistent999",
} as const;

// ── Category badge patterns (for dynamic assertion) ──

export const CATEGORY_BADGE_PATTERN = /New Promise|Progress|Fulfillment/i;
