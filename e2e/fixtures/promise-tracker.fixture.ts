import { test as base } from "@playwright/test";
import { PromiseTrackerPage } from "../pages/PromiseTrackerPage";
import { NavbarComponent } from "../pages/NavbarComponent";

/**
 * Extended Playwright test fixture that pre-instantiates the
 * PromiseTrackerPage POM and NavbarComponent for every test.
 *
 * Usage in spec files:
 * ```ts
 * import { test, expect } from "../fixtures/promise-tracker.fixture";
 * ```
 */
export const test = base.extend<{
  promiseTracker: PromiseTrackerPage;
  navbar: NavbarComponent;
}>({
  /**
   * Provides a ready-to-use PromiseTrackerPage instance.
   * Navigates to /promise-tracker and waits for the feed before yielding.
   */
  promiseTracker: async ({ page }, use) => {
    const pt = new PromiseTrackerPage(page);
    await pt.goto();
    await pt.waitForFeedLoaded();
    await use(pt);
  },

  /**
   * Provides a NavbarComponent instance scoped to the current page.
   */
  navbar: async ({ page }, use) => {
    await use(new NavbarComponent(page));
  },
});

export { expect } from "@playwright/test";
