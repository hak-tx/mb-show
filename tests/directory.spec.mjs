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
  await expect(page.locator("#sponsor-result-count")).toContainText("Search or choose a filter");
  await expect(page.locator("#sponsor-list")).toBeHidden();
  await expect(page.locator("#sponsor-more-results")).toBeHidden();

  await page.selectOption("#sponsor-state-filter", "Texas");
  await expect(page.locator("#sponsor-result-count")).toContainText("Texas");
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

  await page.getByRole("button", { name: "Clear" }).click();
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
