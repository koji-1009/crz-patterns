import { test, expect } from "@playwright/test";

// The CSS tooltip was reachable by pointer hover only, so keyboard users
// could never reveal it.
test("keyboard focus reveals the CSS tooltip", async ({ page }) => {
  await page.goto("components/tooltip");
  const trigger = page.locator("[data-tooltip]").first();
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await expect
    .poll(() =>
      trigger.evaluate((el) => getComputedStyle(el, "::after").opacity),
    )
    .toBe("1");
});
