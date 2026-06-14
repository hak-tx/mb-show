(function () {
  const config = window.MB_SHOW_SUPABASE || {};
  const status = document.querySelector("#admin-status");
  const signOut = document.querySelector("#sign-out");
  const editorPanel = document.querySelector("#editor-panel");
  const rows = document.querySelector("#sponsor-admin-rows");
  const newButton = document.querySelector("#new-sponsor");
  const adminSearch = document.querySelector("#admin-search");

  const stats = {
    total: document.querySelector("#stat-total"),
    active: document.querySelector("#stat-active"),
    premium: document.querySelector("#stat-premium"),
    inactive: document.querySelector("#stat-inactive"),
  };

  const client =
    config.url && config.publishableKey && window.supabase
      ? window.supabase.createClient(config.url, config.publishableKey)
      : null;

  const NEW_SPONSOR_ID = "__new_sponsor__";
  let sponsorRecords = [];
  let editingId = "";
  let deletePendingId = "";
  let previewMode = !client;

  function escapeHtml(value) {
    return String(value ?? "")
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

  function normalizeStatus(value) {
    return !value || value === "active" ? "active" : "inactive";
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
      sponsor_status: normalizeStatus(sponsor.sponsor_status),
    };
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function setStats() {
    const active = sponsorRecords.filter((sponsor) => sponsor.sponsor_status === "active").length;
    const inactive = sponsorRecords.length - active;
    const premium = sponsorRecords.filter((sponsor) => sponsor.premium_tier !== "standard").length;

    stats.total.textContent = sponsorRecords.length;
    stats.active.textContent = active;
    stats.premium.textContent = premium;
    stats.inactive.textContent = inactive;
  }

  function keywordPool(sponsor) {
    const adminKeywords = normalizeArray(sponsor.admin_keywords);
    if (adminKeywords.length) return adminKeywords;
    return normalizeArray(sponsor.keywords).slice(0, 8);
  }

  function displayUrl(url) {
    return String(url || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  function selected(actual, expected) {
    return actual === expected ? " selected" : "";
  }

  function renderKeywordTags(keywords, limit = 5) {
    const visible = keywords.slice(0, limit);
    if (!visible.length) return `<em>No keywords yet</em>`;
    const overflow = keywords.length > limit ? [`+${keywords.length - limit} more`] : [];
    return [...visible, ...overflow].map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("");
  }

  function renderKeywordEditor(keywords) {
    return keywords.length
      ? keywords
          .map(
            (keyword) => `<button class="keyword-chip" type="button" data-action="remove-keyword" data-keyword="${escapeHtml(keyword)}">
              <span>${escapeHtml(keyword)}</span>
              <strong aria-hidden="true">x</strong>
            </button>`,
          )
          .join("")
      : `<p>No extra keywords yet.</p>`;
  }

  function editorFieldId(prefix, sponsorId) {
    return `${prefix}-${slugify(sponsorId || "new") || "new"}`;
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
      sponsor.description,
      ...normalizeArray(sponsor.services),
      ...normalizeArray(sponsor.service_areas),
      ...normalizeArray(sponsor.keywords),
      ...normalizeArray(sponsor.admin_keywords),
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(query);
  }

  function renderSponsorRow(sponsor) {
    const keywords = unique([...normalizeArray(sponsor.admin_keywords), ...normalizeArray(sponsor.services)]);
    const phoneWebsite = [sponsor.phone, displayUrl(sponsor.website_url)].filter(Boolean).join(" | ");
    const isActive = sponsor.sponsor_status === "active";
    const rowClass = editingId === sponsor.id ? " class=\"is-editing\"" : "";

    return `<tr${rowClass}>
      <td>
        <strong>${escapeHtml(sponsor.name)}</strong>
        <small>${escapeHtml(normalizeArray(sponsor.service_areas).join(", ") || "Service area not set")}</small>
      </td>
      <td>${escapeHtml(sponsor.category || "General")}</td>
      <td>
        <strong>${escapeHtml(sponsor.phone || "No phone")}</strong>
        <small>${escapeHtml(displayUrl(sponsor.website_url) || "No website")}</small>
      </td>
      <td><div class="admin-keyword-list">${renderKeywordTags(keywords)}</div></td>
      <td>
        <button
          class="status-toggle ${isActive ? "is-active" : "is-inactive"}"
          type="button"
          data-action="toggle-status"
          data-id="${escapeHtml(sponsor.id)}"
          aria-pressed="${String(isActive)}"
        >${isActive ? "Active" : "Inactive"}</button>
      </td>
      <td>
        <div class="admin-row-actions">
          <button type="button" data-action="edit" data-id="${escapeHtml(sponsor.id)}">Edit</button>
        </div>
      </td>
    </tr>`;
  }

  function renderEditorRow(sponsor = {}) {
    const isNew = !sponsor.id;
    const id = sponsor.id || NEW_SPONSOR_ID;
    const suffix = slugify(id) || "new";
    const keywords = keywordPool(sponsor);
    const title = isNew ? "Add sponsor" : `Edit ${sponsor.name}`;
    const statusValue = normalizeStatus(sponsor.sponsor_status);
    const tierValue = sponsor.premium_tier || "standard";

    const deleteBlock = isNew
      ? ""
      : deletePendingId === sponsor.id
        ? `<div class="delete-confirm">
            <strong>Delete ${escapeHtml(sponsor.name)}?</strong>
            <span>This removes the sponsor record. Use Inactive instead if they may come back.</span>
            <button class="button danger" type="button" data-action="confirm-delete" data-id="${escapeHtml(sponsor.id)}">Confirm delete</button>
            <button class="button secondary" type="button" data-action="cancel-delete">Keep sponsor</button>
          </div>`
        : `<button class="quiet-danger" type="button" data-action="ask-delete" data-id="${escapeHtml(sponsor.id)}">Delete sponsor...</button>`;

    return `<tr class="admin-edit-row">
      <td colspan="6">
        <form class="inline-sponsor-editor" data-editor-form>
          <input type="hidden" name="id" value="${escapeHtml(id)}">
          <input type="hidden" name="admin_keywords" value="${escapeHtml(keywords.join(", "))}">
          <input type="hidden" name="premium_rank" value="${escapeHtml(sponsor.premium_rank || 0)}">

          <div class="inline-editor-heading">
            <div>
              <strong>${escapeHtml(title)}</strong>
              <span>${isNew ? "Create a new sponsor listing." : "Update this sponsor's public directory details."}</span>
            </div>
            <button class="button secondary" type="button" data-action="cancel-edit">Close</button>
          </div>

          <div class="form-section compact-form">
            <h3>Business details</h3>
            <div class="form-grid">
              <div class="form-field">
                <label for="${editorFieldId("sponsor-name", suffix)}">Sponsor name</label>
                <input id="${editorFieldId("sponsor-name", suffix)}" name="name" type="text" value="${escapeHtml(sponsor.name)}" required>
              </div>
              <div class="form-field">
                <label for="${editorFieldId("sponsor-phone", suffix)}">Phone number</label>
                <input id="${editorFieldId("sponsor-phone", suffix)}" name="phone" type="text" value="${escapeHtml(sponsor.phone)}" placeholder="713-555-1212">
              </div>
              <div class="form-field">
                <label for="${editorFieldId("sponsor-website", suffix)}">Website / tracking URL</label>
                <input id="${editorFieldId("sponsor-website", suffix)}" name="website_url" type="url" value="${escapeHtml(sponsor.website_url)}" placeholder="https://sponsor.com/?utm_source=mbshow">
                <p class="field-help">Use a tracking link when a sponsor wants lead reporting.</p>
              </div>
              <div class="form-field">
                <label for="${editorFieldId("sponsor-category", suffix)}">Category</label>
                <input id="${editorFieldId("sponsor-category", suffix)}" name="category" type="text" value="${escapeHtml(sponsor.category)}" placeholder="HVAC, Attorney, Home Improvement">
              </div>
              <div class="form-field">
                <label for="${editorFieldId("sponsor-status", suffix)}">Listing status</label>
                <select id="${editorFieldId("sponsor-status", suffix)}" name="sponsor_status">
                  <option value="active"${selected(statusValue, "active")}>Active - show in directory</option>
                  <option value="inactive"${selected(statusValue, "inactive")}>Inactive - hide for now</option>
                </select>
              </div>
              <div class="form-field">
                <label for="${editorFieldId("sponsor-tier", suffix)}">Listing level</label>
                <select id="${editorFieldId("sponsor-tier", suffix)}" name="premium_tier">
                  <option value="standard"${selected(tierValue, "standard")}>Standard</option>
                  <option value="featured"${selected(tierValue, "featured")}>Featured</option>
                  <option value="premium"${selected(tierValue, "premium")}>Premium</option>
                  <option value="exclusive"${selected(tierValue, "exclusive")}>Exclusive</option>
                </select>
              </div>
              <div class="form-field">
                <label for="${editorFieldId("sponsor-areas", suffix)}">Service areas</label>
                <input id="${editorFieldId("sponsor-areas", suffix)}" name="service_areas" type="text" value="${escapeHtml(normalizeArray(sponsor.service_areas).join(", "))}" placeholder="Houston, Greater Houston, Texas">
              </div>
              <div class="form-field full-span">
                <label for="${editorFieldId("sponsor-description", suffix)}">Short description</label>
                <textarea id="${editorFieldId("sponsor-description", suffix)}" name="description" rows="3" placeholder="Plain-English notes about what this sponsor offers.">${escapeHtml(sponsor.description)}</textarea>
              </div>
              <div class="form-field full-span">
                <label for="${editorFieldId("sponsor-services", suffix)}">Services offered</label>
                <input id="${editorFieldId("sponsor-services", suffix)}" name="services" type="text" value="${escapeHtml(normalizeArray(sponsor.services).join(", "))}" placeholder="air conditioning, plumbing, generators">
                <p class="field-help">Separate services with commas. These help listeners find the right business.</p>
              </div>
            </div>
          </div>

          <div class="form-section compact-form">
            <h3>Search keywords</h3>
            <div class="keyword-manager">
              <label for="${editorFieldId("sponsor-keywords", suffix)}">Extra search keywords</label>
              <div class="keyword-input-row">
                <input id="${editorFieldId("sponsor-keywords", suffix)}" type="text" data-keyword-entry placeholder="patio, emergency repair, outdoor kitchen">
                <button class="button secondary" type="button" data-action="add-keyword">Add keyword</button>
              </div>
              <div class="keyword-chips" data-keyword-chips aria-live="polite">${renderKeywordEditor(keywords)}</div>
              <p class="field-help">Add words listeners might type even if the sponsor would describe themselves differently.</p>
            </div>
          </div>

          <div class="admin-actions">
            <div>
              <button class="button primary" type="submit">Save listing</button>
              <button class="button secondary" type="button" data-action="cancel-edit">Cancel</button>
            </div>
            <div class="admin-danger-zone">${deleteBlock}</div>
          </div>
        </form>
      </td>
    </tr>`;
  }

  function renderRows() {
    setStats();
    const visibleRecords = sponsorRecords.filter(rowMatchesSearch);
    const rowHtml = [];

    if (editingId === NEW_SPONSOR_ID) {
      rowHtml.push(renderEditorRow());
    }

    visibleRecords.forEach((sponsor) => {
      rowHtml.push(renderSponsorRow(sponsor));
      if (editingId === sponsor.id) rowHtml.push(renderEditorRow(sponsor));
    });

    rows.innerHTML = rowHtml.length
      ? rowHtml.join("")
      : `<tr><td colspan="6">No sponsors match that admin search.</td></tr>`;
  }

  async function loadDemoSponsors() {
    const response = await fetch("./data/sponsors.enriched.json");
    const data = await response.json();
    sponsorRecords = data.sponsors.map(normalizeSponsor);
    previewMode = true;
    editorPanel.hidden = false;
    setStatus("Preview mode. Changes stay in this browser preview until Supabase is connected.");
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
    editorPanel.hidden = false;
    setStatus("Connected to Supabase. Changes save to the live sponsor database.");
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

  function formKeywords(form) {
    return splitList(form.elements.admin_keywords.value);
  }

  function writeFormKeywords(form, keywords) {
    const nextKeywords = unique(keywords);
    form.elements.admin_keywords.value = nextKeywords.join(", ");
    form.querySelector("[data-keyword-chips]").innerHTML = renderKeywordEditor(nextKeywords);
  }

  function payloadFromForm(form) {
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    return {
      name,
      slug: slugify(name),
      website_url: String(formData.get("website_url") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      category: String(formData.get("category") || "").trim() || "General",
      description: String(formData.get("description") || "").trim() || null,
      services: splitList(formData.get("services")),
      service_areas: splitList(formData.get("service_areas")),
      admin_keywords: splitList(formData.get("admin_keywords")),
      premium_tier: String(formData.get("premium_tier") || "standard"),
      premium_rank: Number(formData.get("premium_rank") || 0),
      sponsor_status: normalizeStatus(formData.get("sponsor_status")),
    };
  }

  async function saveSponsor(event) {
    event.preventDefault();
    const form = event.target.closest("[data-editor-form]");
    if (!form) return;

    const formId = form.elements.id.value;
    const id = formId === NEW_SPONSOR_ID ? "" : formId;
    const payload = payloadFromForm(form);

    if (!payload.name) {
      setStatus("Add a sponsor name before saving.");
      return;
    }

    if (previewMode) {
      upsertPreviewSponsor(payload, id);
      editingId = "";
      deletePendingId = "";
      setStatus("Saved in preview mode.");
      renderRows();
      return;
    }

    const query = id
      ? client.from("sponsors").update(payload).eq("id", id)
      : client.from("sponsors").insert(payload);
    const { error } = await query;
    setStatus(error ? error.message : "Saved.");
    if (!error) {
      editingId = "";
      deletePendingId = "";
      await loadLiveSponsors();
    }
  }

  async function toggleSponsorStatus(id) {
    if (!id) return;
    const sponsor = sponsorRecords.find((record) => record.id === id);
    if (!sponsor) return;
    const nextStatus = sponsor.sponsor_status === "active" ? "inactive" : "active";

    if (previewMode) {
      sponsorRecords = sponsorRecords.map((record) =>
        record.id === id ? { ...record, sponsor_status: nextStatus } : record,
      );
      setStatus(`${sponsor.name} is now ${nextStatus}.`);
      renderRows();
      return;
    }

    const { error } = await client.from("sponsors").update({ sponsor_status: nextStatus }).eq("id", id);
    setStatus(error ? error.message : `${sponsor.name} is now ${nextStatus}.`);
    if (!error) await loadLiveSponsors();
  }

  async function deleteSponsorById(id) {
    if (!id) return;

    if (previewMode) {
      sponsorRecords = sponsorRecords.filter((record) => record.id !== id);
      editingId = "";
      deletePendingId = "";
      setStatus("Deleted in preview mode.");
      renderRows();
      return;
    }

    const { error } = await client.from("sponsors").delete().eq("id", id);
    setStatus(error ? error.message : "Deleted.");
    if (!error) {
      editingId = "";
      deletePendingId = "";
      await loadLiveSponsors();
    }
  }

  function focusEditor() {
    window.requestAnimationFrame(() => {
      const form = rows.querySelector("[data-editor-form]");
      const nameInput = form ? form.querySelector("input[name='name']") : null;
      if (nameInput) nameInput.focus();
      if (form) form.scrollIntoView({ block: "center", behavior: "auto" });
    });
  }

  async function refreshSession() {
    if (!client) {
      await loadDemoSponsors();
      return;
    }

    const { data } = await client.auth.getSession();
    const signedIn = Boolean(data.session);
    signOut.hidden = !signedIn;

    if (signedIn) {
      await loadLiveSponsors();
      return;
    }

    await loadDemoSponsors();
  }

  signOut.addEventListener("click", async () => {
    if (!client) return;
    await client.auth.signOut();
    await refreshSession();
  });

  newButton.addEventListener("click", () => {
    editingId = NEW_SPONSOR_ID;
    deletePendingId = "";
    renderRows();
    focusEditor();
  });

  adminSearch.addEventListener("input", () => {
    deletePendingId = "";
    renderRows();
  });

  rows.addEventListener("submit", saveSponsor);

  rows.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const keywordInput = event.target.closest("[data-keyword-entry]");
    if (!keywordInput) return;
    event.preventDefault();
    const form = keywordInput.closest("[data-editor-form]");
    const nextKeywords = splitList(keywordInput.value);
    if (!form || !nextKeywords.length) return;
    writeFormKeywords(form, [...formKeywords(form), ...nextKeywords]);
    keywordInput.value = "";
  });

  rows.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "edit") {
      editingId = id;
      deletePendingId = "";
      renderRows();
      focusEditor();
      return;
    }

    if (action === "cancel-edit") {
      editingId = "";
      deletePendingId = "";
      renderRows();
      return;
    }

    if (action === "toggle-status") {
      toggleSponsorStatus(id);
      return;
    }

    if (action === "add-keyword") {
      const form = button.closest("[data-editor-form]");
      const input = form ? form.querySelector("[data-keyword-entry]") : null;
      const nextKeywords = input ? splitList(input.value) : [];
      if (!form || !nextKeywords.length) return;
      writeFormKeywords(form, [...formKeywords(form), ...nextKeywords]);
      input.value = "";
      input.focus();
      return;
    }

    if (action === "remove-keyword") {
      const form = button.closest("[data-editor-form]");
      if (!form) return;
      writeFormKeywords(
        form,
        formKeywords(form).filter((keyword) => keyword !== button.dataset.keyword),
      );
      return;
    }

    if (action === "ask-delete") {
      deletePendingId = id;
      renderRows();
      return;
    }

    if (action === "cancel-delete") {
      deletePendingId = "";
      renderRows();
      return;
    }

    if (action === "confirm-delete") {
      deleteSponsorById(id);
    }
  });

  refreshSession().catch((error) => {
    setStatus(error.message || "Admin workspace unavailable.");
  });
})();
