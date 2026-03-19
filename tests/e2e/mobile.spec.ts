import { test, expect } from "@playwright/test";

import {
  accountMenuButton,
  gotoRoot,
  openAuthSheet,
  openSettingsSheet,
  TEST_PASSWORD,
  TEST_USERNAME,
  signIn,
} from "./helpers";

test.describe("Mobile Experience", () => {
  test.beforeEach(async ({ page }) => {
    await gotoRoot(page);
  });

  test("should render mobile layout correctly", async ({ page }) => {
    await expect(page.locator("header")).toBeVisible();

    const entries = page.locator(".entry-row, .entry-card").first();
    await expect(entries).toBeVisible();
  });

  test("should show mobile search sheet", async ({ page }) => {
    const searchButton = page.getByRole("button", { name: "Open search" });
    await searchButton.click();

    const mobileSearch = page.getByPlaceholder("Filter files...");
    await expect(mobileSearch).toBeVisible();

    await mobileSearch.fill("README");
    await page.getByRole("button", { name: "Done" }).click();

    await expect(page.getByRole("link", { name: "README.md" })).toBeVisible();
    await expect(page.getByRole("link", { name: "sample.txt" })).not.toBeVisible();
  });

  test("should navigate using breadcrumbs on mobile", async ({ page }) => {
    await page.getByRole("link", { name: "docs" }).click();
    await page.waitForURL(/\/docs\//);

    const breadcrumb = page.locator('nav[aria-label="Directory path"]');
    await expect(breadcrumb).toBeVisible();

    await expect(breadcrumb.getByText("docs")).toBeVisible();

    await breadcrumb.getByRole("link", { name: "Root" }).click();
    await page.waitForURL(/^[^/]+\/\/[^/]+\/$/);

    await expect(page.getByRole("link", { name: "docs" })).toBeVisible();
  });

  test("should open settings sheet on mobile", async ({ page }) => {
    await openSettingsSheet(page);
    await expect(page.getByText("Appearance")).toBeVisible();
    await expect(page.getByText("Layout")).toBeVisible();
  });

  test("should switch view mode on mobile", async ({ page }) => {
    await openSettingsSheet(page);

    const gridButton = page.getByRole("button", { name: "Grid" });
    await gridButton.click();

    await page.keyboard.press('Escape');

    await expect(page.locator(".entry-card").first()).toBeVisible();
  });

  test("should sign in on mobile", async ({ page }) => {
    await openAuthSheet(page);
    await expect(page.locator(".h-1\\.5.w-10.rounded-full")).toBeVisible();

    await page.getByLabel("Username").fill(TEST_USERNAME);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(accountMenuButton(page)).toHaveAttribute(
      "aria-label",
      /Open account menu for testuser/,
    );
  });

  test("should create folder on mobile", async ({ page }) => {
    await signIn(page);

    await page.getByRole("button", { name: "New Folder" }).click();
    await expect(page.getByRole("heading", { name: "New Folder" })).toBeVisible();

    const folderName = `mobile-folder-${Date.now()}`;
    await page.getByLabel("Folder name").fill(folderName);

    await page.getByRole("button", { name: "Create Folder" }).click();

    await expect(
      page.getByRole("heading", { name: "New Folder" }),
    ).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: folderName })).toBeVisible({
      timeout: 5000,
    });
  });

  test("should use browser back button after navigation", async ({ page }) => {
    await page.getByRole("link", { name: "docs" }).click();
    await page.waitForURL(/\/docs\//);

    await expect(page.getByRole("link", { name: "guide.md" })).toBeVisible();

    await page.goBack();
    await page.waitForURL(/^[^/]+\/\/[^/]+\/$/);

    await expect(page.getByRole("link", { name: "docs" })).toBeVisible();
  });
});
