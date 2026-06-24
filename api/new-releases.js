const SHOPIFY_ORIGINS = [
  "https://shop.michaelberryshow.com",
  "https://michaelberry.myshopify.com",
];

function toMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `$${amount.toFixed(2)}`;
}

function productPrice(product) {
  const prices = (product.variants || [])
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price));

  if (!prices.length) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? toMoney(min) : `From ${toMoney(min)}`;
}

function sizedImage(src) {
  if (!src) return "";
  try {
    const url = new URL(src);
    url.searchParams.set("width", "720");
    return url.toString();
  } catch {
    return src;
  }
}

function normalizeProduct(product, storeOrigin) {
  return {
    title: product.title,
    handle: product.handle,
    url: `${storeOrigin}/products/${product.handle}`,
    image: sizedImage(product.images?.[0]?.src),
    price: productPrice(product),
    createdAt: product.created_at || "",
    publishedAt: product.published_at || "",
  };
}

async function fetchProducts(origin) {
  const url = `${origin}/collections/new-releases/products.json?limit=24&sort_by=created-descending`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "MB Show landing page product sync",
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify responded ${response.status}`);
  }

  const data = await response.json();
  const products = Array.isArray(data.products) ? data.products : [];
  return products
    .sort((a, b) => {
      const aDate = Date.parse(a.created_at || a.published_at || 0);
      const bDate = Date.parse(b.created_at || b.published_at || 0);
      return bDate - aDate;
    })
    .slice(0, 8)
    .map((product) => normalizeProduct(product, origin));
}

module.exports = async function handler(request, response) {
  for (const origin of SHOPIFY_ORIGINS) {
    try {
      const products = await fetchProducts(origin);
      response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.status(200).json({
        source: `${origin}/collections/new-releases`,
        products,
      });
      return;
    } catch (error) {
      if (origin === SHOPIFY_ORIGINS[SHOPIFY_ORIGINS.length - 1]) {
        response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
        response.status(502).json({
          error: "Unable to load Shopify new releases.",
          detail: error.message,
        });
        return;
      }
    }
  }
};
