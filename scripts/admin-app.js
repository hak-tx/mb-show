(function () {
  const config = window.MB_SHOW_SUPABASE || {};
  const status = document.querySelector("#admin-status");
  const authForm = document.querySelector("#auth-form");
  const email = document.querySelector("#admin-email");
  const signOut = document.querySelector("#sign-out");
  const editorPanel = document.querySelector("#editor-panel");
  const rows = document.querySelector("#sponsor-admin-rows");
  const editor = document.querySelector("#sponsor-editor");
  const archiveButton = document.querySelector("#archive-sponsor");
  const deleteButton = document.querySelector("#delete-sponsor");
  const newButton = document.querySelector("#new-sponsor");
  const adminSearch = document.querySelector("#admin-search");
  const keywordEntry = document.querySelector("#sponsor-keyword-entry");
  const addKeywordButton = document.querySelector("#add-keyword");
  const keywordChips = document.querySelector("#keyword-chips");

  const stats = {
    total: document.querySelector("#stat-total"),
    active: document.querySelector("#stat-active"),
    premium: document.querySelector("#stat-premium"),
    archived: document.querySelector("#stat-archived"),
  };

  const fields = {
    id: document.querySelector("#sponsor-id"),
    name: document.querySelector("#sponsor-name"),
    website: document.querySelector("#sponsor-website"),
    phone: document.querySelector("#sponsor-phone"),
    category: document.querySelector("#sponsor-category"),
    services: document.querySelector("#sponsor-services"),
    areas: document.querySelector("#sponsor-areas"),
    keywords: document.querySelector("#sponsor-keywords"),
    status: document.querySelector("#sponsor-status"),
    tier: document.querySelector("#sponsor-tier"),
    rank: document.querySelector("#sponsor-rank"),
    description: document.querySelector("#sponsor-description"),
  };

  const client =
    config.url && config.publishableKey && window.supabase
      ? window.supabase.createClient(config.url, config.publishableKey)
      : null;

  let sponsorRecords = [];
  let currentKeywords = [];
  let previewMode = !client;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function splitList(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function unique(values) {
    return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") return splitList(value);
    return [];
  }

  function normalizeSponsor(sponsor, index = 0) {
    const slug = sponsor.slug || slugify(sponsor.name);
    return {
      ...sponsor,
      id: sponsor.id || `demo-${index}-${slug}`,
      slug,
      website_url: sponsor.website_url || sponsor.website || "",
      services: normalizeArray(sponsor.services),
      service_areas: normalizeArray(sponsor.service_areas),
      keywords: normalizeArray(sponsor.keywords),
      admin_keywords: normalizeArray(sponsor.admin_keywords),
      premium_tier: sponsor.premium_tier || "standard",
      premium_rank: Number(sponsor.premium_rank || 0),
      sponsor_status: sponsor.sponsor_status || "active",
    };
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function setStats() {
    const active = sponsorRecords.filter((sponsor) => sponsor.sponsor_status === "active").length;
    const archived = sponsorRecords.filter((sponsor) => sponsor.sponsor_status === "archived").length;
    const premium = sponsorRecords.filter((sponsor) => sponsor.premium_tier !== "standard").length;

    stats.total.textContent = sponsorRecords.length;
    stats.active.textContent = active;
    stats.premium.textContent = premium;
    stats.archived.textContent = archived;
  }

  function keywordPool(sponsor) {
    const adminKeywords = normalizeArray(sponsor.admin_keywords);
    if (adminKeywords.length) return adminKeywords;
    return normalizeArray(sponsor.keywords).slice(0, 8);
  }

  function renderKeywordChips() {
    fields.keywords.value = currentKeywords.join(", ");
    keywordChips.innerHTML = currentKeywords.length
      ? currentKeywords
          .map(
            (keyword) => `<button type="button" data-keyword="${escapeHtml(keyword)}">
              <span>${escapeHtml(keyword)}</span>
              <strong aria-hidden="true">x</strong>
            </button>`,
          )
          .join("")
      : `<p>No extra keywords yet.</p>`;
  }

  function setEditor(sponsor = {}) {
    fields.id.value = sponsor.id || "";
    fields.name.value = sponsor.name || "";
    fields.website.value = sponsor.website_url || "";
    fields.phone.value = sponsor.phone || "";
    fields.category.value = sponsor.category || "";
    fields.services.value = normalizeArray(sponsor.services).join(", ");
    fields.areas.value = normalizeArray(sponsor.service_areas).join(", ");
    fields.status.value = sponsor.sponsor_status || "active";
    fields.tier.value = sponsor.premium_tier || "standard";
    fields.rank.value = sponsor.premium_rank || 0;
    fields.description.value = sponsor.description || "";
    currentKeywords = keywordPool(sponsor);
    renderKeywordChips();
    archiveButton.hidden = !sponsor.id;
    deleteButton.hidden = !sponsor.id;
    editor.hidden = false;
  }

  function addKeywordsFromEntry() {
    const nextKeywords = splitList(keywordEntry.value);
    if (!nextKeywords.length) return;
    currentKeywords = unique([...currentKeywords, ...nextKeywords]);
    keywordEntry.value = "";
    renderKeywordChips();
  }

  function rowMatchesSearch(sponsor) {
    const query = adminSearch.value.trim().toLowerCase();
    if (!query) return true;
    const text = [
      sponsor.name,
      sponsor.phone,
      sponsor.category,
      sponsor.website_url,
      sponsor.sponsor_status,
      sponsor.premium_tier,
      ...normalizeArray(sponsor.services),
      ...normalizeArray(sponsor.service_areas),
      ...normalizeArray(sponsor.keywords),
      ...normalizeArray(sponsor.admin_keywords),
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(query);
  }

  function statusLabel(value) {
    if (value === "inactive") return "Paused";
    if (value === "archived") return "Archived";
    if (value === "draft") return "Draft";
    return "Active";
  }

  function renderRows() {
    setStats();
    const visibleRecords = sponsorRecords.filter(rowMatchesSearch);
    rows.innerHTML = visibleRecords.length
      ? visibleRecords
          .map((sponsor) => {
            const keywords = unique([...normalizeArray(sponsor.admin_keywords), ...normalizeArray(sponsor.services)]).slice(0, 4);
            const keywordHtml = keywords.length
              ? keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")
              : `<em>No keywords</em>`;
            const websiteLabel = sponsor.website_url ? sponsor.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";

            return `<tr>
              <td>
                <strong>${escapeHtml(sponsor.name)}</strong>
                <small>${escapeHtml([sponsor.phone, websiteLabel].filter(Boolean).join(" | "))}</small>
              </td>
              <td><div class="admin-keyword-list">${keywordHtml}</div></td>
              <td>
                <strong>${escapeHtml(sponsor.premium_tier || "standard")}</strong>
                <small>${escapeHtml(sponsor.category || "General")}</small>
              </td>
              <td><span class="status-pill is-${escapeHtml(sponsor.sponsor_status)}">${statusLabel(sponsor.sponsor_status)}</span></td>
              <td>
                <div class="admin-row-actions">
                  <button type="button" data-action="edit" data-id="${escapeHtml(sponsor.id)}">Edit</button>
                  <button type="button" data-action="delete" data-id="${escapeHtml(sponsor.id)}">Delete</button>
                </div>
              </td>
            </tr>`;
          })
          .join("")
      : `<tr><td colspan="5">No sponsors match that admin search.</td></tr>`;
  }

  async function loadDemoSponsors() {
    const response = await fetch("./data/sponsors.enriched.json");
    const data = await response.json();
    sponsorRecords = data.sponsors.map(normalizeSponsor);
    previewMode = true;
    editorPanel.hidden = false;
    setStatus("Preview mode. Connect Supabase to save live sponsor changes.");
    renderRows();
  }

  async function loadLiveSponsors() {
    const { data, error } = await client
      .from("sponsors")
      .select("id,slug,name,website_url,phone,category,description,services,service_areas,keywords,admin_keywords,premium_tier,premium_rank,sponsor_status")
      .order("name");

    if (error) {
      setStatus(error.message);
      return;
    }

    sponsorRecords = data.map(normalizeSponsor);
    previewMode = false;
    renderRows();
  }

  function upsertPreviewSponsor(payload, id) {
    if (id) {
      sponsorRecords = sponsorRecords.map((sponsor) => (sponsor.id === id ? { ...sponsor, ...payload, id } : sponsor));
      return id;
    }

    const nextId = `demo-${Date.now()}-${payload.slug}`;
    sponsorRecords = [{ ...payload, id: nextId }, ...sponsorRecords];
    return nextId;
  }

  async function saveSponsor(event) {
    event.preventDefault();
    const id = fields.id.value;
    const payload = {
      name: fields.name.value.trim(),
      slug: slugify(fields.name.value),
      website_url: fields.website.value.trim() || null,
      phone: fields.phone.value.trim() || null,
      category: fields.category.value.trim() || "General",
      description: fields.description.value.trim() || null,
      services: splitList(fields.services.value),
      service_areas: splitList(fields.areas.value),
      admin_keywords: currentKeywords,
      premium_tier: fields.tier.value,
      premium_rank: Number(fields.rank.value || 0),
      sponsor_status: fields.status.value,
    };

    if (!payload.name) {
      setStatus("Add a sponsor name before saving.");
      return;
    }

    if (previewMode) {
      const savedId = upsertPreviewSponsor(payload, id);
      setStatus("Saved in preview mode. Connect Supabase when ready to save live changes.");
      renderRows();
      setEditor(sponsorRecords.find((sponsor) => sponsor.id === savedId));
      return;
    }

    const query = id
      ? client.from("sponsors").update(payload).eq("id", id)
      : client.from("sponsors").insert(payload);
    const { error } = await query;
    setStatus(error ? error.message : "Saved.");
    if (!error) {
      await loadLiveSponsors();
      editor.hidden = true;
    }
  }

  async function archiveSponsor() {
    const id = fields.id.value;
    if (!id) return;

    if (previewMode) {
      sponsorRecords = sponsorRecords.map((sponsor) =>
        sponsor.id === id ? { ...sponsor, sponsor_status: "archived" } : sponsor,
      );
      setStatus("Archived in preview mode.");
      renderRows();
      setEditor(sponsorRecords.find((sponsor) => sponsor.id === id));
      return;
    }

    const { error } = await client.from("sponsors").update({ sponsor_status: "archived" }).eq("id", id);
    setStatus(error ? error.message : "Archived.");
    if (!error) await loadLiveSponsors();
  }

  async function deleteSponsorById(id) {
    if (!id) return;
    const sponsor = sponsorRecords.find((record) => record.id === id);
    const name = sponsor ? sponsor.name : "this sponsor";
    if (!window.confirm(`Delete ${name}? This removes the record.`)) return;

    if (previewMode) {
      sponsorRecords = sponsorRecords.filter((record) => record.id !== id);
      setStatus("Deleted in preview mode.");
      renderRows();
      if (fields.id.value === id) editor.hidden = true;
      return;
    }

    const { error } = await client.from("sponsors").delete().eq("id", id);
    setStatus(error ? error.message : "Deleted.");
    if (!error) {
      await loadLiveSponsors();
      if (fields.id.value === id) editor.hidden = true;
    }
  }

  async function refreshSession() {
    if (!client) {
      await loadDemoSponsors();
      return;
    }

    const { data } = await client.auth.getSession();
    const signedIn = Boolean(data.session);
    signOut.hidden = !signedIn;
    editorPanel.hidden = !signedIn;
    setStatus(signedIn ? "Signed in." : "Sign in to manage sponsors.");
    if (signedIn) await loadLiveSponsors();
  }

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) {
      setStatus("Preview mode is active. Add Supabase keys to enable email sign-in.");
      return;
    }

    const { error } = await client.auth.signInWithOtp({
      email: email.value,
      options: { emailRedirectTo: window.location.href },
    });

    setStatus(error ? error.message : "Check your email.");
  });

  signOut.addEventListener("click", async () => {
    if (!client) return;
    await client.auth.signOut();
    await refreshSession();
  });

  newButton.addEventListener("click", () => {
    setEditor();
    fields.name.focus();
  });

  addKeywordButton.addEventListener("click", addKeywordsFromEntry);
  keywordEntry.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addKeywordsFromEntry();
  });

  keywordChips.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-keyword]");
    if (!button) return;
    currentKeywords = currentKeywords.filter((keyword) => keyword !== button.dataset.keyword);
    renderKeywordChips();
  });

  rows.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === "delete") {
      deleteSponsorById(id);
      return;
    }
    setEditor(sponsorRecords.find((sponsor) => sponsor.id === id));
    editor.scrollIntoView({ block: "start", behavior: "smooth" });
  });

  adminSearch.addEventListener("input", renderRows);
  archiveButton.addEventListener("click", archiveSponsor);
  deleteButton.addEventListener("click", () => deleteSponsorById(fields.id.value));
  editor.addEventListener("submit", saveSponsor);

  refreshSession().catch((error) => {
    setStatus(error.message || "Admin workspace unavailable.");
  });
})();
