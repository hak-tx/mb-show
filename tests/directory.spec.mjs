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
  await expect(page.locator(".live-strip")).toContainText("Weekdays");
  await expect(page.locator(".live-times strong")).toHaveCount(2);
  await expect(page.locator(".live-strip .time-zone")).toHaveCount(2);
  await expect(page.locator(".live-strip .time-zone").first()).toContainText("CST");
  await expect(page.getByRole("link", { name: /Send Michael an email/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Get Michael's Daily Email Update/i })).toBeVisible();
  await expect(page.locator("#sponsor-result-count")).toContainText("Showing all 80 sponsors");
  await expect(page.locator("#sponsor-list")).toBeVisible();
  await expect(page.locator("#sponsor-list article")).toHaveCount(80);
  await expect(page.locator("#sponsor-more-results")).toBeHidden();
  await expect(page.locator(".directory-shell")).toHaveCSS("background-color", "rgb(247, 249, 253)");
  await expect(page.locator("#sponsor-state-filter")).toHaveCount(0);
  await expect(page.locator("#sponsor-category-filter")).toHaveCount(0);
  await expect(page.locator("#sponsor-clear-filters")).toHaveCount(0);
  await expect(page.locator("#sponsor-view-controls")).toBeHidden();
  await expect(page.getByRole("button", { name: "Cards" })).toBeHidden();
  const firstSponsor = page.locator("#sponsor-list article").first();
  await expect(firstSponsor.locator(".sponsor-card-name")).not.toHaveText("");
  await expect(firstSponsor.locator(".sponsor-card-phone")).toBeVisible();
  await expect(firstSponsor.locator(".sponsor-card-website")).toBeVisible();
  await expect(firstSponsor.locator(".sponsor-details")).toBeHidden();
  await firstSponsor.locator(".sponsor-card-toggle").click();
  await expect(firstSponsor.locator(".sponsor-details")).toBeVisible();
  await expect(firstSponsor.locator(".sponsor-card-toggle")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Full Sponsor list" })).toBeVisible();
  await expect(page.locator("#merch h2")).toContainText("New releases from the Michael Berry Show store.");
  await expect(page.locator("#media-player")).toBeHidden();
  await expect(page.locator("#media-player")).toHaveAttribute("data-player-state", "hidden");

  await page.locator(".quick-links a[data-player-open='live']").click();
  await expect(page.locator("#media-frame-wrap")).toBeVisible();
  await expect(page.locator("#media-title")).toContainText("NewsRadio 740 KTRH live");
  await expect(page.locator("#media-frame")).toHaveAttribute("src", /newsradio-740-ktrh-2285/);
  await expect(page.locator("#media-frame")).toHaveAttribute("height", "118");
  await page.getByRole("button", { name: "Minimize" }).click();
  await expect(page.locator("#media-player")).toHaveAttribute("data-player-state", "minimized");
  await expect(page.locator("#media-frame")).toBeVisible();
  await expect(page.locator("#media-frame")).toHaveAttribute("src", /newsradio-740-ktrh-2285/);
  await page.getByRole("button", { name: "Expand" }).click();
  await expect(page.locator("#media-player")).toHaveAttribute("data-player-state", "open");

  await page.locator("#media-player button[data-player-open='podcast']").click();
  await expect(page.locator("#media-title")).toContainText("The Michael Berry Show podcast");
  await expect(page.locator("#media-frame")).toHaveAttribute("src", /44-the-michael-berry-show-27764850/);
  await expect(page.locator("#media-frame")).toHaveAttribute("height", "500");
  await page.getByRole("button", { name: "Minimize" }).click();
  await expect(page.locator("#media-player")).toHaveAttribute("data-player-state", "minimized");
  await expect(page.locator("#media-frame")).toBeVisible();
  await expect(page.locator("#media-close")).toHaveText("Close");
  await page.locator("#media-close").click();
  await expect(page.locator("#media-player")).toBeHidden();

  await page.fill("#sponsor-search", "houston");
  await expect(page.locator("#sponsor-result-count")).toContainText("houston");
  await expect(page.locator("#sponsor-view-controls")).toBeHidden();
  await expect(page.locator("#sponsor-result-count")).toContainText("Showing all");
  await expect(page.locator("#sponsor-list article").first()).toBeVisible();
  await expect(page.locator("#sponsor-more-results")).toBeHidden();

  await page.fill("#sponsor-search", "patio");
  await expect(page.locator("#sponsor-result-count")).toContainText("patio");
  await expect(page.locator("#sponsor-result-count")).toContainText("Showing all");
  await expect(page.locator("#sponsor-more-results")).toBeHidden();
  await expect(page.locator("#sponsor-list")).toContainText(/Outdoor|Shade|Topsoil|Sunflower/);
  await expect(page.locator("#sponsor-list")).not.toContainText("Abacus Plumbing & Electrical");

  await expect(page.getByRole("button", { name: "List" })).toBeHidden();

  await page.fill("#sponsor-search", "hvac houston");
  await expect(page.locator("#sponsor-result-count")).toContainText("hvac houston");
  await expect(page.locator("#sponsor-list")).toContainText(/Northwind|Trane|Abacus/);
  await expect(page.locator("#sponsor-list")).toContainText("Abacus Plumbing & Electrical");
  await expect(page.locator("#sponsor-list")).not.toContainText("Techstar");
  await expect(page.locator("#sponsor-list")).not.toContainText("premium listing");

  await page.fill("#sponsor-search", "who can fix my air conditioner");
  await expect(page.locator("#sponsor-result-count")).toContainText("air conditioner");
  await expect(page.locator("#sponsor-list")).toContainText(/Northwind|Trane|Abacus/);
  await expect(page.locator("#sponsor-list")).not.toContainText("Fix Auto Houston");

  await page.fill("#sponsor-search", "tree");
  await expect(page.locator("#sponsor-result-count")).toContainText("tree");
  await expect(page.locator("#sponsor-result-count")).toContainText("Showing all 3 sponsors");
  await expect(page.locator("#sponsor-list")).toContainText("Ability Tree Service");
  await expect(page.locator("#sponsor-list")).toContainText("ABC Home and Commercial Pest Control");
  await expect(page.locator("#sponsor-list")).toContainText("Brookway Landscape and Irrigation");
  await expect(page.locator("#sponsor-list")).not.toContainText("MainStreet Wealth Management");

  await page.fill("#sponsor-search", "lumber");
  await expect(page.locator("#sponsor-result-count")).toContainText("lumber");
  await expect(page.locator("#sponsor-list")).toContainText("McCauley Lumber");
  await expect(page.locator("#sponsor-list")).not.toContainText("Abacus Plumbing & Electrical");

  await page.fill("#sponsor-search", "attic insulation");
  await expect(page.locator("#sponsor-result-count")).toContainText("attic insulation");
  await expect(page.locator("#sponsor-result-count")).toContainText("related sponsors");
  await expect(page.locator("#sponsor-list")).toContainText("All Star Construction");
  await expect(page.locator("#sponsor-list")).toContainText(/Allied|Design Tech|McCauley/);
  await expect(page.locator("#sponsor-list")).not.toContainText("Abacus Plumbing & Electrical");

  await page.fill("#sponsor-search", "retaining");
  await expect(page.locator("#sponsor-result-count")).toContainText("related sponsors");
  await expect(page.locator("#sponsor-list")).toContainText(/Daniel Dean|Brookway|Cowboy|Allied Outdoor/);
  await expect(page.locator("#sponsor-list")).not.toContainText("Dunn Fence");
  await expect(page.locator("#sponsor-list")).not.toContainText("Katz Coffee");
  await expect(page.locator("#sponsor-list")).not.toContainText("Muscle Cars of Texas");
  await expect(page.locator("#sponsor-list")).not.toContainText("Oops! Steam Cleaning");
  await expect(page.locator("#sponsor-list")).not.toContainText("Sunflower Floor Coatings");

  await page.fill("#sponsor-search", "plumbing");
  await expect(page.locator("#sponsor-result-count")).toContainText("plumbing");
  await expect(page.locator("#sponsor-list")).toContainText("Abacus Plumbing & Electrical");
  await expect(page.locator("#sponsor-list")).not.toContainText("Atlas Foundation Repair");
  await expect(page.locator("#sponsor-list")).not.toContainText("Brookway Landscape and Irrigation");
  await expect(page.locator("#sponsor-list")).not.toContainText("Daniel Dean Land Clearing & Dirt Work");
  await expect(page.locator("#sponsor-list")).not.toContainText("Generator Supercenter");
  await expect(page.locator("#sponsor-list")).not.toContainText("Sparx Engineering");

  await page.fill("#sponsor-search", "pluming");
  await expect(page.locator("#sponsor-result-count")).toContainText("pluming");
  await expect(page.locator("#sponsor-list")).toContainText("Abacus Plumbing & Electrical");
  await expect(page.locator("#sponsor-list")).not.toContainText("Atlas Foundation Repair");

  await page.fill("#sponsor-search", "");
  await expect(page.locator("#sponsor-result-count")).toContainText("Showing all 80 sponsors");
  await expect(page.locator("#sponsor-list")).toBeVisible();
  await expect(page.locator("#sponsor-list article")).toHaveCount(80);

  await page.goto(`${baseUrl}/admin.html`, { waitUntil: "networkidle" });
  await expect(page.locator("#admin-status")).toContainText("Preview mode");
  await expect(page.locator("#editor-panel")).toBeVisible();
  await expect(page.locator("#stat-total")).toContainText("80");
  await expect(page.getByRole("button", { name: "Add sponsor" })).toBeVisible();
  await expect(page.getByLabel("Find a sponsor")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete$/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Edit" }).first().click();
  await expect(page.locator(".inline-sponsor-editor")).toBeVisible();
  await expect(page.getByLabel("Sponsor name")).not.toHaveValue("");
  await expect(page.getByLabel("Phone number")).toBeVisible();
  await expect(page.getByLabel("Website / tracking URL")).toBeVisible();
  await page.getByLabel("Extra search keywords").fill("whole house generator");
  await page.getByRole("button", { name: "Add keyword" }).click();
  await expect(page.locator("[data-keyword-chips]")).toContainText("whole house generator");
  await page.getByRole("button", { name: "Save listing" }).click();
  await expect(page.locator("#admin-status")).toContainText("Saved in preview mode");
  await expect(page.locator(".inline-sponsor-editor")).toHaveCount(0);

  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByRole("button", { name: "Delete sponsor..." }).click();
  await expect(page.getByRole("button", { name: "Confirm delete" })).toBeVisible();
  await page.getByRole("button", { name: "Keep sponsor" }).click();
  await expect(page.getByRole("button", { name: "Confirm delete" })).toHaveCount(0);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".inline-sponsor-editor")).toHaveCount(0);

  const firstStatusToggle = page.locator(".status-toggle").first();
  const startingStatus = (await firstStatusToggle.textContent()).trim();
  await firstStatusToggle.click();
  await expect(page.locator("#admin-status")).toContainText("is now");
  await expect(firstStatusToggle).not.toHaveText(startingStatus);
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
  await expect(page.locator(".email-tile")).toBeVisible();

  await page.getByRole("button", { name: "Menu" }).click();
  await expect(nav).toBeVisible();
  await expect(nav).not.toContainText("Admin");
  await expect(nav.getByRole("link", { name: "Contact" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Join List" })).toBeVisible();

  await page.getByRole("link", { name: "Sponsors" }).click();
  await expect(nav).not.toBeVisible();
});
