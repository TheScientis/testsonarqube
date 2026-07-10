import { type Locator, type Page } from "@playwright/test";

const LABEL_TO_VALUE: Record<string, string> = {
  "All Promises": "all",
  "New Promises": "new_promise",
  "Progress Updates": "progress_update",
  Fulfillment: "fulfillment",
};

/**
 * Page Object Model for the Promise Tracker (The Talk Ledger) page.
 *
 * Encapsulates all locators and low-level UI actions for `/promise-tracker`.
 * This POM does NOT contain assertions — assertions belong in the spec files.
 */
export class PromiseTrackerPage {
  readonly page: Page;

  // ── Region: Search ──

  /** The search input for filtering promises by keyword. */
  readonly searchInput: Locator;

  // ── Region: Category Tabs ──

  /** Container for the category filter tab buttons. */
  readonly categoryTabsContainer: Locator;

  // ── Region: Feed State ──

  /** Skeleton loader placeholders shown while the feed is loading. */
  readonly skeletonCards: Locator;

  /** Empty-state message shown when no promises match the current filters. */
  readonly emptyStateMessage: Locator;

  /** "Clear Filters" button inside the empty state. */
  readonly clearFiltersButton: Locator;

  /** Region filter select. */
  readonly regionSelect: Locator;

  /** Year filter select. */
  readonly yearSelect: Locator;

  /** Status filter select. */
  readonly statusSelect: Locator;

  /** Submit New Promise button. */
  readonly submitNewButton: Locator;

  /** Load More button (visible when has_more). */
  readonly loadMoreButton: Locator;

  // ── Region: Promise Cards ──

  /** All rendered promise card `<article>` elements. */
  readonly promiseCards: Locator;

  constructor(page: Page) {
    this.page = page;

    this.searchInput = page.getByTestId("promise-tracker-search-input");
    this.categoryTabsContainer = page.getByTestId("promise-tracker-category-tabs");
    this.skeletonCards = page.getByTestId("promise-tracker-skeleton");
    this.emptyStateMessage = page.getByTestId("promise-tracker-empty-message");
    this.clearFiltersButton = page.getByTestId("promise-tracker-clear-filters");
    this.regionSelect = page.getByTestId("promise-tracker-region-select");
    this.yearSelect = page.getByTestId("promise-tracker-year-select");
    this.statusSelect = page.getByTestId("promise-tracker-status-select");
    this.submitNewButton = page.getByTestId("promise-tracker-submit-new");
    this.loadMoreButton = page.getByTestId("promise-tracker-load-more");
    this.promiseCards = page.getByTestId("promise-tracker-card");
  }

  // ── Navigation ──

  /**
   * Navigate to the Promise Tracker page and wait for hydration.
   */
  async goto(): Promise<void> {
    await this.page.goto("/promise-tracker");
    await this.page.waitForLoadState("networkidle");
  }

  // ── Search ──

  /**
   * Type a search query into the search input.
   * @param query - The search text to enter.
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /**
   * Clear the search input.
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.fill("");
  }

  // ── Category Tabs ──

  /**
   * Click a category tab by its visible label text.
   * @param label - e.g. "All Promises", "New Promises", "Progress Updates", "Fulfillment".
   */
  async selectCategory(label: string): Promise<void> {
    const value = LABEL_TO_VALUE[label] ?? label;
    await this.page.getByTestId(`promise-tracker-category-${value}`).click();
  }

  /**
   * Returns the currently-active category tab button.
   */
  getActiveTab(): Locator {
    return this.categoryTabsContainer.locator("button.bg-primary");
  }

  // ── Promise Cards ──

  /**
   * Returns a specific promise card by its zero-based index.
   * @param index - Zero-based card index.
   */
  getCardByIndex(index: number): Locator {
    return this.promiseCards.nth(index);
  }

  /**
   * Returns the card(s) that contain the given politician name.
   * @param name - Politician name to match.
   */
  getCardByPolitician(name: string): Locator {
    return this.promiseCards.filter({ hasText: name });
  }

  /**
   * Returns the politician name locator inside a card.
   */
  getPoliticianName(card: Locator): Locator {
    return card.getByTestId("promise-card-politician-name");
  }

  /**
   * Returns the first card that has an AI Summary toggle (cards with summary_what).
   */
  getFirstCardWithAiSummary(): Locator {
    return this.promiseCards.filter({ has: this.page.getByTestId("promise-card-ai-summary-toggle") }).first();
  }

  /**
   * Returns the first card that has Watchdog Commentary.
   */
  getFirstCardWithWatchdogCommentary(): Locator {
    return this.promiseCards.filter({ has: this.page.getByTestId("promise-card-watchdog-commentary") }).first();
  }

  /**
   * Returns the first card that has the Source Unavailable badge (404 source).
   */
  getFirstCardWithSourceUnavailable(): Locator {
    return this.promiseCards.filter({ has: this.page.getByTestId("promise-card-source-unavailable") }).first();
  }

  /**
   * Returns count of cards that have the Source Unavailable badge.
   */
  async getSourceUnavailableCardCount(): Promise<number> {
    return this.page.getByTestId("promise-card-source-unavailable").count();
  }

  /**
   * Returns the quote `<blockquote>` inside a given card locator.
   * @param card - A locator pointing to a single promise card.
   */
  getQuote(card: Locator): Locator {
    return card.getByTestId("promise-card-quote");
  }

  /**
   * Returns the Walk-o-Meter score text (e.g. "68%") inside a card.
   * @param card - A locator pointing to a single promise card.
   */
  getScoreText(card: Locator): Locator {
    return card.getByTestId("promise-card-score");
  }

  /**
   * Returns the Walk-o-Meter vote count text (e.g. "(156 votes)") inside a card.
   * @param card - A locator pointing to a single promise card.
   */
  getVoteCount(card: Locator): Locator {
    return card.getByTestId("promise-card-vote-count");
  }

  /**
   * Returns the category badge locator inside a card (e.g. "New Promise", "Progress", "Fulfillment").
   * @param card - A locator pointing to a single promise card.
   */
  getCategoryBadge(card: Locator): Locator {
    return card.getByTestId("promise-card-category-badge");
  }

  /**
   * Returns the "Source Unavailable" badge if present on a card.
   * @param card - A locator pointing to a single promise card.
   */
  getSourceUnavailableBadge(card: Locator): Locator {
    return card.getByTestId("promise-card-source-unavailable");
  }

  /**
   * Returns the Watchdog Commentary section inside a card.
   * @param card - A locator pointing to a single promise card.
   */
  getWatchdogCommentary(card: Locator): Locator {
    return card.getByTestId("promise-card-watchdog-commentary");
  }

  /**
   * Returns the source domain link text inside a card.
   * @param card - A locator pointing to a single promise card.
   */
  getSourceLink(card: Locator): Locator {
    return card.getByTestId("promise-card-source-link");
  }

  // ── AI Summary ──

  /**
   * Clicks the "AI Summary" toggle button on a card to expand or collapse it.
   * @param card - A locator pointing to a single promise card.
   */
  async toggleAiSummary(card: Locator): Promise<void> {
    await card.getByTestId("promise-card-ai-summary-toggle").click();
  }

  /**
   * Returns the expanded AI Summary container (WHAT/WHEN/BUDGET) inside a card.
   * @param card - A locator pointing to a single promise card.
   */
  getAiSummaryDetails(card: Locator): Locator {
    return card.getByTestId("promise-card-ai-summary-details");
  }

  // ── Action Bar ──

  /**
   * Returns the Like button locator inside a card's action bar.
   * @param card - A locator pointing to a single promise card.
   */
  getLikeButton(card: Locator): Locator {
    return card.getByTestId("promise-card-like");
  }

  /**
   * Returns the Comment button locator inside a card's action bar.
   * @param card - A locator pointing to a single promise card.
   */
  getCommentButton(card: Locator): Locator {
    return card.getByTestId("promise-card-comment");
  }

  /**
   * Returns the Share button locator inside a card's action bar.
   * @param card - A locator pointing to a single promise card.
   */
  getShareButton(card: Locator): Locator {
    return card.getByTestId("promise-card-share");
  }

  /**
   * Returns the Follow/Unfollow button locator inside a card's action bar.
   * @param card - A locator pointing to a single promise card.
   */
  getFollowButton(card: Locator): Locator {
    return card.getByTestId("promise-card-follow");
  }

  /**
   * Returns the Flag button locator inside a card's action bar.
   * @param card - A locator pointing to a single promise card.
   */
  getFlagButton(card: Locator): Locator {
    return card.getByTestId("promise-card-flag");
  }

  /**
   * Returns the Verify Evidence button locator inside a card.
   * @param card - A locator pointing to a single promise card.
   */
  getVerifyButton(card: Locator): Locator {
    return card.getByTestId("promise-card-verify");
  }

  /**
   * Clicks the Share button on a card.
   * @param card - A locator pointing to a single promise card.
   */
  async clickShare(card: Locator): Promise<void> {
    await this.getShareButton(card).click();
  }

  /**
   * Clicks the Like button on a card.
   * @param card - A locator pointing to a single promise card.
   */
  async clickLike(card: Locator): Promise<void> {
    await this.getLikeButton(card).click();
  }

  /**
   * Clicks the Follow button on a card.
   * @param card - A locator pointing to a single promise card.
   */
  async clickFollow(card: Locator): Promise<void> {
    await this.getFollowButton(card).click();
  }

  // ── Helpers ──

  /**
   * Waits for the feed to finish loading (skeletons disappear; cards or empty state render).
   * Handles empty state where no skeletons are rendered.
   */
  async waitForFeedLoaded(): Promise<void> {
    const skeletonHidden = this.skeletonCards.first().waitFor({ state: "hidden", timeout: 10_000 });
    const contentReady = this.page.waitForFunction(
      () => {
        const cards = document.querySelectorAll("[data-testid='promise-tracker-card']");
        const empty = document.querySelector("[data-testid='promise-tracker-empty-message']");
        return cards.length > 0 || empty !== null;
      },
      { timeout: 10_000 }
    );
    await Promise.race([skeletonHidden, contentReady]);
  }

  /**
   * Returns the total number of visible promise cards.
   */
  async getCardCount(): Promise<number> {
    return this.promiseCards.count();
  }
}
