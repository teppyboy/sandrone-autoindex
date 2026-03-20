import { expect, test, type Page } from "@playwright/test";

import { entryRow, gotoRoot, signIn } from "./helpers";

test.describe("WebDAV Operations", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await gotoRoot(page);
    await signIn(page);
  });

  test("shows file operation buttons when authenticated", async ({ page }) => {
    await expect(page.getByRole("button", { name: "New Folder" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New File" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload" })).toBeVisible();
  });

  test("creates a new folder", async ({ page }) => {
    const folderName = `test-folder-${Date.now()}`;

    await createFolder(page, folderName);

    await expect(page.getByRole("link", { name: folderName })).toBeVisible({
      timeout: 5000,
    });
  });

  test("creates a new file", async ({ page }) => {
    const fileName = `test-file-${Date.now()}.txt`;

    await page.getByRole("button", { name: "New File" }).click();
    await page.getByLabel("File name").fill(fileName);
    await page.getByRole("button", { name: "Create File" }).click();

    await expect(
      page.getByRole("heading", { name: "New Text File" }),
    ).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("link", { name: fileName })).toBeVisible({
      timeout: 5000,
    });
  });

  test("renames a folder", async ({ page }) => {
    const originalName = `rename-test-${Date.now()}`;
    const newName = `renamed-${Date.now()}`;

    await createFolder(page, originalName);
    await openEntryActions(page, originalName);
    await page.getByRole("menuitem", { name: "Rename" }).click();

    const renameInput = page.getByLabel("New name");
    await renameInput.fill(newName);
    await page.getByRole("button", { name: "Rename" }).click();

    await expect(page.getByRole("heading", { name: "Rename" })).not.toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("link", { name: newName })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole("link", { name: originalName })).toHaveCount(0);
  });

  test("deletes a folder", async ({ page }) => {
    const folderName = `delete-test-${Date.now()}`;

    await createFolder(page, folderName);
    await openEntryActions(page, folderName);
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByRole("heading", { name: "Delete" })).not.toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("link", { name: folderName })).toHaveCount(0);
  });

  test("moves a folder to a subdirectory", async ({ page }) => {
    const folderName = `move-test-${Date.now()}`;

    await createFolder(page, folderName);
    await openEntryActions(page, folderName);
    await page.getByRole("menuitem", { name: "Move" }).click();

    await expect(page.getByRole("heading", { name: "Move" })).toBeVisible();
    await page.getByRole("button", { name: "docs" }).click();
    await page.getByRole("button", { name: "Move", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Move" })).not.toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("link", { name: folderName })).toHaveCount(0);

    await page.getByRole("link", { name: "docs" }).click();
    await page.waitForURL(/\/docs\//);
    await expect(page.getByRole("link", { name: folderName })).toBeVisible({
      timeout: 5000,
    });
  });
});

async function createFolder(page: Page, folderName: string) {
  await page.getByRole("button", { name: "New Folder" }).click();
  await page.getByLabel("Folder name").fill(folderName);
  await page.getByRole("button", { name: "Create Folder" }).click();

  await expectSheetToClose(page, "New Folder");
  await expect(page.getByRole("link", { name: folderName })).toBeVisible({
    timeout: 5000,
  });
}

async function openEntryActions(page: Page, name: string) {
  const row = entryRow(page, name);
  await row.hover();
  await row.getByRole("button", { name: `Actions for ${name}` }).click();
}

async function expectSheetToClose(page: Page, headingName: string) {
  const dialog = page.getByRole("dialog", { name: headingName });
  const errorText = dialog.locator(".text-destructive span").first();

  try {
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  } catch (error) {
    if (await errorText.isVisible().catch(() => false)) {
      const message = (await errorText.textContent())?.trim() ?? "Unknown WebDAV error";
      throw new Error(`${headingName} failed: ${message}`);
    }

    throw error;
  }
}
