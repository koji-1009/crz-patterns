import { test, expect } from "@playwright/test";

// Stand in for picsum.photos so the suite never depends on the network. It
// has to carry real dimensions: a 1x1 stub collapses the dialog and nothing
// laid out against the image can be clicked.
const stub = (w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#888"/></svg>`;

test.beforeEach(async ({ page }) => {
  await page.route("**://picsum.photos/**", (route) => {
    const m = route.request().url().match(/\/(\d+)\/(\d+)$/);
    const [w, h] = m ? [Number(m[1]), Number(m[2])] : [200, 200];
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: stub(w, h),
    });
  });
  await page.goto("components/lightbox");
});

test("a thumbnail opens the lightbox with that thumbnail's image", async ({
  page,
}) => {
  const dialog = page.locator("#lightbox");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Open image 3" }).click();

  await expect(dialog).toBeVisible();
  await expect(page.locator("#lightbox-img")).toHaveAttribute(
    "src",
    /seed\/3\/800\/600/,
  );
  await expect(page.locator("#lightbox-img")).toHaveAttribute(
    "alt",
    "Image 3",
  );
});

test("the image reports as loaded once it arrives", async ({ page }) => {
  await page.getByRole("button", { name: "Open image 1" }).click();
  await expect(page.locator("#lightbox-img")).toHaveClass(/loaded/);
});

test("opening a second thumbnail swaps the image", async ({ page }) => {
  await page.getByRole("button", { name: "Open image 2" }).click();
  await expect(page.locator("#lightbox-img")).toHaveAttribute(
    "src",
    /seed\/2\//,
  );
  await page.getByRole("button", { name: "Close image" }).click();
  await expect(page.locator("#lightbox")).toBeHidden();
  await page.getByRole("button", { name: "Open image 5" }).click();
  await expect(page.locator("#lightbox-img")).toHaveAttribute(
    "src",
    /seed\/5\//,
  );
});

// The lightbox had no close control at all, so on any browser that ignores
// closedby="any" it could not be dismissed.
test("the lightbox closes from its explicit close button", async ({ page }) => {
  await page.getByRole("button", { name: "Open image 1" }).click();
  await expect(page.locator("#lightbox")).toBeVisible();
  await page.getByRole("button", { name: "Close image" }).click();
  await expect(page.locator("#lightbox")).toBeHidden();
});

test("the lightbox closes on a click outside it", async ({ page }) => {
  await page.getByRole("button", { name: "Open image 1" }).click();
  const dialog = page.locator("#lightbox");
  await expect(dialog).toBeVisible();

  const box = (await dialog.boundingBox())!;
  await page.mouse.click(Math.max(4, box.x / 2), 4);

  await expect(dialog).toBeHidden();
});

test("the document is locked while the lightbox is open", async ({ page }) => {
  await page.getByRole("button", { name: "Open image 1" }).click();
  await expect(page.locator("#lightbox")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => getComputedStyle(document.documentElement).overflow,
      ),
    )
    .toBe("hidden");
});
