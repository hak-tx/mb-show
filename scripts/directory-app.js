(function () {
  const config = window.MB_SHOW_SUPABASE || {};
  const form = document.querySelector("#sponsor-search-form");
  const input = document.querySelector("#sponsor-search");
  const list = document.querySelector("#sponsor-list");
  const count = document.querySelector("#sponsor-result-count");
  const pagination = document.querySelector("#sponsor-pagination");
  const stateFilter = document.querySelector("#sponsor-state-filter");
  const areaFilter = document.querySelector("#sponsor-area-filter");
  const categoryFilter = document.querySelector("#sponsor-category-filter");
  const pageSizeSelect = document.querySelector("#sponsor-page-size");
  const clearButton = document.querySelector("#sponsor-clear-filters");
  const viewButtons = Array.from(document.querySelectorAll("[data-view]"));

  const synonyms = {
    patio: ["outdoor kitchen", "outdoor living", "pavers", "landscape", "shade", "backyard"],
    hvac: ["air conditioning", "ac repair", "heating", "cooling", "trane"],
    ac: ["hvac", "air conditioning", "cooling"],
    plumbing: ["plumber", "water heater", "drain", "leak"],
    generator: ["backup power", "electrical"],
    roof: ["roofing", "siding", "home improvement"],
    foundation: ["foundation repair", "slab"],
  };

  const stateAreaMap = {
    houston: "Texas",
    "greater houston": "Texas",
    texas: "Texas",
    louisiana: "Louisiana",
    "united states": "Nationwide",
    nationwide: "Nationwide",
  };

  let sponsors = [];
  let activeRows = [];

  const directoryState = {
    query: "",
    state: "",
    area: "",
    category: "",
    page: 1,
    pageSize: 12,
    view: window.localStorage.getItem("mbSponsorView") || "cards",
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
      is_featured: Boolean(sponsor.is_featured),
    };
  }

  function expandQuery(query) {
    const lower = query.toLowerCase();
    const extra = Object.entries(synonyms)
      .filter(([phrase]) => lower.includes(phrase))
      .flatMap(([, terms]) => terms);
    return unique([...query.split(/\s+/), ...extra].map((term) => term.trim()).filter(Boolean));
  }

  function scoreSponsor(sponsor, terms) {
    if (!terms.length) return 0;

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
    const tierBoost = { exclusive: 4, premium: 3, featured: 1.75, standard: 0 }[sponsor.premium_tier || "standard"] || 0;
    return matches + tierBoost + (exactName ? 2 : 0) + (sponsor.is_featured ? 1 : 0);
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
        state_filter: directoryState.state === "Nationwide" ? "United States" : directoryState.state,
        area_filter: directoryState.area,
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

  function renderOptions(select, values, firstLabel) {
    const current = select.value;
    select.innerHTML = [
      `<option value="">${escapeHtml(firstLabel)}</option>`,
      ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
    ].join("");
    select.value = values.includes(current) ? current : "";
  }

  function renderFilters() {
    const stateOptions = unique(sponsors.flatMap((sponsor) => sponsor.states)).sort(labelSort);
    const areaOptions = unique(sponsors.flatMap((sponsor) => sponsor.service_areas)).sort(labelSort);
    const categoryOptions = unique(sponsors.map((sponsor) => sponsor.category)).sort(labelSort);

    renderOptions(stateFilter, stateOptions, "All states");
    renderOptions(areaFilter, areaOptions, "All areas");
    renderOptions(categoryFilter, categoryOptions, "All categories");
    pageSizeSelect.value = String(directoryState.pageSize);
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
    const terms = expandQuery(directoryState.query).map((term) => term.toLowerCase());
    const filtered = rows
      .filter(sponsorMatchesFilters)
      .map((sponsor) => ({ sponsor, score: scoreSponsor(sponsor, terms) }))
      .filter((row) => !terms.length || row.score > 0)
      .sort((a, b) => {
        if (terms.length && b.score !== a.score) return b.score - a.score;
        if (b.sponsor.is_featured !== a.sponsor.is_featured) return Number(b.sponsor.is_featured) - Number(a.sponsor.is_featured);
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
    const total = activeRows.length;
    const pageCount = Math.max(1, Math.ceil(total / directoryState.pageSize));
    directoryState.page = Math.min(directoryState.page, pageCount);
    const startIndex = (directoryState.page - 1) * directoryState.pageSize;
    const visibleRows = activeRows.slice(startIndex, startIndex + directoryState.pageSize);
    const start = total ? startIndex + 1 : 0;
    const end = total ? startIndex + visibleRows.length : 0;

    count.textContent = resultSummary(total, start, end);
    list.innerHTML = visibleRows.length
      ? visibleRows.map(sponsorCard).join("")
      : `<article class="sponsor-empty">
          <span>No results</span>
          <h3>Try a broader search</h3>
          <p>Clear a filter or search for a related service like HVAC, patio, roofing, or attorney.</p>
        </article>`;

    renderPagination(pageCount);
  }

  function pageButton(label, page, options = {}) {
    const disabled = options.disabled ? " disabled" : "";
    const current = options.current ? ' aria-current="page"' : "";
    return `<button type="button" data-page="${page}"${disabled}${current}>${escapeHtml(label)}</button>`;
  }

  function renderPagination(pageCount) {
    if (activeRows.length <= directoryState.pageSize) {
      pagination.innerHTML = "";
      return;
    }

    const pages = [];
    const first = Math.max(1, directoryState.page - 2);
    const last = Math.min(pageCount, directoryState.page + 2);
    pages.push(pageButton("Previous", directoryState.page - 1, { disabled: directoryState.page === 1 }));
    for (let page = first; page <= last; page += 1) {
      pages.push(pageButton(String(page), page, { current: page === directoryState.page }));
    }
    pages.push(pageButton("Next", directoryState.page + 1, { disabled: directoryState.page === pageCount }));
    pagination.innerHTML = pages.join("");
  }

  async function updateSponsors() {
    const remoteRows = await fetchFromSupabase();
    const rows = remoteRows || sponsors;
    activeRows = filterSponsors(rows);
    renderRows();
  }

  function resetPageAndUpdate() {
    directoryState.page = 1;
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

  pagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    directoryState.page = Number(button.dataset.page);
    renderRows();
    count.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  [stateFilter, areaFilter, categoryFilter].forEach((select) => {
    select.addEventListener("change", () => {
      directoryState.state = stateFilter.value;
      directoryState.area = areaFilter.value;
      directoryState.category = categoryFilter.value;
      resetPageAndUpdate();
    });
  });

  pageSizeSelect.addEventListener("change", () => {
    directoryState.pageSize = Number(pageSizeSelect.value);
    resetPageAndUpdate();
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    directoryState.query = "";
    directoryState.state = "";
    directoryState.area = "";
    directoryState.category = "";
    stateFilter.value = "";
    areaFilter.value = "";
    categoryFilter.value = "";
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
      count.textContent = "Sponsor directory unavailable";
      list.innerHTML = "";
      pagination.innerHTML = "";
    });
})();
