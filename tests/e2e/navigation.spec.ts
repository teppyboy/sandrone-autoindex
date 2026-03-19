import { test, expect } from "@playwright/test";

import { gotoRoot } from "./helpers";

test.describe("Navigation Tests", () => {
  test.beforeEach(async ({ page }) => {
    await gotoRoot(page);
  });

  test("clicking a directory navigates and updates breadcrumbs", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "projects" }).click();
    await page.waitForURL(/\/projects\//);

    expect(page.url()).toContain("/projects/");

    const breadcrumb = page.locator('nav[aria-label="Directory path"]');
    await expect(breadcrumb.getByRole("link", { name: "Root" })).toBeVisible();
    await expect(breadcrumb.getByText("projects")).toBeVisible();

    await expect(page.getByRole("link", { name: "alpha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "beta" })).toBeVisible();
    await expect(page.getByRole("link", { name: "archive" })).toBeVisible();
  });

  test("navigating deeper into directory tree", async ({ page }) => {
    await page.getByRole("link", { name: "projects" }).click();
    await page.waitForURL(/\/projects\//);

    await page.getByRole("link", { name: "alpha" }).click();
    await page.waitForURL(/\/projects\/alpha\//);

    const breadcrumb = page.locator('nav[aria-label="Directory path"]');
    await expect(breadcrumb.getByRole("link", { name: "Root" })).toBeVisible();
    await expect(breadcrumb.getByRole("link", { name: "projects" })).toBeVisible();
    await expect(breadcrumb.getByText("alpha")).toBeVisible();

    await expect(page.getByRole("link", { name: "config.json" })).toBeVisible();
  });

  test("breadcrumb navigation works", async ({ page }) => {
    await page.getByRole("link", { name: "projects" }).click();
    await page.waitForURL(/\/projects\//);

    await page.getByRole("link", { name: "alpha" }).click();
    await page.waitForURL(/\/projects\/alpha\//);

    const breadcrumb = page.locator('nav[aria-label="Directory path"]');
    await breadcrumb.getByRole("link", { name: "projects" }).click();
    await page.waitForURL(/\/projects\//);

    await expect(page.getByRole("link", { name: "alpha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "beta" })).toBeVisible();
  });

  test("parent directory (..) link works", async ({ page }) => {
    await page.getByRole("link", { name: "projects" }).click();
    await page.waitForURL(/\/projects\//);

    await page.locator("main").getByRole("link", { name: ".." }).click();
    await page.waitForURL(/^[^/]+\/\/[^/]+\/$/);

    await expect(page.getByRole("link", { name: "projects" })).toBeVisible();
    await expect(page.getByRole("link", { name: "docs" })).toBeVisible();
  });

  test("browser back button restores previous listing", async ({ page }) => {
    await page.getByRole("link", { name: "projects" }).click();
    await page.waitForURL(/\/projects\//);

    await page.getByRole("link", { name: "alpha" }).click();
    await page.waitForURL(/\/projects\/alpha\//);

    await page.goBack();
    await page.waitForURL(/\/projects\//);

    await expect(page.getByRole("link", { name: "alpha" })).toBeVisible();

    await page.goBack();
    await page.waitForURL(/^[^/]+\/\/[^/]+\/$/);

    await expect(page.getByRole("link", { name: "projects" })).toBeVisible();
  });

  test("browser forward button works after going back", async ({ page }) => {
    await page.getByRole("link", { name: "projects" }).click();
    await page.waitForURL(/\/projects\//);

    await page.goBack();
    await page.waitForURL(/^[^/]+\/\/[^/]+\/$/);

    await page.goForward();
    await page.waitForURL(/\/projects\//);

    await expect(page.getByRole("link", { name: "alpha" })).toBeVisible();
  });

  test("search clears when navigating to another directory", async ({ page }) => {
    await page.goto("/projects/");

    const searchInput = page.locator('input[placeholder*="Filter"]');
    await searchInput.fill("alpha");

    await expect(page.getByRole("link", { name: "alpha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "beta" })).not.toBeVisible();

    await page.locator("main").getByRole("link", { name: ".." }).click();
    await page.waitForURL(/^[^/]+\/\/[^/]+\/$/);

    await expect(searchInput).toHaveValue("");
  });
});
