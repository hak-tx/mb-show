(function () {
  const config = window.MB_SHOW_SUPABASE || {};
  const directoryConfig = window.MB_SHOW_DIRECTORY || {};
  const form = document.querySelector("#sponsor-search-form");
  const input = document.querySelector("#sponsor-search");
  const list = document.querySelector("#sponsor-list");
  const count = document.querySelector("#sponsor-result-count");
  const moreResults = document.querySelector("#sponsor-more-results");
  const viewControls = document.querySelector("#sponsor-view-controls");

  const synonyms = {
    patio: ["outdoor kitchen", "outdoor living", "pavers", "pool deck", "patio cover", "pergola", "shade", "backyard"],
    backyard: ["patio", "outdoor kitchen", "outdoor living", "pavers", "shade"],
    "outdoor kitchen": ["patio", "outdoor living", "pavers"],
    "outdoor living": ["patio", "outdoor kitchen", "pavers", "shade"],
    hvac: ["air conditioning", "ac repair", "heating", "cooling", "trane"],
    ac: ["hvac", "air conditioning", "air conditioner", "cooling"],
    "a c": ["hvac", "air conditioning", "air conditioner", "cooling"],
    "air conditioner": ["hvac", "air conditioning", "ac repair", "cooling"],
    "air conditioning": ["hvac", "ac repair", "cooling"],
    plumbing: ["plumber", "water heater", "drain cleaning", "sewer line", "leak repair", "repiping"],
    plumber: ["plumbing", "water heater", "drain cleaning", "sewer line", "leak repair"],
    "water heater": ["plumbing", "plumber", "tankless water heater"],
    generator: ["whole home generator", "standby generator", "backup generator", "backup power", "generac"],
    "backup power": ["generator", "whole home generator", "standby generator"],
    attic: ["home remodeling", "whole home remodeling", "home addition", "construction", "exterior remodeling", "roofing", "building materials"],
    attics: ["attic", "home remodeling", "whole home remodeling", "home addition", "construction", "exterior remodeling", "roofing", "building materials"],
    insulation: ["home remodeling", "whole home remodeling", "home addition", "construction", "exterior remodeling", "siding", "roofing", "building materials", "custom home builder"],
    roof: ["roofing", "roof replacement", "roof repair", "roofer"],
    roofing: ["roof", "roof replacement", "roof repair", "roofer"],
    foundation: ["foundation repair", "slab repair", "pier and beam", "house leveling"],
    tree: ["tree service", "tree trimming", "tree removal", "arborist", "stump grinding", "tree care"],
    trees: ["tree", "tree service", "tree trimming", "tree removal", "arborist", "tree care"],
    landscaping: ["landscape", "lawn care", "yard", "irrigation", "sprinkler", "tree care"],
    landscape: ["landscaping", "lawn care", "yard", "irrigation", "sprinkler"],
    yard: ["landscaping", "lawn care", "irrigation", "topsoil", "mulch"],
    retaining: ["retention pond", "drainage", "erosion control", "grading", "excavation", "land clearing", "dirt work", "landscape materials", "gravel", "pavers"],
    "retaining wall": ["retention pond", "drainage", "erosion control", "grading", "excavation", "land clearing", "dirt work", "landscape materials", "gravel", "pavers"],
    hardscape: ["pavers", "patio", "landscape materials", "outdoor living"],
    pests: ["pest control", "exterminator", "termites", "rodent control", "mosquito control"],
    bugs: ["pest control", "exterminator", "termites", "mosquito control"],
    termite: ["pest control", "termites", "termite treatment"],
    lawyer: ["attorney", "law firm", "estate planning", "insurance claim"],
    attorney: ["lawyer", "law firm", "estate planning", "insurance claim"],
    wills: ["estate planning", "trusts", "probate"],
    medicare: ["senior health", "medicare help", "medicare plans"],
    doctor: ["primary care", "medical", "concierge doctor", "physician"],
    dentist: ["dentistry", "cosmetic dentistry", "veneers"],
    hearing: ["hearing aids", "audiology"],
    investment: ["wealth management", "financial advisor", "retirement planning"],
    retirement: ["wealth management", "financial advisor", "investment planning"],
    car: ["auto", "vehicle", "truck", "collision repair", "car dealer"],
    auto: ["car", "vehicle", "collision repair", "auto repair"],
    restaurant: ["food", "tex mex", "cajun", "dining"],
    food: ["restaurant", "tex mex", "cajun", "coffee", "liquor"],
    "managed it": ["cybersecurity", "computer support"],
    computer: ["managed it", "cybersecurity", "computer support"],
    "computer support": ["managed it", "cybersecurity"],
    gun: ["firearms", "shooting range", "self defense"],
    guns: ["firearms", "shooting range", "self defense"],
  };

  const stopTerms = new Set([
    "a",
    "an",
    "and",
    "are",
    "best",
    "by",
    "can",
    "city",
    "company",
    "find",
    "fix",
    "for",
    "from",
    "good",
    "help",
    "i",
    "in",
    "local",
    "look",
    "looking",
    "managed",
    "me",
    "michael",
    "my",
    "near",
    "need",
    "of",
    "on",
    "or",
    "please",
    "service",
    "services",
    "show",
    "someone",
    "sponsor",
    "sponsors",
    "the",
    "to",
    "who",
    "will",
    "with",
  ]);

  const typoCorrections = {
    conditoner: "conditioner",
    electritian: "electrician",
    landscapping: "landscaping",
    plummer: "plumber",
    pluming: "plumbing",
    restaraunt: "restaurant",
    rofer: "roofer",
  };

  const stateAreaMap = {
    houston: "Texas",
    "greater houston": "Texas",
    texas: "Texas",
    louisiana: "Louisiana",
    "united states": "Nationwide",
    nationwide: "Nationwide",
  };

  const locationTerms = new Set(["greater", "houston", "texas", "louisiana", "nationwide", "united", "states"]);

  let sponsors = [];
  let activeRows = [];
  let liveSponsorRows = null;
  let liveSponsorRowsPromise = null;
  let mobileSearchLocked = false;
  const sponsorCacheKey = "mb-show-sponsor-directory-v4";
  const sponsorCacheMs = Number(directoryConfig.browserCacheMs ?? 60 * 60 * 1000);

  const directoryState = {
    query: "",
    state: "",
    area: "",
    category: "",
    resultMode: "match",
  };

  function isMobileSearchViewport() {
    return window.matchMedia("(max-width: 720px)").matches;
  }

  function focusInputWithoutScroll() {
    try {
      input.focus({ preventScroll: true });
    } catch (_) {
      input.focus();
    }

    const cursorPosition = input.value.length;
    if (typeof input.setSelectionRange === "function") {
      input.setSelectionRange(cursorPosition, cursorPosition);
    }
  }

  function lockMobileSearchToTop() {
    if (!isMobileSearchViewport()) return;
    mobileSearchLocked = true;
    document.body.classList.add("sponsor-search-locked");

    const targetTop = window.scrollY + form.getBoundingClientRect().top;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const nextTop = Math.max(0, Math.min(targetTop, maxScroll));

    if (Math.abs(window.scrollY - nextTop) > 6) {
      window.scrollTo({
        top: nextTop,
        behavior: "auto",
      });
    }
  }

  function unlockMobileSearch() {
    mobileSearchLocked = false;
    document.body.classList.remove("sponsor-search-locked");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function labelSort(a, b) {
    const priority = { Texas: 0, Louisiana: 1, Nationwide: 2 };
    return (priority[a] ?? 20) - (priority[b] ?? 20) || a.localeCompare(b);
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\ba\s*\/\s*c\b/g, " ac ")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function searchTokens(value) {
    const normalized = normalizeSearchText(value);
    return normalized ? normalized.split(" ") : [];
  }

  function searchTextIncludes(text, term) {
    const normalizedTerm = normalizeSearchText(term);
    if (!normalizedTerm) return false;
    return ` ${text} `.includes(` ${normalizedTerm} `);
  }

  function termVariants(term) {
    const normalized = normalizeSearchText(term);
    const variants = [normalized];
    if (normalized.endsWith("ies") && normalized.length > 4) variants.push(`${normalized.slice(0, -3)}y`);
    if (normalized.endsWith("ers") && normalized.length > 5) variants.push(normalized.slice(0, -1));
    if (normalized.endsWith("s") && normalized.length > 3) variants.push(normalized.slice(0, -1));
    return unique(variants.filter(Boolean));
  }

  function normalizeSponsor(sponsor) {
    const serviceAreas = normalizeArray(sponsor.service_areas);
    const explicitStates = normalizeArray(sponsor.states);
    const derivedStates = serviceAreas
      .map((area) => stateAreaMap[String(area).toLowerCase()])
      .filter(Boolean);
    const states = unique([...explicitStates, ...derivedStates]).sort(labelSort);
    const cities = unique([
      ...normalizeArray(sponsor.cities),
      ...serviceAreas.filter((area) => ["Houston", "Greater Houston"].includes(area)),
    ]);

    return {
      ...sponsor,
      slug: sponsor.slug || slugify(sponsor.name),
      website_url: sponsor.website_url || sponsor.website,
      services: normalizeArray(sponsor.services),
      service_areas: serviceAreas,
      cities,
      states,
      keywords: normalizeArray(sponsor.keywords),
      admin_keywords: normalizeArray(sponsor.admin_keywords),
      premium_tier: sponsor.premium_tier || "standard",
      premium_rank: Number(sponsor.premium_rank || 0),
      is_featured: Boolean(sponsor.is_featured),
    };
  }

  function directQueryTerms(query) {
    return unique(
      searchTokens(query)
        .map((term) => typoCorrections[term] || term)
        .flatMap(termVariants)
        .filter((term) => term.length > 1 && !stopTerms.has(term)),
    );
  }

  function searchIntentTerms(query) {
    return directQueryTerms(query).filter((term) => !locationTerms.has(term.toLowerCase()));
  }

  function matchedSynonyms(query) {
    const lower = normalizeSearchText(query);
    return Object.entries(synonyms).filter(([phrase]) => searchTextIncludes(lower, phrase));
  }

  function queryModel(query) {
    const matches = matchedSynonyms(query);
    const consumedTerms = new Set(matches.flatMap(([phrase]) => searchTokens(phrase)));
    const directTerms = directQueryTerms(query).filter((term) => !consumedTerms.has(term));
    const matchedPhrases = matches.map(([phrase]) => normalizeSearchText(phrase));
    const extra = matches.flatMap(([, terms]) => terms);
    const direct = unique([...matchedPhrases, ...directTerms].map(normalizeSearchText).filter(Boolean));
    const expanded = unique([...direct, ...extra].map(normalizeSearchText).filter(Boolean));
    return { direct, expanded, hasIntent: matches.length > 0 };
  }

  function scoreSponsor(sponsor, terms) {
    const fieldGroups = [
      { value: sponsor.name, weight: 8 },
      { value: sponsor.category, weight: 7 },
      { value: (sponsor.services || []).join(" "), weight: 6 },
      { value: [...(sponsor.keywords || []), ...(sponsor.admin_keywords || [])].join(" "), weight: 5 },
      { value: sponsor.description, weight: 3 },
    ];
    const phoneDigits = String(sponsor.phone || "").replace(/\D/g, "");

    return terms.reduce((score, term) => {
      const normalizedTerm = normalizeSearchText(term);
      if (!normalizedTerm || locationTerms.has(normalizedTerm)) return score;

      const termDigits = normalizedTerm.replace(/\D/g, "");
      const phoneScore = termDigits.length >= 3 && phoneDigits.includes(termDigits) ? 10 : 0;
      const fieldScore = fieldGroups.reduce((fieldTotal, field) => {
        const text = normalizeSearchText(field.value);
        if (!text) return fieldTotal;
        if (searchTextIncludes(text, normalizedTerm)) {
          return fieldTotal + field.weight * (normalizedTerm.includes(" ") ? 3 : 2);
        }
        return fieldTotal;
      }, 0);

      return score + phoneScore + fieldScore;
    }, 0);
  }

  function sponsorMatchesFilters(sponsor) {
    const matchesCategory = !directoryState.category || sponsor.category === directoryState.category;
    return matchesCategory;
  }

  function sponsorMatchesQueryLocation(sponsor) {
    void sponsor;
    // Do not filter public results by claimed service area. Many sponsors serve
    // different territories, and listeners should confirm coverage with the sponsor.
    return true;
  }

  function supabaseRestHeaders(extraHeaders = {}) {
    const headers = {
      apikey: config.publishableKey,
      ...extraHeaders,
    };

    if (!String(config.publishableKey).startsWith("sb_publishable_")) {
      headers.authorization = `Bearer ${config.publishableKey}`;
    }

    return headers;
  }

  function readSponsorCache() {
    if (!window.localStorage || sponsorCacheMs <= 0) return null;
    try {
      const cached = JSON.parse(window.localStorage.getItem(sponsorCacheKey) || "null");
      if (!cached || !Array.isArray(cached.sponsors) || !cached.cachedAt) return null;
      if (Date.now() - Number(cached.cachedAt) > sponsorCacheMs) return null;
      return cached.sponsors.map(normalizeSponsor);
    } catch (_) {
      return null;
    }
  }

  function writeSponsorCache(rows) {
    if (!window.localStorage || sponsorCacheMs <= 0 || !Array.isArray(rows)) return;
    try {
      window.localStorage.setItem(
        sponsorCacheKey,
        JSON.stringify({
          cachedAt: Date.now(),
          sponsors: rows,
        }),
      );
    } catch (_) {}
  }

  function sponsorEndpoint() {
    return directoryConfig.sponsorEndpoint || "/api/sponsors";
  }

  async function fetchFromSponsorEndpoint() {
    const response = await fetch(sponsorEndpoint(), {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Sponsor endpoint responded ${response.status}`);
    const data = await response.json();
    const rows = Array.isArray(data.sponsors) ? data.sponsors : [];
    return rows.map(normalizeSponsor);
  }

  async function fetchFromSupabaseDirect() {
    if (!config.url || !config.publishableKey) return null;

    const selectFields = [
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

    const response = await fetch(
      `${config.url}/rest/v1/sponsors?select=${encodeURIComponent(selectFields)}&sponsor_status=eq.active&order=name.asc`,
      {
        method: "GET",
        headers: supabaseRestHeaders(),
      },
    );

    if (!response.ok) return null;
    const rows = await response.json();
    return rows.map(normalizeSponsor);
  }

  async function getLiveSponsorRows() {
    if (liveSponsorRows) return liveSponsorRows;

    const cachedRows = readSponsorCache();
    if (cachedRows) {
      liveSponsorRows = cachedRows;
      return liveSponsorRows;
    }

    if (liveSponsorRowsPromise) return liveSponsorRowsPromise;

    liveSponsorRowsPromise = fetchFromSponsorEndpoint()
      .catch(() => fetchFromSupabaseDirect())
      .then((rows) => {
        if (Array.isArray(rows) && rows.length) {
          liveSponsorRows = rows;
          writeSponsorCache(rows);
        }
        return liveSponsorRows;
      })
      .finally(() => {
        liveSponsorRowsPromise = null;
      });

    return liveSponsorRowsPromise;
  }

  async function recordSponsorLead(link) {
    if (!config.url || !config.publishableKey) return;

    await fetch(`${config.url}/rest/v1/sponsor_leads`, {
      method: "POST",
      headers: supabaseRestHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({
        search_query: directoryState.query,
        lead_type: "click",
        metadata: { sponsor_slug: link.dataset.sponsorSlug },
      }),
      keepalive: true,
    }).catch(() => {});
  }

  async function loadFallbackSponsors() {
    const response = await fetch("./data/sponsors.enriched.json");
    const data = await response.json();
    return data.sponsors.map(normalizeSponsor);
  }

  function renderFilters() {
    list.classList.remove("list-view");
    list.classList.add("card-view");
  }

  function filterSponsors(rows) {
    const model = queryModel(directoryState.query);
    const directTerms = model.direct.filter((term) => !locationTerms.has(term.toLowerCase()));
    const expandedTerms = model.expanded.filter((term) => !locationTerms.has(term.toLowerCase()));
    const candidates = rows.filter(sponsorMatchesFilters).filter(sponsorMatchesQueryLocation);
    const exactRows = candidates
      .map((sponsor) => ({ sponsor, score: scoreSponsor(sponsor, directTerms) }))
      .filter((row) => !directTerms.length || row.score > 0);
    const relatedRows =
      !exactRows.length && model.hasIntent
        ? candidates
            .map((sponsor) => ({ sponsor, score: scoreSponsor(sponsor, expandedTerms) }))
            .filter((row) => !expandedTerms.length || row.score > 0)
        : [];
    const scoredRows = exactRows.length
      ? exactRows
      : relatedRows;
    directoryState.resultMode = exactRows.length || !model.hasIntent ? "match" : "related";
    const filtered = scoredRows
      .sort((a, b) => {
        if ((exactRows.length ? directTerms : expandedTerms).length && b.score !== a.score) return b.score - a.score;
        return a.sponsor.name.localeCompare(b.sponsor.name);
      });

    return filtered.map((row) => row.sponsor);
  }

  function resultSummary(total, start, end) {
    const parts = [];
    if (directoryState.query) parts.push(`matching "${directoryState.query}"`);
    if (directoryState.category) parts.push(`in ${directoryState.category}`);
    const suffix = parts.length ? ` ${parts.join(", ")}` : "";

    const label = directoryState.resultMode === "related" ? "related sponsor" : "sponsor";
    if (!total) return `No sponsors${suffix}`;
    if (end >= total) return `Showing all ${total} ${label}${total === 1 ? "" : "s"}${suffix}`;
    return `Showing ${start}-${end} of ${total} ${label}${total === 1 ? "" : "s"}${suffix}`;
  }

  function sponsorCard(sponsor) {
    const services = (sponsor.services || []).join(" · ");
    const detailsId = `sponsor-details-${escapeHtml(sponsor.slug || slugify(sponsor.name))}`;
    const website = sponsor.website_url || "";
    const phone = String(sponsor.phone || "").trim();
    const phoneLine = phone
      ? `<span class="sponsor-card-phone">${escapeHtml(phone)}</span>`
      : "";
    const websiteLink = website
      ? `<a class="sponsor-card-website" href="${escapeHtml(website)}" target="_blank" rel="noreferrer" data-sponsor-slug="${escapeHtml(sponsor.slug || "")}">Website</a>`
      : `<span class="sponsor-card-website is-disabled">No website</span>`;

    return `<article class="sponsor-card" data-sponsor-card>
      <button class="sponsor-card-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}">
        <span class="sponsor-card-name">${escapeHtml(sponsor.name)}</span>
        ${phoneLine}
        <span class="sponsor-card-cue">Details</span>
      </button>
      ${websiteLink}
      <div class="sponsor-details" id="${detailsId}" hidden>
        <p>${escapeHtml(sponsor.description || services || "Michael Berry Show sponsor.")}</p>
        <dl>
          <div>
            <dt>Category</dt>
            <dd>${escapeHtml(sponsor.category || "Sponsor")}</dd>
          </div>
          <div>
            <dt>Services</dt>
            <dd>${escapeHtml(services || "Show sponsor")}</dd>
          </div>
        </dl>
      </div>
    </article>`;
  }

  function renderRows() {
    const total = activeRows.length;
    const visibleRows = activeRows;
    const start = total ? 1 : 0;
    const end = visibleRows.length;

    viewControls.hidden = true;
    count.textContent = resultSummary(total, start, end);
    list.hidden = false;
    list.innerHTML = visibleRows.length
      ? visibleRows.map(sponsorCard).join("")
      : `<article class="sponsor-empty">
          <span>No results</span>
          <h3>Try a broader search</h3>
          <p>Search for a related service like HVAC, patio, roofing, or attorney.</p>
        </article>`;

    moreResults.hidden = true;
    moreResults.innerHTML = "";
  }

  function updateSponsors() {
    const rows = liveSponsorRows || sponsors;
    activeRows = filterSponsors(rows);
    renderRows();
  }

  function resetPageAndUpdate() {
    updateSponsors();
  }

  list.addEventListener("click", async (event) => {
    const link = event.target.closest("a[data-sponsor-slug]");
    if (link) {
      await recordSponsorLead(link);
      return;
    }

    if (event.target.closest(".sponsor-details")) return;
    const card = event.target.closest("[data-sponsor-card]");
    if (!card) return;
    const button = card.querySelector(".sponsor-card-toggle");
    const details = card.querySelector(".sponsor-details");
    const cue = card.querySelector(".sponsor-card-cue");
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    card.classList.toggle("is-expanded", !expanded);
    details.hidden = expanded;
    if (cue) cue.textContent = expanded ? "Details" : "Hide details";
  });

  input.addEventListener("input", () => {
    directoryState.query = input.value.trim();
    resetPageAndUpdate();
  });

  input.addEventListener("pointerdown", (event) => {
    if (!isMobileSearchViewport() || mobileSearchLocked) return;
    event.preventDefault();
    lockMobileSearchToTop();
    focusInputWithoutScroll();
  });

  input.addEventListener("focus", () => {
    if (!mobileSearchLocked) lockMobileSearchToTop();
  });

  input.addEventListener("blur", () => {
    unlockMobileSearch();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    directoryState.query = input.value.trim();
    resetPageAndUpdate();
  });

  loadFallbackSponsors()
    .then((rows) => {
      sponsors = rows;
      renderFilters();
      updateSponsors();
      return getLiveSponsorRows();
    })
    .then(() => {
      updateSponsors();
    })
    .catch(() => {
      count.textContent = "Sponsor listings unavailable";
      list.innerHTML = "";
      moreResults.innerHTML = "";
    });
})();
