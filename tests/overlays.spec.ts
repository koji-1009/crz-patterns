import { test, expect } from "@playwright/test";

test.describe("toast", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("components/toast");
  });

  test("each button shows its own toast through the command event", async ({
    page,
  }) => {
    const toast = page.locator("#toast");

    await page.getByRole("button", { name: "Error" }).click();
    await expect(toast).toBeVisible();
    await expect(toast).toHaveAttribute("data-type", "error");
    await expect(toast.locator("[data-toast-msg]")).toHaveText(
      "Something went wrong.",
    );
  });

  test("a second button swaps the toast rather than stacking one", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Success" }).click();
    await expect(page.locator("#toast")).toHaveAttribute("data-type", "success");
    await page.getByRole("button", { name: "Info" }).click();
    await expect(page.locator("#toast")).toHaveAttribute("data-type", "info");
  });

  test("the toast hides itself again", async ({ page }) => {
    await page.getByRole("button", { name: "Success" }).click();
    await expect(page.locator("#toast")).toBeVisible();
    await expect(page.locator("#toast")).toBeHidden({ timeout: 8_000 });
  });

  test("the toast closes from its own close button", async ({ page }) => {
    await page.getByRole("button", { name: "Error" }).click();
    await expect(page.locator("#toast")).toBeVisible();
    await page.getByRole("button", { name: "Close notification" }).click();
    await expect(page.locator("#toast")).toBeHidden();
  });
});

// The triggers are declarative, so they work before any script runs. The
// overlays they open must then still be complete and closable on their own.
test.describe("without the script", () => {
  test.use({ javaScriptEnabled: false });

  test("the toast opens with a message and closes again", async ({ page }) => {
    await page.goto("components/toast");
    await page.getByRole("button", { name: "Error" }).click();
    const toast = page.locator("#toast");
    await expect(toast).toBeVisible();
    await expect(toast.locator("[data-toast-msg]")).not.toBeEmpty();
    await page.getByRole("button", { name: "Close notification" }).click();
    await expect(toast).toBeHidden();
  });

  test("the loading overlay can be left", async ({ page }) => {
    await page.goto("components/loading-overlay");
    await page.getByRole("button", { name: "Execute Action" }).click();
    await expect(page.locator("#overlay")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("#overlay")).toBeHidden();
  });
});

test.describe("loading overlay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("components/loading-overlay");
    await page.selectOption("#cfg-delay", "300");
    await page.selectOption("#cfg-after", "overlay");
  });

  test("the execute button opens the overlay and it reaches a result", async ({
    page,
  }) => {
    await page.selectOption("#cfg-result", "success");
    await page.getByRole("button", { name: "Execute Action" }).click();

    const overlay = page.locator("#overlay");
    await expect(overlay).toBeVisible();
    await expect(page.locator("#overlay-cancel")).toBeHidden();
    await expect(page.locator("#overlay-loading")).toBeVisible();
    await expect(page.locator("#overlay-success")).toBeVisible();
  });

  test("the overlay refuses Escape while it is up", async ({ page }) => {
    await page.selectOption("#cfg-delay", "3000");
    await page.getByRole("button", { name: "Execute Action" }).click();
    await expect(page.locator("#overlay")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#overlay")).toBeVisible();
  });

  test("the overlay refuses a click outside it", async ({ page }) => {
    await page.selectOption("#cfg-delay", "3000");
    await page.getByRole("button", { name: "Execute Action" }).click();
    await expect(page.locator("#overlay")).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(page.locator("#overlay")).toBeVisible();
  });

  test("the result's close button dismisses the overlay", async ({ page }) => {
    await page.selectOption("#cfg-result", "success");
    await page.getByRole("button", { name: "Execute Action" }).click();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.locator("#overlay")).toBeHidden();
  });

  test("the error path reaches its own dismiss control", async ({ page }) => {
    await page.selectOption("#cfg-result", "error");
    await page.getByRole("button", { name: "Execute Action" }).click();
    await expect(page.locator("#overlay-error")).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.locator("#overlay")).toBeHidden();
  });

  test("navigating on completion lands on a real page carrying the status", async ({
    page,
  }) => {
    await page.selectOption("#cfg-after", "navigate");
    await page.selectOption("#cfg-result", "success");
    await page.getByRole("button", { name: "Execute Action" }).click();

    await page.waitForURL(/\?status=complete/);
    await expect(page.locator("#state-complete")).toBeVisible();
    await expect(page.locator("#state-idle")).toBeHidden();
  });
});
