import { test, expect } from "@playwright/test";

test.describe("draft persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("forms/draft");
  });

  // Reported: submitting navigated to a page that does not exist. The action
  // was an absolute "/forms/draft", which drops the site's base path, and it
  // used POST, which a static host has nothing to answer with.
  test("the form action stays inside the deployed base path", async ({
    page,
  }) => {
    const form = page.locator("#draft-form");
    await expect(form).toHaveAttribute("method", "get");
    const action = await form.getAttribute("action");
    expect(action).toBe("/crz-patterns/forms/draft");
  });

  test("submitting lands on a real page, not a 404", async ({ page }) => {
    await page.fill("#draft-name", "Ada");
    await page.fill("#draft-email", "ada@example.com");

    const [response] = await Promise.all([
      page.waitForNavigation(),
      page.getByRole("button", { name: "Submit" }).click(),
    ]);

    expect(response?.status()).toBe(200);
    await expect(page.locator("#draft-form")).toBeVisible();
    await expect(page).toHaveURL(/\/crz-patterns\/forms\/draft/);
  });

  test("submitting puts none of the input in the URL", async ({ page }) => {
    await page.fill("#draft-name", "Ada");
    await page.fill("#draft-email", "ada@example.com");
    await page.getByRole("button", { name: "Submit" }).click();
    // An empty GET submission still leaves the "?" behind
    await page.waitForURL(/\/crz-patterns\/forms\/draft\?/);

    expect(new URL(page.url()).search).toBe("");
  });

  test("a draft survives navigating away and back", async ({ page }) => {
    await page.fill("#draft-name", "Grace");
    await page.fill("#draft-message", "half-written");

    await page.getByRole("link", { name: /Navigate away/ }).click();
    await page.goBack();

    await expect(page.locator("#draft-name")).toHaveValue("Grace");
    await expect(page.locator("#draft-message")).toHaveValue(
      "half-written",
    );
  });

  test("submitting clears the stored draft", async ({ page }) => {
    await page.fill("#draft-name", "Alan");
    await page.getByRole("button", { name: "Submit" }).click();
    await page.waitForURL(/\/crz-patterns\/forms\/draft/);

    const stored = await page.evaluate(() =>
      sessionStorage.getItem("draft-form-data"),
    );
    expect(stored).toBeNull();
  });
});

test.describe("multi-step form", () => {
  test("submitting announces the result and moves focus to it", async ({
    page,
  }) => {
    await page.goto("forms/multi-step/step1");
    await page.getByRole("button", { name: /Next/ }).click();
    await page.waitForURL(/step2/);
    await page.getByRole("button", { name: /Next/ }).click();
    await page.waitForURL(/step3/);

    await page.getByRole("button", { name: "Confirm & Submit" }).click();
    const result = page.getByRole("status");
    await expect(result).toHaveText(/Submitted!/);
    await expect(result).toBeFocused();
  });
});

test.describe("input validation", () => {
  test("the success message sits in a live region", async ({ page }) => {
    await page.goto("forms/validation");
    await page.fill('input[name="name"]', "Ada");
    await page.fill('input[name="postal"]', "123-4567");
    await page.fill('input[name="qty"]', "5");
    await page.fill('input[name="email"]', "ada@example.com");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByRole("status")).toContainText("All fields valid!");
  });
});

test.describe("catalog", () => {
  test("every catalog link resolves to a page that exists", async ({
    page,
    request,
  }) => {
    await page.goto("./");
    const hrefs = await page
      .locator("main a[href]")
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).href),
      );
    expect(hrefs.length).toBeGreaterThan(10);

    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), `${href} should exist`).toBe(200);
    }
  });
});
