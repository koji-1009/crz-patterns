import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("interaction/clipboard");
});

// Locate by class, not by accessible name: the name is what the click
// changes, so a name-based locator stops matching the button it just acted on.
test("each copy button reports back on its own", async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-write"]);
  }
  const buttons = page.locator(".copy-btn");
  await expect(buttons).toHaveCount(3);

  await buttons.nth(1).click();

  await expect(buttons.nth(1)).toHaveText("Copied!");
  await expect(buttons.nth(0)).toHaveText("Copy");
  await expect(buttons.nth(2)).toHaveText("Copy");
});

test("the label reverts after the timeout", async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-write"]);
  }
  const btn = page.locator(".copy-btn").first();
  await btn.click();
  await expect(btn).toHaveText("Copied!");
  await expect(btn).toHaveText("Copy", { timeout: 6_000 });
});

// A refused clipboard must still say something. Before this the rejection
// ended the handler and the button did nothing at all.
test("a refused clipboard write reports a failure instead of nothing", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error("denied")),
      },
    });
  });
  await page.reload();

  const btn = page.locator(".copy-btn").first();
  await btn.click();
  await expect(btn).toHaveText("Copy failed");
  await expect(btn).toHaveClass(/failed/);
});

// Reading the clipboard back needs a permission only Chromium grants here.
test("the --copy command writes the target's text to the clipboard", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "clipboard read permission is Chromium-only in this setup",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.locator(".copy-btn").nth(1).click();
  await expect(page.locator(".copy-btn").nth(1)).toHaveText("Copied!");

  const written = await page.evaluate(() => navigator.clipboard.readText());
  const shown = await page.locator("#snippet-shell").innerText();
  expect(written.trim()).toBe(shown.trim());
});

test("the extracted component emits its script once, not once per block", async ({
  page,
}) => {
  const count = await page.evaluate(
    () => document.querySelectorAll('script[type="module"]').length,
  );
  expect(count).toBe(1);
});
