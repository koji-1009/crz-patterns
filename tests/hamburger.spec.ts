import { test, expect } from "@playwright/test";

// Both previews collapse to the hamburger below the container query's 768px
// breakpoint, which is what a phone sees — and what surfaced the stacking bug.
test.use({ viewport: { width: 390, height: 780 } });

test.beforeEach(async ({ page }) => {
  await page.goto("components/hamburger");
});

test("both previews show the hamburger at phone width", async ({ page }) => {
  await expect(page.locator(".demo-container .hamburger")).toHaveCount(2);
  for (const summary of await page.locator(".hamburger summary").all()) {
    await expect(summary).toBeVisible();
  }
});

// Reported on iOS: the open menu lost on the z axis to the preview below it.
test("the first preview's open menu paints above the preview below it", async ({
  page,
}) => {
  const firstMenu = page.locator(".demo-container.wide .hamburger");
  await firstMenu.locator("summary").click();

  const link = firstMenu.locator(".dropdown a").last();
  await expect(link).toBeVisible();

  const box = (await link.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  const hit = await page.evaluate(
    ([px, py]) => {
      const el = document.elementFromPoint(px as number, py as number);
      return {
        tag: el?.tagName ?? null,
        insideDropdown: !!el?.closest(".dropdown"),
      };
    },
    [x, y],
  );

  expect(hit.insideDropdown).toBe(true);
});

test("the menu link is actually clickable, not just painted", async ({
  page,
}) => {
  const firstMenu = page.locator(".demo-container.wide .hamburger");
  await firstMenu.locator("summary").click();
  const link = firstMenu.locator(".dropdown a").last();
  // Fails with a timeout if another element intercepts the pointer.
  await link.click({ timeout: 5_000 });
});

test("the menu closes again from its summary", async ({ page }) => {
  const firstMenu = page.locator(".demo-container.wide .hamburger");
  await firstMenu.locator("summary").click();
  await expect(firstMenu).toHaveAttribute("open", "");
  await firstMenu.locator("summary").click();
  await expect(firstMenu).not.toHaveAttribute("open", "");
});

test("the hamburger page ships no page-level module script", async ({
  page,
}) => {
  const count = await page.evaluate(
    () => document.querySelectorAll('script[type="module"]').length,
  );
  expect(count).toBe(0);
});
