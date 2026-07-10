import { type Locator, type Page } from "@playwright/test";

/**
 * Page Object Model for the Profile page.
 *
 * Encapsulates locators and low-level UI actions for `/profile`, including the
 * Watchdog Level card. Does NOT contain assertions — assertions belong in spec files.
 */
export class ProfilePage {
  readonly page: Page;

  /** Main content container. */
  readonly main: Locator;

  /** Watchdog Level card (gradient slate box with level name, XP, next level). */
  readonly watchdogLevelCard: Locator;

  /** Label "Watchdog Level" inside the card. */
  readonly watchdogLevelLabel: Locator;

  /** Level name in Indonesian (e.g. "Warga Baru", "Warga Aktif"). */
  readonly levelNameId: Locator;

  /** Level name in English (e.g. "New Citizen"). */
  readonly levelNameEn: Locator;

  /** XP count text (e.g. "0 XP"). */
  readonly xpText: Locator;

  /** "Next: ... (N XP left)" or "MAX LEVEL" text. */
  readonly nextLevelText: Locator;

  /** Progress bar fill (primary-colored bar; may be 0 width at 0 XP). */
  readonly progressBarFill: Locator;

  /** Progress bar track (gray container). */
  readonly progressBarTrack: Locator;

  /** "You are not logged in" message (when unauthenticated; not inside main). */
  readonly notLoggedInMessage: Locator;

  /** "Go to Login" button (when unauthenticated). */
  readonly goToLoginButton: Locator;

  /** Loading spinner (while profile is loading). */
  readonly loadingSpinner: Locator;

  /** "Engagement History" section heading (when logged in). */
  readonly engagementHistoryHeading: Locator;

  /** Empty state message in Engagement History when no activity. */
  readonly engagementHistoryEmptyMessage: Locator;

  /** Sign in CTA text when unauthenticated. */
  readonly signInToViewMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.main = page.locator("main");
    this.watchdogLevelCard = page.getByTestId("profile-watchdog-level-card");
    this.watchdogLevelLabel = page.getByTestId("profile-watchdog-level-label");
    this.levelNameId = page.getByTestId("profile-watchdog-level-name-id");
    this.levelNameEn = page.getByTestId("profile-watchdog-level-name-en");
    this.xpText = page.getByTestId("profile-watchdog-xp");
    this.nextLevelText = page.getByTestId("profile-watchdog-next-level");
    this.progressBarTrack = page.getByTestId("profile-watchdog-progress-track");
    this.progressBarFill = page.getByTestId("profile-watchdog-progress-fill");
    this.notLoggedInMessage = page.getByTestId("profile-not-logged-in-message");
    this.goToLoginButton = page.getByTestId("profile-go-to-login");
    this.loadingSpinner = page.getByTestId("profile-loading-spinner");
    this.engagementHistoryHeading = page.getByTestId("profile-engagement-history-heading");
    this.engagementHistoryEmptyMessage = page.getByTestId("profile-engagement-history-empty");
    this.signInToViewMessage = page.getByTestId("profile-sign-in-to-view-message");
  }

  /**
   * Navigate to the profile page and wait for main content (or not-logged-in state).
   */
  async goto(): Promise<void> {
    await this.page.goto("/profile");
    await this.page.waitForLoadState("networkidle");
    await this.loadingSpinner.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }

  /**
   * Reload the profile page and wait for content to settle (for XP recomputation).
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
    await this.loadingSpinner.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    await this.watchdogLevelCard.waitFor({ state: "visible", timeout: 15_000 });
  }

  /**
   * Returns the visible XP number from the card (e.g. "0", "50").
   * Assumes format "{number} XP" in the first span of the stats row.
   */
  async getXpNumber(): Promise<number> {
    const text = await this.xpText.textContent();
    const match = text?.trim().match(/^(\d+)\s*XP/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Returns the full "Next: ... (N XP left)" or "MAX LEVEL" string.
   */
  async getNextLevelText(): Promise<string> {
    return (await this.nextLevelText.textContent())?.trim() ?? "";
  }
}
