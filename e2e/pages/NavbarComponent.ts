import { type Locator, type Page } from "@playwright/test";

/** Route segment for navbar links (path without leading slash). */
export type NavbarRoute = "promise-tracker" | "chat" | "map" | "feed";

/**
 * Page Object Model for the shared Navbar component.
 *
 * Provides locators and actions for the top navigation bar that appears on
 * most pages. Does NOT contain assertions.
 */
export class NavbarComponent {
  readonly page: Page;

  /** The WIWOKDETOK brand logo link (navigates to home). */
  readonly brandLink: Locator;

  /** Nav link: Evidence Feed (feed). */
  readonly feedLink: Locator;

  /** Nav link: The Talk Ledger (Promise Tracker). */
  readonly talkLedgerLink: Locator;

  /** Nav link: Bang Jaga AI (chat). */
  readonly bangJagaLink: Locator;

  /** Nav link: Walk-o-Meter (map). */
  readonly walkOMeterLink: Locator;

  /** Profile link (avatar, when authenticated). */
  readonly profileLink: Locator;

  /** Log In link. */
  readonly loginButton: Locator;

  /** Sign Up link. */
  readonly signUpButton: Locator;

  /** Mobile hamburger menu toggle button. */
  readonly mobileMenuToggle: Locator;

  constructor(page: Page) {
    this.page = page;

    this.brandLink = page.getByTestId("navbar-brand");
    this.feedLink = page.getByTestId("navbar-link-feed");
    this.talkLedgerLink = page.getByTestId("navbar-link-promise-tracker");
    this.bangJagaLink = page.getByTestId("navbar-link-chat");
    this.walkOMeterLink = page.getByTestId("navbar-link-map");
    this.profileLink = page.getByTestId("navbar-profile");
    this.loginButton = page.getByTestId("navbar-login");
    this.signUpButton = page.getByTestId("navbar-signup");
    this.mobileMenuToggle = page.getByTestId("navbar-mobile-toggle");
  }

  /**
   * Navigate to a page via the navbar by route.
   * @param route - Route segment (e.g. "promise-tracker", "chat", "map", "feed") or [label, route] for backward compatibility.
   */
  async navigateTo(route: NavbarRoute | string | [string, string]): Promise<void> {
    const segment = Array.isArray(route) ? route[1] : route;
    const testId = segment.startsWith("navbar-link-") ? segment : `navbar-link-${segment.replace(/^\//, "").replace(/\//g, "-") || "home"}`;
    await this.page.getByTestId(testId).click();
  }

  /**
   * Click the brand logo to navigate home.
   */
  async goHome(): Promise<void> {
    await this.brandLink.click();
  }

  /**
   * Open the mobile navigation drawer.
   */
  async openMobileMenu(): Promise<void> {
    await this.mobileMenuToggle.click();
  }
}
