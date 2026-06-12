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
  const newButton = document.querySelector("#new-sponsor");

  const fields = {
    id: document.querySelector("#sponsor-id"),
    name: document.querySelector("#sponsor-name"),
    website: document.querySelector("#sponsor-website"),
    phone: document.querySelector("#sponsor-phone"),
    category: document.querySelector("#sponsor-category"),
    services: document.querySelector("#sponsor-services"),
    areas: document.querySelector("#sponsor-areas"),
    keywords: document.querySelector("#sponsor-keywords"),
    tier: document.querySelector("#sponsor-tier"),
    rank: document.querySelector("#sponsor-rank"),
    description: document.querySelector("#sponsor-description"),
  };

  const client =
    config.url && config.publishableKey && window.supabase
      ? window.supabase.createClient(config.url, config.publishableKey)
      : null;

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

  function setStatus(message) {
    status.textContent = message;
  }

  function setEditor(sponsor = {}) {
    fields.id.value = sponsor.id || "";
    fields.name.value = sponsor.name || "";
    fields.website.value = sponsor.website_url || "";
    fields.phone.value = sponsor.phone || "";
    fields.category.value = sponsor.category || "";
    fields.services.value = (sponsor.services || []).join(", ");
    fields.areas.value = (sponsor.service_areas || []).join(", ");
    fields.keywords.value = (sponsor.admin_keywords || []).join(", ");
    fields.tier.value = sponsor.premium_tier || "standard";
    fields.rank.value = sponsor.premium_rank || 0;
    fields.description.value = sponsor.description || "";
    editor.hidden = false;
  }

  async function loadSponsors() {
    const { data, error } = await client
      .from("sponsors")
      .select("id,slug,name,website_url,phone,category,description,services,service_areas,admin_keywords,premium_tier,premium_rank,sponsor_status")
      .order("name");

    if (error) {
      setStatus(error.message);
      return;
    }

    rows.innerHTML = data
      .map(
        (sponsor) => `<tr>
          <td>${sponsor.name}</td>
          <td>${sponsor.category || ""}</td>
          <td>${sponsor.premium_tier}</td>
          <td>${sponsor.sponsor_status}</td>
          <td><button type="button" data-id="${sponsor.id}">Edit</button></td>
        </tr>`,
      )
      .join("");

    rows.querySelectorAll("button[data-id]").forEach((button) => {
      button.addEventListener("click", () => setEditor(data.find((sponsor) => sponsor.id === button.dataset.id)));
    });
  }

  async function refreshSession() {
    if (!client) {
      setStatus("Supabase connection pending.");
      return;
    }

    const { data } = await client.auth.getSession();
    const signedIn = Boolean(data.session);
    signOut.hidden = !signedIn;
    editorPanel.hidden = !signedIn;
    setStatus(signedIn ? "Signed in." : "Sign in to manage sponsors.");
    if (signedIn) await loadSponsors();
  }

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return setStatus("Supabase connection pending.");

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

  newButton.addEventListener("click", () => setEditor());

  archiveButton.addEventListener("click", async () => {
    if (!fields.id.value) return;
    const { error } = await client.from("sponsors").update({ sponsor_status: "archived" }).eq("id", fields.id.value);
    setStatus(error ? error.message : "Archived.");
    await loadSponsors();
  });

  editor.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) return;

    const payload = {
      name: fields.name.value,
      slug: slugify(fields.name.value),
      website_url: fields.website.value || null,
      phone: fields.phone.value || null,
      category: fields.category.value || "General",
      description: fields.description.value || null,
      services: splitList(fields.services.value),
      service_areas: splitList(fields.areas.value),
      admin_keywords: splitList(fields.keywords.value),
      premium_tier: fields.tier.value,
      premium_rank: Number(fields.rank.value || 0),
      sponsor_status: "active",
    };

    const query = fields.id.value
      ? client.from("sponsors").update(payload).eq("id", fields.id.value)
      : client.from("sponsors").insert(payload);
    const { error } = await query;

    setStatus(error ? error.message : "Saved.");
    await loadSponsors();
  });

  refreshSession();
})();
