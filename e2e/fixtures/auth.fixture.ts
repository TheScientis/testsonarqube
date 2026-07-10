import { test as base } from "@playwright/test";
import { AuthPage } from "../pages/AuthPage";
import { generateFreshUser } from "./profile-test-data";

/**
 * Extended Playwright test fixture for Auth E2E tests.
 *
 * Provides:
 * - authPage: POM for login/register pages
 * - freshUser: Generated credentials for registration (does not register)
 *
 * Usage:
 * ```ts
 * import { test, expect } from "../fixtures/auth.fixture";
 * test("register", async ({ authPage, freshUser }) => {
 *   await authPage.gotoRegister();
 *   await authPage.fillRegisterForm(freshUser);
 *   await authPage.submitRegister();
 * });
 * ```
 */
export const test = base.extend<{
  authPage: AuthPage;
  freshUser: { name: string; email: string; password: string };
}>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },

  freshUser: async ({}, use) => {
    await use(generateFreshUser());
  },
});

export { expect } from "@playwright/test";
