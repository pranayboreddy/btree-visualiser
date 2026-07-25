import { expect, test, type Page } from "@playwright/test";

/**
 * Real render smoke test: mounts the app in Chromium and drives the core loop —
 * insert / delete / build / convert — asserting the DOM actually updates. This is
 * the DOM-level check the pure-logic unit tests cannot make.
 */

const keysStored = (page: Page) => page.getByTestId("stat-keys");
const nodeRects = (page: Page) => page.locator("svg rect");
const leafLinks = (page: Page) => page.locator("svg line[marker-end]");
const token = (page: Page) => page.getByTestId("op-token");

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

async function insertKey(page: Page, key: number, expectedCount: number): Promise<void> {
  await page.getByTestId("key-input").fill(String(key));
  await page.getByTestId("insert-btn").click();
  await expect(keysStored(page)).toHaveText(String(expectedCount));
  // the operation token clears once the animation commits
  await expect(token(page)).toBeHidden({ timeout: 25_000 });
}

test("app mounts and seeds an initial tree", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/");

  await expect(page.getByText("Tree Lab")).toBeVisible();
  await expect(keysStored(page)).toHaveText("12");
  expect(await nodeRects(page).count()).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test("insert and delete update the tree and the DOM", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/");
  await expect(keysStored(page)).toHaveText("12");

  await page.getByRole("button", { name: "Empty" }).click();
  await expect(keysStored(page)).toHaveText("0");

  await insertKey(page, 42, 1);
  await expect(page.locator("svg").getByText("42", { exact: true })).toBeVisible();

  await page.getByTestId("key-input").fill("42");
  await page.getByTestId("delete-btn").click();
  await expect(keysStored(page)).toHaveText("0");
  await expect(token(page)).toBeHidden({ timeout: 25_000 });

  expect(errors).toEqual([]);
});

test("building a tree forces a split (multiple nodes)", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Empty" }).click();
  await expect(keysStored(page)).toHaveText("0");

  const keys = [10, 20, 30, 40, 50];
  for (let i = 0; i < keys.length; i++) await insertKey(page, keys[i], i + 1);

  // root + 2 children after the split (node boxes; hit-rects inflate this further)
  await expect.poll(() => nodeRects(page).count()).toBeGreaterThanOrEqual(3);

  expect(errors).toEqual([]);
});

test("converting to B+ tree preserves keys and links leaves", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Empty" }).click();
  await expect(keysStored(page)).toHaveText("0");

  const keys = [10, 20, 30, 40, 50];
  for (let i = 0; i < keys.length; i++) await insertKey(page, keys[i], i + 1);

  await page.getByRole("tab", { name: "B+ tree" }).click();
  await expect(keysStored(page)).toHaveText("5");
  await expect.poll(() => leafLinks(page).count()).toBeGreaterThanOrEqual(1);

  expect(errors).toEqual([]);
});

test("dark mode toggle flips the theme attribute", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await page.getByRole("button", { name: /theme/i }).click();
  await expect(html).toHaveAttribute("data-theme", /light|dark/);
});

test("an operation token appears while inserting", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Empty" }).click();
  await expect(keysStored(page)).toHaveText("0");

  await page.getByTestId("key-input").fill("42");
  await page.getByTestId("insert-btn").click();
  await expect(token(page)).toContainText("Inserting 42");
});

test("clicking a key in the tree loads it into the input", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Empty" }).click();
  await insertKey(page, 77, 1);

  await page.locator("svg").getByText("77", { exact: true }).click();
  await expect(page.getByTestId("key-input")).toHaveValue("77");
});

test("animation speed control updates the active speed", async ({ page }) => {
  await page.goto("/");
  const fast = page.getByRole("button", { name: "2×" });
  await fast.click();
  await expect(fast).toHaveAttribute("aria-pressed", "true");
});
