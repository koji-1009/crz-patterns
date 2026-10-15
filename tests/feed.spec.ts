import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**://picsum.photos/**", (route) => route.abort());
});

test("scrolling the feed loads the next chunk", async ({ page }) => {
  await page.goto("extra/infinite-scroll");
  const box = page.locator("[data-feed-box]");
  await expect(box.getByText("Mountains #1", { exact: true })).toBeVisible();

  // Bring the first placeholder into view: it is what the observer watches.
  // Jumping straight to the bottom would skip past it without intersecting.
  await box.locator('li[data-state="skeleton"]').first().scrollIntoViewIfNeeded();
  await expect(box.getByText("Mountains #11", { exact: true })).toBeAttached();
});
