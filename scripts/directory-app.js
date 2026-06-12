(function () {
  const config = window.MB_SHOW_SUPABASE || {};
  const form = document.querySelector("#sponsor-search-form");
  const input = document.querySelector("#sponsor-search");
  const list = document.querySelector("#sponsor-list");
  const count = document.querySelector("#sponsor-result-count");

  const synonyms = {
    patio: ["outdoor kitchen", "outdoor living", "pavers", "landscape", "shade", "backyard"],
    hvac: ["air conditioning", "ac repair", "heating", "cooling", "trane"],
    ac: ["hvac", "air conditioning", "cooling"],
    plumbing: ["plumber", "water heater", "drain", "leak"],
    generator: ["backup power", "electrical"],
    roof: ["roofing", "siding", "home improvement"],
    foundation: ["foundation repair", "slab"],
  };

  let sponsors = [];

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

  function expandQuery(query) {
    const lower = query.toLowerCase();
    const extra = Object.entries(synonyms)
      .filter(([phrase]) => lower.includes(phrase))
      .flatMap(([, terms]) => terms);
    return [...query.split(/\s+/), ...extra].filter(Boolean);
  }

  function scoreSponsor(sponsor, terms) {
    const text = [
      sponsor.name,
      sponsor.category,
      sponsor.description,
      sponsor.phone,
      ...(sponsor.services || []),
      ...(sponsor.service_areas || []),
      ...(sponsor.keywords || []),
    ]
      .join(" ")
      .toLowerCase();
    const exactName = terms.some((term) => sponsor.name.toLowerCase().includes(term));
    const matches = terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
    const tierBoost = { exclusive: 4, premium: 3, featured: 1.75, standard: 0 }[sponsor.premium_tier || "standard"] || 0;
    return matches + tierBoost + (exactName ? 2 : 0) + (sponsor.is_featured ? 1 : 0);
  }

  async function fetchFromSupabase(query) {
    if (!config.url || !config.publishableKey) return null;

    const response = await fetch(`${config.url}/rest/v1/rpc/search_sponsors`, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        authorization: `Bearer ${config.publishableKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        search_query: query,
        city_filter: null,
        state_filter: null,
        area_filter: null,
        result_limit: 40,
      }),
    });

    if (!response.ok) return null;
    return response.json();
  }

  async function loadFallbackSponsors() {
    const response = await fetch("./data/sponsors.enriched.json");
    const data = await response.json();
    return data.sponsors.map((sponsor) => ({
      ...sponsor,
      slug: slugify(sponsor.name),
      premium_tier: "standard",
      is_featured: false,
    }));
  }

  function render(rows, query) {
    list.innerHTML = rows
      .map((sponsor) => {
        const services = (sponsor.services || []).slice(0, 4).join(" · ");
        const areas = (sponsor.service_areas || []).slice(0, 3).join(" · ");
        return `<article>
          <span>${escapeHtml(sponsor.category || "Sponsor")}</span>
          <h3>${escapeHtml(sponsor.name)}</h3>
          <p>${escapeHtml(sponsor.phone || services || "Show sponsor")}</p>
          <p class="sponsor-meta">${escapeHtml(areas || services)}</p>
          <a href="${escapeHtml(sponsor.website_url)}" target="_blank" rel="noreferrer" data-sponsor-slug="${escapeHtml(sponsor.slug || "")}">Visit sponsor</a>
        </article>`;
      })
      .join("");

    count.textContent = query
      ? `${rows.length} sponsor${rows.length === 1 ? "" : "s"} matching "${query}"`
      : `Showing ${rows.length} sponsors`;
  }

  async function updateSponsors() {
    const query = input.value.trim();
    const remoteRows = await fetchFromSupabase(query);

    if (remoteRows) {
      render(remoteRows, query);
      return;
    }

    const terms = expandQuery(query).map((term) => term.toLowerCase());
    const rows = query
      ? sponsors
          .map((sponsor) => ({ sponsor, score: scoreSponsor(sponsor, terms) }))
          .filter((row) => row.score > 0)
          .sort((a, b) => b.score - a.score || a.sponsor.name.localeCompare(b.sponsor.name))
          .slice(0, 40)
          .map((row) => row.sponsor)
      : sponsors.slice(0, 24);

    render(rows, query);
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
        search_query: input.value.trim(),
        lead_type: "click",
        metadata: { sponsor_slug: link.dataset.sponsorSlug },
      }),
      keepalive: true,
    }).catch(() => {});
  });

  input.addEventListener("input", updateSponsors);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateSponsors();
  });

  loadFallbackSponsors()
    .then((rows) => {
      sponsors = rows;
      updateSponsors();
    })
    .catch(() => {
      count.textContent = "Sponsor directory unavailable";
      list.innerHTML = "";
    });
})();
