import { expect, test } from "@playwright/test";

test("directory search and admin shell", async ({ page }) => {
  const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4178";
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const desktopNav = page.getByRole("navigation", { name: "Primary" });
  await expect(desktopNav).not.toContainText("Admin");
  await expect(desktopNav.getByRole("link", { name: "Contact" })).toBeVisible();
  await expect(desktopNav.getByRole("link", { name: "Join List" })).toBeVisible();
  await expect(page.locator("#sponsor-list article")).toHaveCount(0);
  await expect(page.locator("#sponsor-result-count")).toContainText("Search to see matching show sponsors");
  await expect(page.locator("#sponsor-list")).toBeHidden();
  await expect(page.locator("#sponsor-more-results")).toBeHidden();
  await expect(page.locator(".directory-shell")).toHaveCSS("background-color", "rgb(247, 249, 253)");
  await expect(page.locator(".view-toggle button.is-active")).toHaveCSS("background-color", "rgb(7, 20, 59)");
  await expect(page.locator("#sponsor-state-filter")).toHaveCount(0);
  await expect(page.locator("#sponsor-category-filter")).toHaveCount(0);
  await expect(page.locator("#sponsor-clear-filters")).toHaveCount(0);
  await expect(page.locator(".view-hint")).toContainText("View results as");
  await expect(page.locator("#sponsor-view-controls")).toBeHidden();
  await expect(page.getByRole("link", { name: "Full Sponsor list" })).toBeVisible();
  await expect(page.locator("#merch h2")).toContainText("New releases from the Michael Berry Show store.");

  await page.fill("#sponsor-search", "houston");
  await expect(page.locator("#sponsor-result-count")).toContainText("houston");
  await expect(page.locator("#sponsor-view-controls")).toBeVisible();
  await expect(page.locator("#sponsor-list article")).toHaveCount(12);
  await expect(page.locator("#sponsor-more-results")).toContainText("More");
  await page.getByRole("button", { name: "More" }).click();
  await expect(page.locator("#sponsor-list article")).toHaveCount(24);

  await page.fill("#sponsor-search", "patio");
  await expect(page.locator("#sponsor-result-count")).toContainText("patio");
  await expect(page.locator("#sponsor-result-count")).toContainText("Showing all");
  await expect(page.locator("#sponsor-more-results")).toBeHidden();
  await expect(page.locator("#sponsor-list")).toContainText(/Outdoor|Shade|Tree|Topsoil|Lumber/);
  await expect(page.locator("#sponsor-list")).not.toContainText("Abacus Plumbing & Electrical");

  await page.getByRole("button", { name: "List" }).click();
  await expect(page.locator("#sponsor-list")).toHaveClass(/list-view/);

  await page.fill("#sponsor-search", "hvac houston");
  await expect(page.locator("#sponsor-result-count")).toContainText("hvac houston");
  await expect(page.locator("#sponsor-list")).toContainText(/Northwind|Trane|Uptown|Abacus|Techstar/);
  await expect(page.locator("#sponsor-list")).toContainText("Abacus Plumbing & Electrical");
  await expect(page.locator("#sponsor-list")).not.toContainText("premium listing");

  await page.fill("#sponsor-search", "");
  await expect(page.locator("#sponsor-list article")).toHaveCount(0);
  await expect(page.locator("#sponsor-list")).toBeHidden();

  await page.goto(`${baseUrl}/admin.html`, { waitUntil: "networkidle" });
  await expect(page.locator("#admin-status")).toContainText("Supabase connection pending");
  expect(errors).toEqual([]);
});

test("mobile header keeps nav collapsed", async ({ page }) => {
  const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4178";
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

  const nav = page.getByRole("navigation", { name: "Primary" });
  const quickLinkRows = await page.locator(".quick-links a").evaluateAll((tiles) => {
    const tops = tiles.map((tile) => Math.round(tile.getBoundingClientRect().top / 4) * 4);
    return Array.from(new Set(tops)).length;
  });
  expect(quickLinkRows).toBe(2);

  await expect(page.locator(".site-header .cart-button")).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await expect(nav).not.toBeVisible();

  await page.getByRole("button", { name: "Menu" }).click();
  await expect(nav).toBeVisible();
  await expect(nav).not.toContainText("Admin");
  await expect(nav.getByRole("link", { name: "Contact" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Join List" })).toBeVisible();

  await page.getByRole("link", { name: "Sponsors" }).click();
  await expect(nav).not.toBeVisible();
});
