import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("components/dialog");
});

const dismissible = (page: Page) => page.locator("#dialog-dismissible");
const persistent = (page: Page) => page.locator("#dialog-persistent");

test("the dismissible dialog opens from its command button", async ({
  page,
}) => {
  await expect(dismissible(page)).toBeHidden();
  await page.getByRole("button", { name: "Dismissible Dialog" }).click();
  await expect(dismissible(page)).toBeVisible();
});

// Reported on iOS: tapping around the dialog did not close it, because
// released Safari ignores closedby="any".
test("the dismissible dialog closes on a click outside it", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Dismissible Dialog" }).click();
  await expect(dismissible(page)).toBeVisible();

  const box = await dismissible(page).boundingBox();
  expect(box).not.toBeNull();
  // Well clear of the dialog box, so this lands on the backdrop.
  await page.mouse.click(Math.max(4, box!.x / 2), 4);

  await expect(dismissible(page)).toBeHidden();
});

test("a click inside the dismissible dialog's padding leaves it open", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Dismissible Dialog" }).click();
  const box = (await dismissible(page).boundingBox())!;
  // 4px inside the top-left corner: inside the box, but on padding rather
  // than on any child element.
  await page.mouse.click(box.x + 4, box.y + 4);
  await expect(dismissible(page)).toBeVisible();
});

test("the dismissible dialog closes from its own close button", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Dismissible Dialog" }).click();
  await dismissible(page).getByRole("button", { name: "Close" }).click();
  await expect(dismissible(page)).toBeHidden();
});

// closedby="none" is likewise ignored by released Safari, so this covers the
// attribute and the fallback alike.
test("the persistent dialog refuses Escape", async ({ page }) => {
  await page.getByRole("button", { name: "Persistent Dialog" }).click();
  await expect(persistent(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(persistent(page)).toBeVisible();
});

test("the persistent dialog refuses a click outside it", async ({ page }) => {
  await page.getByRole("button", { name: "Persistent Dialog" }).click();
  const box = (await persistent(page).boundingBox())!;
  await page.mouse.click(Math.max(4, box.x / 2), 4);
  await expect(persistent(page)).toBeVisible();
});

test("the persistent dialog closes from Cancel and from Confirm", async ({
  page,
}) => {
  for (const name of ["Cancel", "Confirm"]) {
    await page.getByRole("button", { name: "Persistent Dialog" }).click();
    await expect(persistent(page)).toBeVisible();
    await persistent(page).getByRole("button", { name }).click();
    await expect(persistent(page)).toBeHidden();
  }
});

// Reported on iOS: the page scrolled behind the open dialog.
test("the document is locked while a modal dialog is open", async ({
  page,
}) => {
  const overflowBefore = await page.evaluate(
    () => getComputedStyle(document.documentElement).overflow,
  );
  expect(overflowBefore).not.toBe("hidden");

  await page.getByRole("button", { name: "Dismissible Dialog" }).click();
  await expect(dismissible(page)).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(
        () => getComputedStyle(document.documentElement).overflow,
      ),
    )
    .toBe("hidden");

  await dismissible(page).getByRole("button", { name: "Close" }).click();
  await expect(dismissible(page)).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(
        () => getComputedStyle(document.documentElement).overflow,
      ),
    )
    .not.toBe("hidden");
});

test("the page scroll position does not move while a dialog is open", async ({
  page,
}) => {
  const scrollable = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight + 40,
  );
  test.skip(!scrollable, "viewport is taller than the page");

  await page.getByRole("button", { name: "Dismissible Dialog" }).click();
  await expect(dismissible(page)).toBeVisible();

  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => window.scrollY);

  expect(after).toBe(before);
});

/*
 * The behavioural tests above pass through whichever path the engine takes.
 * Every browser Playwright ships supports `closedby` natively, so they only
 * ever exercise that path — released Safari and iOS, which do not, are the
 * reason the layout fallback exists. These two tests pin the fallback itself.
 *
 * A synthetic MouseEvent drives listeners but never the browser's own light
 * dismiss, so it closes the dialog if and only if the fallback is wired.
 */
async function syntheticOutsideClick(page: Page) {
  await page.evaluate(() => {
    document.getElementById("dialog-dismissible")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: 2, clientY: 2 }),
    );
  });
}

test("the fallback closes the dialog where closedby is unsupported", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Present this engine as one that predates the attribute.
    delete (HTMLDialogElement.prototype as unknown as Record<string, unknown>)
      .closedBy;
  });
  await page.goto("components/dialog");

  await page.getByRole("button", { name: "Dismissible Dialog" }).click();
  await expect(dismissible(page)).toBeVisible();
  await syntheticOutsideClick(page);
  await expect(dismissible(page)).toBeHidden();
});

test("the fallback stays out of the way where closedby is supported", async ({
  page,
}) => {
  const supported = await page.evaluate(
    () => "closedBy" in HTMLDialogElement.prototype,
  );
  test.skip(!supported, "engine has no native closedby to defer to");

  await page.getByRole("button", { name: "Dismissible Dialog" }).click();
  await expect(dismissible(page)).toBeVisible();
  await syntheticOutsideClick(page);
  // No listener was installed, so nothing reacts to a synthetic click.
  await expect(dismissible(page)).toBeVisible();
});

test("the fallback refuses close requests for closedby=none", async ({
  page,
}) => {
  await page.addInitScript(() => {
    delete (HTMLDialogElement.prototype as unknown as Record<string, unknown>)
      .closedBy;
  });
  await page.goto("components/dialog");

  await page.getByRole("button", { name: "Persistent Dialog" }).click();
  await expect(persistent(page)).toBeVisible();

  const prevented = await page.evaluate(() => {
    const d = document.getElementById("dialog-persistent")!;
    const ev = new Event("cancel", { cancelable: true });
    d.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  expect(prevented).toBe(true);
  await expect(persistent(page)).toBeVisible();
});

// The pattern claims 0 KB of page JS; the dialogs are driven by markup alone.
test("the dialog page ships no page-level module script", async ({ page }) => {
  const count = await page.evaluate(
    () => document.querySelectorAll('script[type="module"]').length,
  );
  expect(count).toBe(0);
});
