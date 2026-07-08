const SUPABASE_URL = process.env.SUPABASE_URL || "https://meilwvvsqnrbreuyaqbh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_trdHe45uPkvXjSbDvmfTAQ_MVyC_jA6";

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

module.exports = async function handler(_request, response) {
  try {
    const sponsors = await fetchSponsors();
    response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    response.setHeader("CDN-Cache-Control", "no-store");
    response.setHeader("Vercel-CDN-Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Expires", "0");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.status(200).json({
      generatedAt: new Date().toISOString(),
      count: sponsors.length,
      sponsors,
    });
  } catch (error) {
    response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    response.setHeader("CDN-Cache-Control", "no-store");
    response.setHeader("Vercel-CDN-Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Expires", "0");
    response.status(502).json({
      error: "Unable to load sponsor directory.",
      detail: error.message,
    });
  }
};
