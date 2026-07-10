import { test as base } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { ProfilePage } from "../pages/ProfilePage";
import { PromiseTrackerPage } from "../pages/PromiseTrackerPage";
import { generateFreshUser } from "./profile-test-data";

/**
 * Extended Playwright test fixture for Profile / Watchdog Level E2E tests.
 *
 * Provides:
 * - authPage: POM for login/register
 * - profilePage: POM for /profile (watchdog card, etc.)
 * - freshUser: Registers a unique user and yields { name, email, password }; session is logged in
 * - xpActions: Helpers to perform XP-generating actions on Promise Tracker (comment, like, flag)
 *
 * Usage:
 * ```ts
 * import { test, expect } from "../fixtures/profile.fixture";
 * test("baseline", async ({ profilePage, freshUser }) => {
 *   // freshUser already registered and logged in
 *   await profilePage.goto();
 *   await expect(profilePage.watchdogLevelCard).toContainText("Warga Baru");
 * });
 * ```
 */
export const test = base.extend<{
  authPage: AuthPage;
  profilePage: ProfilePage;
  freshUser: { name: string; email: string; password: string };
    xpActions: {
      addCommentOnFirstPromise(text: string): Promise<void>;
      likeFirstPromise(): Promise<void>;
      flagFirstPromise(): Promise<void>;
      flagPromiseByIndex(cardIndex: number): Promise<void>;
    };
}>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },

  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },

  /**
   * Registers a new user with a unique email and yields credentials.
   * After the fixture runs, the session is logged in (redirected away from /register).
   */
  freshUser: async ({ page, authPage }, use) => {
    const user = generateFreshUser();
    await authPage.gotoRegister();
    await authPage.fillRegisterForm(user);
    await authPage.submitRegister();
    await use(user);
  },

  /**
   * Helpers to perform XP-generating actions on the Promise Tracker.
   * Requires the user to be logged in. Each method navigates to /promise-tracker and performs one action.
   */
  xpActions: async ({ page }, use) => {
    const pt = new PromiseTrackerPage(page);
    const actions = {
      async addCommentOnFirstPromise(text: string) {
        await pt.goto();
        await pt.waitForFeedLoaded();
        const card = pt.getCardByIndex(0);
        await pt.getCommentButton(card).click();
        await page.getByPlaceholder("Add a comment...").fill(text);
        await page.getByRole("button", { name: "Post" }).click();
        await page.waitForTimeout(500);
      },
      async likeFirstPromise() {
        await pt.goto();
        await pt.waitForFeedLoaded();
        await pt.clickLike(pt.getCardByIndex(0));
        await page.waitForTimeout(300);
      },
      async flagFirstPromise() {
        await pt.goto();
        await pt.waitForFeedLoaded();
        await pt.getFlagButton(pt.getCardByIndex(0)).click();
        await page.waitForTimeout(300);
      },
      async flagPromiseByIndex(cardIndex: number) {
        await pt.goto();
        await pt.waitForFeedLoaded();
        await pt.getFlagButton(pt.getCardByIndex(cardIndex)).click();
        await page.waitForTimeout(300);
      },
    };
    await use(actions);
  },
});

export { expect } from "@playwright/test";
