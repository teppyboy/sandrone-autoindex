import { expect, type Page } from "@playwright/test";

export const TEST_USERNAME = "testuser";
export const TEST_PASSWORD = "testpass";

export async function gotoRoot(page: Page) {
  await page.goto("/");
  await page.waitForSelector("#autoindex-root");
}

export function accountMenuButton(page: Page) {
  return page.getByRole("button", { name: /^Open account menu/ });
}

export async function openAccountMenu(page: Page) {
  await accountMenuButton(page).click();
}

export async function openAuthSheet(page: Page) {
  await openAccountMenu(page);
  await page
    .getByRole("menuitem", { name: /^(Sign in|WebDAV account)$/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "WebDAV Sign In" }),
  ).toBeVisible();
}

export async function openSettingsSheet(page: Page) {
  const settingsButton = page.getByRole("button", { name: "Open settings" });
  const accountButton = accountMenuButton(page);
  let hasAccountMenu = false;

  try {
    await expect(accountButton).toBeVisible({ timeout: 10000 });
    hasAccountMenu = true;
  } catch {
    hasAccountMenu = false;
  }

  if (hasAccountMenu) {
    await openAccountMenu(page);
    await page.getByRole("menuitem", { name: "Settings" }).click();
  } else {
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();
  }

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}

export async function signIn(
  page: Page,
  options?: {
    username?: string;
    password?: string;
    remember?: boolean;
  },
) {
  const username = options?.username ?? TEST_USERNAME;
  const password = options?.password ?? TEST_PASSWORD;
  const remember = options?.remember ?? true;

  await openAuthSheet(page);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);

  const rememberCheckbox = page.getByRole("checkbox", { name: /Remember me/i });
  if ((await rememberCheckbox.isChecked()) !== remember) {
    await rememberCheckbox.click();
  }

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(accountMenuButton(page)).toHaveAttribute(
    "aria-label",
    new RegExp(`^Open account menu for ${username}$`),
  );
}

export function entryRow(page: Page, name: string) {
  return page
    .locator(".entry-row", {
      has: page.getByRole("link", { name }),
    })
    .first();
}
