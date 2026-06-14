(function () {
  const config = window.MB_SHOW_SUPABASE || {};
  const form = document.querySelector("#sponsor-search-form");
  const input = document.querySelector("#sponsor-search");
  const list = document.querySelector("#sponsor-list");
  const count = document.querySelector("#sponsor-result-count");
  const moreResults = document.querySelector("#sponsor-more-results");
  const viewControls = document.querySelector("#sponsor-view-controls");
  const viewButtons = Array.from(document.querySelectorAll("[data-view]"));

  const synonyms = {
    patio: ["outdoor kitchen", "outdoor living", "pavers", "pool deck", "patio cover", "pergola", "shade", "backyard"],
    hvac: ["air conditioning", "ac repair", "heating", "cooling", "trane"],
    ac: ["hvac", "air conditioning", "cooling"],
    plumbing: ["plumber", "water heater", "drain cleaning", "sewer line", "leak repair", "repiping"],
    generator: ["whole home generator", "standby generator", "backup generator", "backup power", "generac"],
    roof: ["roofing", "roof replacement", "roof repair", "roofer"],
    foundation: ["foundation repair", "slab repair", "pier and beam", "house leveling"],
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

  const directoryState = {
    query: "",
    state: "",
    area: "",
    category: "",
    pageSize: 12,
    visibleCount: 12,
    view: window.localStorage.getItem("mbSponsorView") || "list",
  };

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
    return unique(query.split(/\s+/).map((term) => term.trim()).filter(Boolean));
  }

  function searchIntentTerms(query) {
    return directQueryTerms(query).filter((term) => !locationTerms.has(term.toLowerCase()));
  }

  function expandQuery(query) {
    const lower = query.toLowerCase();
    const extra = Object.entries(synonyms)
      .filter(([phrase]) => lower.includes(phrase))
      .flatMap(([, terms]) => terms);
    return unique([...query.split(/\s+/), ...extra].map((term) => term.trim()).filter(Boolean));
  }

  function scoreSponsor(sponsor, terms) {
    const text = [
      sponsor.name,
      sponsor.category,
      sponsor.description,
      sponsor.phone,
      ...(sponsor.services || []),
      ...(sponsor.service_areas || []),
      ...(sponsor.states || []),
      ...(sponsor.keywords || []),
      ...(sponsor.admin_keywords || []),
    ]
      .join(" ")
      .toLowerCase();

    const sponsorName = String(sponsor.name || "").toLowerCase();
    const exactName = terms.some((term) => sponsorName.includes(term));
    const matches = terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
    return matches + (exactName ? 2 : 0);
  }

  function sponsorMatchesFilters(sponsor) {
    const matchesState =
      !directoryState.state ||
      sponsor.states.includes(directoryState.state) ||
      sponsor.service_areas.includes(directoryState.state);
    const matchesArea = !directoryState.area || sponsor.service_areas.includes(directoryState.area);
    const matchesCategory = !directoryState.category || sponsor.category === directoryState.category;
    return matchesState && matchesArea && matchesCategory;
  }

  function sponsorMatchesQueryLocation(sponsor) {
    const query = directoryState.query.toLowerCase();
    const areaText = [...sponsor.service_areas, ...sponsor.cities, ...sponsor.states].join(" ").toLowerCase();
    if (query.includes("houston") && !areaText.includes("houston")) return false;
    if (query.includes("texas") && !areaText.includes("texas")) return false;
    if (query.includes("louisiana") && !areaText.includes("louisiana")) return false;
    return true;
  }

  function hasActiveCriteria() {
    return Boolean(directoryState.query);
  }

  async function fetchFromSupabase() {
    if (!config.url || !config.publishableKey) return null;

    const response = await fetch(`${config.url}/rest/v1/rpc/search_sponsors`, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        authorization: `Bearer ${config.publishableKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        search_query: directoryState.query,
        city_filter: null,
        state_filter: null,
        area_filter: null,
        result_limit: 100,
      }),
    });

    if (!response.ok) return null;
    const rows = await response.json();
    return rows.map(normalizeSponsor);
  }

  async function loadFallbackSponsors() {
    const response = await fetch("./data/sponsors.enriched.json");
    const data = await response.json();
    return data.sponsors.map(normalizeSponsor);
  }

  function renderFilters() {
    syncViewButtons();
  }

  function syncViewButtons() {
    list.classList.toggle("list-view", directoryState.view === "list");
    list.classList.toggle("card-view", directoryState.view !== "list");
    viewButtons.forEach((button) => {
      const selected = button.dataset.view === directoryState.view;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function filterSponsors(rows) {
    const terms = unique([
      ...searchIntentTerms(directoryState.query),
      ...expandQuery(directoryState.query).filter((term) => !locationTerms.has(term.toLowerCase())),
    ]).map((term) => term.toLowerCase());
    const filtered = rows
      .filter(sponsorMatchesFilters)
      .filter(sponsorMatchesQueryLocation)
      .map((sponsor) => ({ sponsor, score: scoreSponsor(sponsor, terms) }))
      .filter((row) => !terms.length || row.score > 0)
      .sort((a, b) => {
        if (terms.length && b.score !== a.score) return b.score - a.score;
        return a.sponsor.name.localeCompare(b.sponsor.name);
      });

    return filtered.map((row) => row.sponsor);
  }

  function resultSummary(total, start, end) {
    const parts = [];
    if (directoryState.query) parts.push(`matching "${directoryState.query}"`);
    if (directoryState.state) parts.push(`in ${directoryState.state}`);
    if (directoryState.area) parts.push(`around ${directoryState.area}`);
    if (directoryState.category) parts.push(`in ${directoryState.category}`);
    const suffix = parts.length ? ` ${parts.join(", ")}` : "";

    if (!total) return `No sponsors${suffix}`;
    if (end >= total) return `Showing all ${total} sponsor${total === 1 ? "" : "s"}${suffix}`;
    return `Showing ${start}-${end} of ${total} sponsor${total === 1 ? "" : "s"}${suffix}`;
  }

  function sponsorCard(sponsor) {
    const services = (sponsor.services || []).slice(0, 5).join(" · ");
    const areas = (sponsor.service_areas || []).slice(0, 4).join(" · ");
    const states = (sponsor.states || []).join(" · ");
    const meta = [areas, states && `State: ${states}`].filter(Boolean).join(" | ");
    return `<article>
      <div>
        <span>${escapeHtml(sponsor.category || "Sponsor")}</span>
        <h3>${escapeHtml(sponsor.name)}</h3>
        <p>${escapeHtml(sponsor.phone || services || "Show sponsor")}</p>
        <p class="sponsor-meta">${escapeHtml(meta || services)}</p>
      </div>
      <a href="${escapeHtml(sponsor.website_url)}" target="_blank" rel="noreferrer" data-sponsor-slug="${escapeHtml(sponsor.slug || "")}">Visit website</a>
    </article>`;
  }

  function renderRows() {
    if (!hasActiveCriteria()) {
      viewControls.hidden = true;
      count.textContent = "Search to see matching show sponsors.";
      list.hidden = true;
      list.innerHTML = "";
      moreResults.hidden = true;
      moreResults.innerHTML = "";
      return;
    }

    const total = activeRows.length;
    const visibleCount = Math.min(directoryState.visibleCount, total);
    const visibleRows = activeRows.slice(0, visibleCount);
    const start = total ? 1 : 0;
    const end = visibleRows.length;

    viewControls.hidden = false;
    count.textContent = resultSummary(total, start, end);
    list.hidden = false;
    list.innerHTML = visibleRows.length
      ? visibleRows.map(sponsorCard).join("")
      : `<article class="sponsor-empty">
          <span>No results</span>
          <h3>Try a broader search</h3>
          <p>Search for a related service like HVAC, patio, roofing, or attorney.</p>
        </article>`;

    renderMoreButton(total, end);
  }

  function renderMoreButton(total, visibleCount) {
    if (total <= visibleCount) {
      moreResults.hidden = true;
      moreResults.innerHTML = "";
      return;
    }

    const remaining = total - visibleCount;
    moreResults.hidden = false;
    moreResults.innerHTML = `<button type="button" data-load-more>More</button><span>${remaining} more sponsor${remaining === 1 ? "" : "s"}</span>`;
  }

  async function updateSponsors() {
    if (!hasActiveCriteria()) {
      activeRows = [];
      renderRows();
      return;
    }

    const remoteRows = await fetchFromSupabase();
    const rows = remoteRows || sponsors;
    activeRows = filterSponsors(rows);
    renderRows();
  }

  function resetPageAndUpdate() {
    directoryState.visibleCount = directoryState.pageSize;
    updateSponsors();
  }

  list.addEventListener("click", async (event) => {
    const link = event.target.closest("a[data-sponsor-slug]");
    if (!link || !config.url || !config.publishableKey) return;
    await fetch(`${config.url}/rest/v1/sponsor_leads`, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        authorization: `Bearer ${config.publishableKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        search_query: directoryState.query,
        lead_type: "click",
        metadata: { sponsor_slug: link.dataset.sponsorSlug },
      }),
      keepalive: true,
    }).catch(() => {});
  });

  moreResults.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-load-more]");
    if (!button) return;
    directoryState.visibleCount += directoryState.pageSize;
    renderRows();
  });

  input.addEventListener("input", () => {
    directoryState.query = input.value.trim();
    resetPageAndUpdate();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    directoryState.query = input.value.trim();
    resetPageAndUpdate();
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      directoryState.view = button.dataset.view;
      window.localStorage.setItem("mbSponsorView", directoryState.view);
      syncViewButtons();
    });
  });

  loadFallbackSponsors()
    .then((rows) => {
      sponsors = rows;
      renderFilters();
      updateSponsors();
    })
    .catch(() => {
      count.textContent = "Sponsor listings unavailable";
      list.innerHTML = "";
      moreResults.innerHTML = "";
    });
})();
