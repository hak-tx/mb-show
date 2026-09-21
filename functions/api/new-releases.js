const SHOPIFY_ORIGINS = [
  "https://shop.michaelberryshow.com",
  "https://michaelberry.myshopify.com",
];

const PRODUCT_SUFFIXES = [
  " - Tri-Blend Crew Tee",
  " - Coffee Mug, 11oz or 15oz",
  " - Can Cooler",
  " - Round Sticker",
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
  const url = `${origin}/collections/new-releases/products.json?limit=250&sort_by=manual`;
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
  return newestMerchFirst(products).slice(0, 20).map((product) => normalizeProduct(product, origin));
}

function newestMerchFirst(products) {
  const groups = new Map();
  for (const product of products) {
    const suffixIndex = PRODUCT_SUFFIXES.findIndex((suffix) => String(product.title || "").endsWith(suffix));
    const key = suffixIndex < 0
      ? `single:${product.id || product.handle}`
      : String(product.title).slice(0, -PRODUCT_SUFFIXES[suffixIndex].length).trim().toLowerCase();
    const createdAt = Date.parse(product.created_at || product.published_at || 0) || 0;
    const group = groups.get(key) || { products: [], batchAt: createdAt };
    group.products.push({ product, suffixIndex: suffixIndex < 0 ? PRODUCT_SUFFIXES.length : suffixIndex });
    group.batchAt = Math.min(group.batchAt || createdAt, createdAt);
    groups.set(key, group);
  }

  return [...groups.values()]
    .sort((left, right) => right.batchAt - left.batchAt)
    .flatMap((group) => group.products.sort((left, right) => left.suffixIndex - right.suffixIndex).map(({ product }) => product));
}

export async function onRequestGet() {
  for (const origin of SHOPIFY_ORIGINS) {
    try {
      const products = await fetchProducts(origin);
      return Response.json(
        {
          source: `${origin}/collections/new-releases`,
          products,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
          },
        },
      );
    } catch (error) {
      if (origin === SHOPIFY_ORIGINS[SHOPIFY_ORIGINS.length - 1]) {
        return Response.json(
          {
            error: "Unable to load Shopify new releases.",
            detail: error.message,
          },
          {
            status: 502,
            headers: {
              "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
          },
        );
      }
    }
  }
}
