(function () {
  const config = window.MB_SHOW_SUPABASE || {};
  const status = document.querySelector("#admin-status");
  const signOut = document.querySelector("#sign-out");
  const authPanel = document.querySelector("#auth-panel");
  const loginForm = document.querySelector("#admin-login-form");
  const editorPanel = document.querySelector("#editor-panel");
  const adminSummary = document.querySelector("#admin-summary");
  const passwordPanel = document.querySelector("#admin-password-panel");
  const rows = document.querySelector("#sponsor-admin-rows");
  const newButton = document.querySelector("#new-sponsor");
  const adminSearch = document.querySelector("#admin-search");
  const forgotPassword = document.querySelector("#forgot-password");
  const changePasswordForm = document.querySelector("#change-password-form");
  const statusModalRoot = document.createElement("div");
  statusModalRoot.className = "status-modal-root";
  document.body.appendChild(statusModalRoot);

  const stats = {
    total: document.querySelector("#stat-total"),
    active: document.querySelector("#stat-active"),
    inactive: document.querySelector("#stat-inactive"),
  };

  const client =
    config.url && config.publishableKey && window.supabase
      ? window.supabase.createClient(config.url, config.publishableKey)
      : null;

  const NEW_SPONSOR_ID = "__new_sponsor__";
  const publicSponsorCacheKey = "mb-show-sponsor-directory-v3";
  let sponsorRecords = [];
  let editingId = "";
  let deletePendingId = "";
  let statusPendingId = "";
  let passwordChangeRequired = false;
  let previewMode = false;

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

  function messageFromError(error, fallback = "Something went wrong. Please try again.") {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (error.message) return error.message;
    if (error.error_description) return error.error_description;
    if (error.msg) return error.msg;
    try {
      const text = JSON.stringify(error);
      return text && text !== "{}" ? text : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function setStatus(message) {
    const text = typeof message === "string" ? message : messageFromError(message);
    status.textContent = text;
    status.hidden = !text;
  }

  function clearPublicSponsorCache() {
    try {
      window.localStorage.removeItem(publicSponsorCacheKey);
    } catch (_) {}
  }

  function showSignedOut(message = "Sign in with an approved admin account to manage sponsors.") {
    sponsorRecords = [];
    editingId = "";
    deletePendingId = "";
    statusPendingId = "";
    passwordChangeRequired = false;
    setStats();
    authPanel.hidden = false;
    editorPanel.hidden = true;
    adminSummary.hidden = true;
    passwordPanel.hidden = true;
    changePasswordForm.reset();
    signOut.hidden = true;
    setStatus(message);
    renderStatusModal();
  }

  function showUnauthorized(email) {
    sponsorRecords = [];
    editingId = "";
    deletePendingId = "";
    statusPendingId = "";
    passwordChangeRequired = false;
    setStats();
    authPanel.hidden = true;
    editorPanel.hidden = true;
    adminSummary.hidden = true;
    passwordPanel.hidden = true;
    changePasswordForm.reset();
    signOut.hidden = false;
    setStatus(`${email || "This account"} is signed in, but is not approved for sponsor admin access.`);
    renderStatusModal();
  }

  function showEditor(message) {
    authPanel.hidden = true;
    editorPanel.hidden = false;
    adminSummary.hidden = false;
    passwordPanel.hidden = !passwordChangeRequired;
    signOut.hidden = false;
    setStatus(message);
  }

  function setStats() {
    const active = sponsorRecords.filter((sponsor) => sponsor.sponsor_status === "active").length;
    const inactive = sponsorRecords.length - active;

    stats.total.textContent = sponsorRecords.length;
    stats.active.textContent = active;
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
      ...normalizeArray(sponsor.keywords),
      ...normalizeArray(sponsor.admin_keywords),
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(query);
  }

  function renderSponsorRow(sponsor) {
    const isActive = sponsor.sponsor_status === "active";
    const rowClass = editingId === sponsor.id ? " class=\"is-editing\"" : "";
    const statusControl = `<button
      class="status-toggle ${isActive ? "is-active" : "is-inactive"}"
      type="button"
      data-action="toggle-status"
      data-id="${escapeHtml(sponsor.id)}"
      aria-pressed="${String(isActive)}"
    >${isActive ? "Active" : "Inactive"}</button>`;

    return `<tr${rowClass}>
      <td class="admin-status-cell">${statusControl}</td>
      <td>
        <strong>${escapeHtml(sponsor.name)}</strong>
      </td>
      <td>${escapeHtml(sponsor.category || "General")}</td>
      <td>
        <strong>${escapeHtml(sponsor.phone || "No phone")}</strong>
        <small>${escapeHtml(displayUrl(sponsor.website_url) || "No website")}</small>
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
      <td colspan="5">
        <form class="inline-sponsor-editor" data-editor-form>
          <input type="hidden" name="id" value="${escapeHtml(id)}">
          <input type="hidden" name="admin_keywords" value="${escapeHtml(keywords.join(", "))}">
          <input type="hidden" name="premium_tier" value="standard">
          <input type="hidden" name="premium_rank" value="0">

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
            <div class="admin-danger-zone">${deleteBlock}</div>
            <div class="admin-save-actions">
              <button class="button secondary" type="button" data-action="cancel-edit">Cancel</button>
              <button class="button primary" type="submit">Save listing</button>
            </div>
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
      : `<tr><td colspan="5">No sponsors match that admin search.</td></tr>`;
    renderStatusModal();
  }

  function renderStatusModal() {
    const sponsor = sponsorRecords.find((record) => record.id === statusPendingId);
    document.body.classList.toggle("has-admin-modal", Boolean(sponsor));

    if (!sponsor) {
      statusModalRoot.innerHTML = "";
      return;
    }

    const isActive = sponsor.sponsor_status === "active";
    const nextStatus = isActive ? "inactive" : "active";
    const title = isActive ? "Make this listing inactive?" : "Reactivate this listing?";
    const confirmLabel = isActive ? "Set inactive" : "Reactivate";
    const consequence = isActive
      ? "This sponsor will stop showing in the public sponsor directory."
      : "This sponsor will show again in the public sponsor directory.";
    const confirmClass = isActive ? "danger" : "success";

    statusModalRoot.innerHTML = `
      <div class="admin-modal-backdrop" data-action="cancel-status" aria-hidden="true"></div>
      <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
        <p class="eyebrow">Confirm status change</p>
        <h3 id="status-modal-title">${title}</h3>
        <p>
          <strong>${escapeHtml(sponsor.name)}</strong> will be changed to
          <strong>${nextStatus}</strong>.
        </p>
        <p class="admin-modal-warning">${consequence}</p>
        <div class="admin-modal-actions">
          <button class="button secondary" type="button" data-action="cancel-status">Cancel</button>
          <button class="button ${confirmClass}" type="button" data-action="confirm-status" data-id="${escapeHtml(sponsor.id)}">${confirmLabel}</button>
        </div>
      </div>`;

    window.requestAnimationFrame(() => {
      const cancelButton = statusModalRoot.querySelector("[data-action='cancel-status']:not(.admin-modal-backdrop)");
      if (cancelButton) cancelButton.focus();
    });
  }

  async function verifyAdminAccess() {
    const { data, error } = await client.rpc("current_sponsor_admin_status");
    if (error) return { is_admin: false, error };
    return data || { is_admin: false };
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
    showEditor("");
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

  function passwordRequirementErrors(password) {
    const errors = [];
    if (password.length < 12) errors.push("at least 12 characters");
    if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
    if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
    if (!/[0-9]/.test(password)) errors.push("one number");
    if (!/[^A-Za-z0-9]/.test(password)) errors.push("one symbol");
    return errors;
  }

  function writeFormKeywords(form, keywords) {
    const nextKeywords = unique(keywords);
    form.elements.admin_keywords.value = nextKeywords.join(", ");
    form.querySelector("[data-keyword-chips]").innerHTML = renderKeywordEditor(nextKeywords);
  }

  function payloadFromForm(form, existingSponsor = {}) {
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
      service_areas: normalizeArray(existingSponsor.service_areas),
      admin_keywords: splitList(formData.get("admin_keywords")),
      premium_tier: "standard",
      premium_rank: 0,
      sponsor_status: normalizeStatus(formData.get("sponsor_status")),
    };
  }

  async function saveSponsor(event) {
    event.preventDefault();
    const form = event.target.closest("[data-editor-form]");
    if (!form) return;

    const formId = form.elements.id.value;
    const id = formId === NEW_SPONSOR_ID ? "" : formId;
    const existingSponsor = sponsorRecords.find((record) => record.id === id) || {};
    const payload = payloadFromForm(form, existingSponsor);

    if (!payload.name) {
      setStatus("Add a sponsor name before saving.");
      return;
    }

    if (previewMode) {
      upsertPreviewSponsor(payload, id);
      editingId = "";
      deletePendingId = "";
      statusPendingId = "";
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
      statusPendingId = "";
      clearPublicSponsorCache();
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
      statusPendingId = "";
      setStatus(`${sponsor.name} is now ${nextStatus}.`);
      renderRows();
      return;
    }

    const { error } = await client.from("sponsors").update({ sponsor_status: nextStatus }).eq("id", id);
    statusPendingId = "";
    setStatus(error ? error.message : `${sponsor.name} is now ${nextStatus}.`);
    if (!error) {
      clearPublicSponsorCache();
      await loadLiveSponsors();
    }
  }

  async function deleteSponsorById(id) {
    if (!id) return;

    if (previewMode) {
      sponsorRecords = sponsorRecords.filter((record) => record.id !== id);
      editingId = "";
      deletePendingId = "";
      statusPendingId = "";
      setStatus("Deleted in preview mode.");
      renderRows();
      return;
    }

    const { error } = await client.from("sponsors").delete().eq("id", id);
    setStatus(error ? error.message : "Deleted.");
    if (!error) {
      editingId = "";
      deletePendingId = "";
      statusPendingId = "";
      clearPublicSponsorCache();
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
      showSignedOut("Admin login is unavailable. Supabase is not configured for this deployment.");
      return;
    }

    const { data } = await client.auth.getSession();
    const signedIn = Boolean(data.session);

    if (!signedIn) {
      showSignedOut();
      return;
    }

    const adminStatus = await verifyAdminAccess();
    if (!adminStatus.is_admin) {
      showUnauthorized(adminStatus.email || data.session.user.email);
      return;
    }

    passwordChangeRequired = Boolean(adminStatus.password_change_required);
    await loadLiveSponsors();
  }

  async function sendPasswordReset() {
    if (!client) return;
    const email = String(loginForm.elements.email.value || "").trim();
    if (!email) {
      setStatus("Enter your email address first, then click the reset link button.");
      loginForm.elements.email.focus();
      return;
    }

    forgotPassword.disabled = true;
    setStatus("Sending password reset email...");
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin`,
    });
    forgotPassword.disabled = false;

    if (error) {
      setStatus(messageFromError(error, "Could not send reset email."));
      return;
    }

    setStatus("Password reset email sent. Check that inbox for the link.");
  }

  async function updatePassword(event) {
    event.preventDefault();
    if (!client) return;

    const newPassword = String(changePasswordForm.elements.new_password.value || "");
    const confirmPassword = String(changePasswordForm.elements.confirm_password.value || "");

    const requirementErrors = passwordRequirementErrors(newPassword);
    if (requirementErrors.length) {
      setStatus(`New password needs ${requirementErrors.join(", ")}.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("The new passwords do not match.");
      return;
    }

    const button = changePasswordForm.querySelector("button[type='submit']");
    button.disabled = true;
    setStatus("Updating password...");
    const { error } = await client.auth.updateUser({ password: newPassword });
    button.disabled = false;

    if (error) {
      setStatus(messageFromError(error, "Could not update password."));
      return;
    }

    const { error: markError } = await client.rpc("mark_current_sponsor_admin_password_changed");
    if (markError) {
      setStatus(messageFromError(markError, "Password updated, but the reminder could not be hidden."));
      return;
    }

    changePasswordForm.reset();
    passwordChangeRequired = false;
    passwordPanel.hidden = true;
    setStatus("Password updated. Use the new password next time you sign in.");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return;
    const email = String(loginForm.elements.email.value || "").trim();
    const password = String(loginForm.elements.password.value || "");
    setStatus("Checking admin access...");

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(messageFromError(error, "Sign in failed. Check the email and password."));
      return;
    }

    loginForm.reset();
    await refreshSession();
  });

  signOut.addEventListener("click", async () => {
    if (!client) return;
    await client.auth.signOut();
    await refreshSession();
  });

  forgotPassword.addEventListener("click", sendPasswordReset);
  changePasswordForm.addEventListener("submit", updatePassword);

  client?.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      passwordChangeRequired = true;
      passwordPanel.hidden = false;
      setStatus("Enter a new password below to finish resetting your password.");
      window.requestAnimationFrame(() => {
        const input = changePasswordForm.querySelector("input[name='new_password']");
        if (input) input.focus();
      });
    }
  });

  newButton.addEventListener("click", () => {
    editingId = NEW_SPONSOR_ID;
    deletePendingId = "";
    statusPendingId = "";
    renderRows();
    focusEditor();
  });

  adminSearch.addEventListener("input", () => {
    deletePendingId = "";
    statusPendingId = "";
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
      statusPendingId = "";
      renderRows();
      focusEditor();
      return;
    }

    if (action === "cancel-edit") {
      editingId = "";
      deletePendingId = "";
      statusPendingId = "";
      renderRows();
      return;
    }

    if (action === "toggle-status") {
      statusPendingId = id;
      deletePendingId = "";
      renderRows();
      return;
    }

    if (action === "cancel-status") {
      statusPendingId = "";
      renderRows();
      return;
    }

    if (action === "confirm-status") {
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
      statusPendingId = "";
      renderRows();
      return;
    }

    if (action === "cancel-delete") {
      deletePendingId = "";
      statusPendingId = "";
      renderRows();
      return;
    }

    if (action === "confirm-delete") {
      deleteSponsorById(id);
    }
  });

  statusModalRoot.addEventListener("click", (event) => {
    const control = event.target.closest("[data-action]");
    if (!control || !statusModalRoot.contains(control)) return;
    const action = control.dataset.action;

    if (action === "cancel-status") {
      statusPendingId = "";
      renderRows();
      return;
    }

    if (action === "confirm-status") {
      toggleSponsorStatus(control.dataset.id);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !statusPendingId) return;
    statusPendingId = "";
    renderRows();
  });

  refreshSession().catch((error) => {
    setStatus(messageFromError(error, "Admin workspace unavailable."));
  });
})();
