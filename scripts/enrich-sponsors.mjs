import { mkdir, readFile, writeFile } from "node:fs/promises";

const rawPath = new URL("../data/sponsors.raw.json", import.meta.url);
const outPath = new URL("../data/sponsors.enriched.json", import.meta.url);

const CATEGORY_RULES = [
  ["HVAC", /\b(hvac|air conditioning|a\/c|ac\b|trane|heating|cooling|furnace)\b/i, ["hvac", "air conditioning", "heating", "cooling", "repair"]],
  ["Plumbing & Electrical", /\b(plumb|electrical|electrician|generator)\b/i, ["plumbing", "electrical", "generators", "home repair"]],
  ["Food & Restaurants", /\b(grill|tex-mex|coffee|cajun|restaurant|meats|changa|gringo|federal)\b/i, ["restaurant", "food", "dining", "coffee"]],
  ["Medical & Wellness", /\b(doctor|mdvip|eye|hair|radiation|dental|dentistry|fitness|medicare|testosterone|kinetix|hearing|health)\b/i, ["medical", "health", "wellness", "doctor"]],
  ["Legal & Financial", /\b(law|insurance|wealth|stifel|tax|payment|capital|cpa|estate|defenders)\b/i, ["legal", "financial", "insurance", "tax"]],
  ["Automotive", /\b(auto|car|chevy|motorsport|garage door|wheel|trailer)\b/i, ["automotive", "vehicles", "repair", "sales"]],
  ["Home Improvement", /\b(roof|siding|window|outdoor|patio|kitchen|floor|paint|fence|front door|foundation|landscap|tree|topsoil|truss|construction|lumber|shade|coating)\b/i, ["home improvement", "contractor", "repair", "renovation"]],
  ["Retail & Specialty", /\b(diamond|boot|coin|flags|hardware|spec|byrna|gun|tractor|appliance|pipe)\b/i, ["retail", "specialty", "shopping"]],
  ["Real Estate & Land", /\b(ranch|renters|rentals|land|estate)\b/i, ["real estate", "land", "rentals"]],
  ["Events & Travel", /\b(tent|event|casino|hotel|golf|shows|golden nugget)\b/i, ["events", "travel", "entertainment"]],
  ["Technology & B2B", /\b(tech|engineering|powder coat|promotional|manufacturing)\b/i, ["technology", "business services", "manufacturing"]],
];

const INTENT_KEYWORDS = {
  patio: ["patio", "outdoor kitchen", "outdoor living", "pavers", "landscape", "shade", "deck", "backyard"],
  hvac: ["hvac", "air conditioning", "ac repair", "heating", "cooling", "trane"],
  "air conditioning": ["hvac", "air conditioning", "cooling", "ac repair"],
  plumbing: ["plumbing", "water heater", "pipes", "drain", "leak"],
  generator: ["generator", "whole-home generator", "backup power", "electrical"],
  roof: ["roofing", "roof replacement", "roof repair", "siding"],
  foundation: ["foundation repair", "slab", "structural repair"],
  restaurant: ["restaurant", "dining", "food", "tex-mex", "coffee"],
  lawyer: ["lawyer", "attorney", "law firm", "insurance recovery", "estate planning"],
  doctor: ["doctor", "medical", "health", "wellness"],
};

const SERVICE_AREAS = [
  ["Houston", /\b(houston|ktrh|713|281|832)\b/i],
  ["Greater Houston", /\b(houston|katy|woodlands|spring|conroe|clear lake|sugar land|pearland|humble|cypress|tomball|memorial|galveston)\b/i],
  ["Texas", /\b(texas|tx|houston|austin|dallas|san antonio|fort worth|college station|beaumont|galveston)\b/i],
  ["Louisiana", /\b(louisiana|lake charles|golden nugget)\b/i],
  ["United States", /\b(nationwide|national|united states|usa|u\.s\.)\b/i],
];

const CATEGORY_OVERRIDES = {
  "Acori Diamonds": {
    category: "Retail & Specialty",
    services: ["jewelry", "diamonds", "retail", "specialty"],
  },
  "Garage Door Doctor.Biz": {
    category: "Home Improvement",
    services: ["garage doors", "home improvement", "repair", "installation"],
  },
  "Shade Doctor": {
    category: "Home Improvement",
    services: ["window shades", "outdoor shade", "patio", "home improvement", "installation"],
  },
};

function cleanText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => value.trim()).filter(Boolean))];
}

function categorize(sponsor, siteText) {
  const primaryHaystack = `${sponsor.name} ${sponsor.website_url} ${sponsor.source_notes.join(" ")} ${siteText}`;
  const areaHaystack = `${primaryHaystack} ${siteText}`;
  const matches = CATEGORY_RULES.filter(([, pattern]) => pattern.test(primaryHaystack));
  const primary = matches[0]?.[0] || "General";
  const services = unique(matches.flatMap(([, , terms]) => terms));
  const intentKeywords = Object.entries(INTENT_KEYWORDS)
    .filter(([, terms]) => terms.some((term) => primaryHaystack.toLowerCase().includes(term)))
    .flatMap(([intent, terms]) => [intent, ...terms]);
  const serviceAreas = unique(
    SERVICE_AREAS.filter(([, pattern]) => pattern.test(areaHaystack)).map(([area]) => area),
  );

  const override = CATEGORY_OVERRIDES[sponsor.name];

  return {
    category: override?.category || primary,
    services: unique(override?.services || [...services, ...intentKeywords]),
    service_areas: serviceAreas.length ? serviceAreas : ["Greater Houston", "Texas"],
    keywords: unique([
      primary,
      ...services,
      ...intentKeywords,
      ...sponsor.name.split(/[\s/&.,-]+/).filter((part) => part.length > 2),
    ]),
  };
}

async function fetchSiteSummary(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("text/html") ? await response.text() : "";
    const title = cleanText(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const metaDescription = cleanText(
      body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        body.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ||
        "",
    );
    const h1 = cleanText(body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
    const text = cleanText(body).slice(0, 12000);

    return {
      lookup_status: response.ok ? "ok" : `http_${response.status}`,
      final_url: response.url,
      site_title: title,
      site_description: metaDescription,
      site_h1: h1,
      site_text_sample: text.slice(0, 1600),
    };
  } catch (error) {
    return {
      lookup_status: error.name === "AbortError" ? "timeout" : "error",
      final_url: url,
      site_title: "",
      site_description: "",
      site_h1: "",
      site_text_sample: "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildDescription(sponsor, site) {
  const description = site.site_description || site.site_h1 || site.site_title || sponsor.source_notes.find((note) => !note.includes("-")) || "";
  return description.slice(0, 320);
}

const raw = JSON.parse(await readFile(rawPath, "utf8"));
const enriched = [];

for (const [index, sponsor] of raw.sponsors.entries()) {
  const site = await fetchSiteSummary(sponsor.website_url);
  const categoryData = categorize(sponsor, `${site.site_title} ${site.site_description} ${site.site_h1} ${site.site_text_sample}`);
  const phone = sponsor.phone || sponsor.source_notes.find((note) => /\d/.test(note)) || "";

  enriched.push({
    ...sponsor,
    phone,
    category: categoryData.category,
    services: categoryData.services,
    service_areas: categoryData.service_areas,
    keywords: categoryData.keywords,
    description: buildDescription(sponsor, site),
    lookup: site,
  });

  console.log(`${index + 1}/${raw.sponsors.length} ${sponsor.name} ${site.lookup_status}`);
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(
  outPath,
  `${JSON.stringify(
    {
      ...raw,
      enriched_at: new Date().toISOString(),
      sponsors: enriched,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${enriched.length} enriched sponsors to ${outPath.pathname}`);
