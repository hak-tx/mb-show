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
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Pragma": "no-cache",
      "Expires": "0",
      ...(init.headers || {}),
    },
  });
}

export async function onRequestGet(context) {
  try {
    const sponsors = await fetchSponsors();
    return jsonResponse({
      generatedAt: new Date().toISOString(),
      count: sponsors.length,
      sponsors,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Unable to load sponsor directory.",
        detail: error.message,
      },
      {
        status: 502,
      },
    );
  }
}
