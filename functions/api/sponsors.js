const SUPABASE_URL = "https://meilwvvsqnrbreuyaqbh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_trdHe45uPkvXjSbDvmfTAQ_MVyC_jA6";

const SELECT_FIELDS = [
  "id",
  "slug",
  "name",
  "website_url",
  "phone",
  "category",
  "description",
  "services",
  "service_areas",
  "cities",
  "states",
  "keywords",
  "admin_keywords",
  "premium_tier",
  "premium_rank",
  "is_featured",
  "sponsor_status",
  "updated_at",
].join(",");

const CACHE_TTL_SECONDS = 300;
const CACHE_STALE_SECONDS = 86400;

async function fetchSponsors() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/sponsors`);
  url.searchParams.set("select", SELECT_FIELDS);
  url.searchParams.set("sponsor_status", "eq.active");
  url.searchParams.set("order", "name.asc");

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    accept: "application/json",
  };

  if (!SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) {
    headers.authorization = `Bearer ${SUPABASE_PUBLISHABLE_KEY}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Supabase responded ${response.status}`);
  }

  return response.json();
}

function jsonResponse(body, init = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_STALE_SECONDS}`,
      ...(init.headers || {}),
    },
  });
}

async function readCache(request) {
  if (typeof caches === "undefined") return null;
  return caches.default.match(request);
}

async function writeCache(context, request, response) {
  if (typeof caches === "undefined" || !context.waitUntil) return;
  context.waitUntil(caches.default.put(request, response.clone()).catch(() => {}));
}

export async function onRequestGet(context) {
  const cacheRequest = new Request(context.request.url, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  const cachedResponse = await readCache(cacheRequest);
  if (cachedResponse) return cachedResponse;

  try {
    const sponsors = await fetchSponsors();
    const response = jsonResponse({
      generatedAt: new Date().toISOString(),
      count: sponsors.length,
      sponsors,
    });
    await writeCache(context, cacheRequest, response);
    return response;
  } catch (error) {
    return jsonResponse(
      {
        error: "Unable to load sponsor directory.",
        detail: error.message,
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
        },
      },
    );
  }
}
