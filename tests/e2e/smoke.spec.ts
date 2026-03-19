import { test, expect } from "@playwright/test";

import { accountMenuButton, gotoRoot, openSettingsSheet } from "./helpers";

test.describe("Smoke Tests", () => {
  test("page loads from nginx and renders enhanced UI", async ({ page }) => {
    await gotoRoot(page);

    // Verify nginx autoindex served the page
    await expect(page.locator("h1")).toContainText("Index of");

    // Verify React app mounted
    await expect(page.locator("#autoindex-root")).toBeVisible();

    // Verify header renders
    await expect(
      page.locator("header").getByText("Sandrone")
    ).toBeVisible();

    // Verify main content renders
    await expect(page.locator("main")).toBeVisible();
  });

  test("_autoindex directory is hidden from listing", async ({ page }) => {
    await gotoRoot(page);

    const autoindexLink = page.locator("main").getByRole("link", {
      name: "_autoindex",
    });
    await expect(autoindexLink).toHaveCount(0);
  });

  test("assets load from /_autoindex/ path", async ({ page }) => {
    await gotoRoot(page);

    await expect(
      page.locator('script[src="/_autoindex/assets/index.js"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('link[href="/_autoindex/assets/index.css"]'),
    ).toHaveCount(1);

    const [jsResponse, cssResponse] = await Promise.all([
      page.request.get("/_autoindex/assets/index.js"),
      page.request.get("/_autoindex/assets/index.css"),
    ]);

    expect(jsResponse.ok()).toBeTruthy();
    expect(cssResponse.ok()).toBeTruthy();
  });

  test("fixture files and directories appear in listing", async ({ page }) => {
    await gotoRoot(page);

    // Check for expected files from fixture
    await expect(page.getByRole("link", { name: "README.md" })).toBeVisible();
    await expect(page.getByRole("link", { name: "sample.txt" })).toBeVisible();

    // Check for expected directories
    await expect(page.getByRole("link", { name: "projects" })).toBeVisible();
    await expect(page.getByRole("link", { name: "docs" })).toBeVisible();
  });

  test("search field is present", async ({ page }) => {
    await gotoRoot(page);

    // Desktop search field
    const searchInput = page.locator('input[placeholder*="Filter"]');
    await expect(searchInput).toBeVisible();
  });

  test("account menu is accessible", async ({ page }) => {
    await gotoRoot(page);

    await expect(accountMenuButton(page)).toBeVisible();
  });

  test("theme toggle works", async ({ page }) => {
    await gotoRoot(page);

    const html = page.locator("html");

    // Check initial theme class
    const initialHasDark = await html.evaluate((el) =>
      el.classList.contains("dark")
    );

    await openSettingsSheet(page);

    await page
      .getByRole("button", { name: initialHasDark ? "Light" : "Dark" })
      .click();

    const finalHasDark = await html.evaluate((el) =>
      el.classList.contains("dark")
    );

    expect(finalHasDark).not.toBe(initialHasDark);
  });
});
