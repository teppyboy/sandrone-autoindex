import { expect, test } from "@playwright/test";

import {
  accountMenuButton,
  gotoRoot,
  openAccountMenu,
  openAuthSheet,
  signIn,
  TEST_PASSWORD,
  TEST_USERNAME,
} from "./helpers";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await gotoRoot(page);
  });

  test("shows the unauthenticated account menu initially", async ({ page }) => {
    await expect(accountMenuButton(page)).toBeVisible();
    await openAccountMenu(page);
    await expect(page.getByRole("menuitem", { name: "Sign in" })).toBeVisible();
  });

  test("opens the auth sheet from the account menu", async ({ page }) => {
    await openAuthSheet(page);
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await openAuthSheet(page);
    await page.getByLabel("Username").fill("wronguser");
    await page.getByLabel("Password").fill("wrongpass");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("dialog").getByText("Incorrect username or password."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "WebDAV Sign In" }),
    ).toBeVisible();
  });

  test("accepts valid credentials and shows authenticated controls", async ({ page }) => {
    await signIn(page);

    await expect(page.getByRole("button", { name: "New Folder" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New File" })).toBeVisible();
  });

  test("persists a remembered session in a new page", async ({ page, context }) => {
    await signIn(page, { remember: true });

    const secondPage = await context.newPage();
    await gotoRoot(secondPage);
    await expect(accountMenuButton(secondPage)).toHaveAttribute(
      "aria-label",
      new RegExp(`^Open account menu for ${TEST_USERNAME}$`),
    );
  });

  test("does not persist a non-remembered session in a new page", async ({
    page,
    context,
  }) => {
    await signIn(page, { remember: false });

    const secondPage = await context.newPage();
    await gotoRoot(secondPage);
    await openAccountMenu(secondPage);
    await expect(
      secondPage.getByRole("menuitem", { name: "Sign in" }),
    ).toBeVisible();
  });

  test("signs out successfully", async ({ page }) => {
    await signIn(page, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
    });

    await openAuthSheet(page);
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New Folder" })).toHaveCount(0);
  });
});
