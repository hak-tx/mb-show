import { expect, test } from "@playwright/test";

test("directory search and admin shell", async ({ page }) => {
  const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4178";
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await expect(page.locator("#sponsor-list article")).toHaveCount(24);

  await page.fill("#sponsor-search", "patio");
  await expect(page.locator("#sponsor-result-count")).toContainText("patio");
  await expect(page.locator("#sponsor-list")).toContainText(/Outdoor|Shade|Tree|Topsoil|Lumber/);

  await page.fill("#sponsor-search", "hvac houston");
  await expect(page.locator("#sponsor-result-count")).toContainText("hvac houston");
  await expect(page.locator("#sponsor-list")).toContainText(/Northwind|Trane|Uptown|Abacus|Techstar/);

  await page.goto(`${baseUrl}/admin.html`, { waitUntil: "networkidle" });
  await expect(page.locator("#admin-status")).toContainText("Supabase connection pending");
  expect(errors).toEqual([]);
});
