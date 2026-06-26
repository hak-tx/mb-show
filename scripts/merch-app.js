(function () {
  const grid = document.querySelector("#merch-products");
  const config = window.MB_SHOW_SHOPIFY || {};

  if (!grid || !config.newReleasesEndpoint) return;

  function createProductCard(product) {
    const card = document.createElement("a");
    card.className = "product-card";
    card.href = product.url || config.newReleasesUrl || "https://shop.michaelberryshow.com/collections/new-releases";

    const image = document.createElement("img");
    image.src = product.image || "";
    image.alt = product.title || "Michael Berry Show product";
    image.loading = "lazy";

    const title = document.createElement("span");
    title.textContent = product.title || "Michael Berry Show product";

    const price = document.createElement("strong");
    price.textContent = product.price || "View price";

    card.append(image, title, price);
    return card;
  }

  async function loadNewReleases() {
    try {
      const response = await fetch(config.newReleasesEndpoint, {
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`New releases request failed: ${response.status}`);

      const data = await response.json();
      const limit = Number(config.productLimit || 8);
      const products = Array.isArray(data.products) ? data.products.slice(0, limit) : [];
      if (!products.length) return;

      grid.replaceChildren(...products.map(createProductCard));
    } catch (error) {
      console.warn("Using static merch fallback.", error);
    }
  }

  loadNewReleases();
})();
