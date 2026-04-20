async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

const state = {
  selectedCategory: "all"
};

function addActivity(message) {
  const box = document.getElementById("activityLog");
  const row = document.createElement("div");
  row.className = "activity-line";
  row.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
  box.prepend(row);
}

function renderStats(stats) {
  const el = document.getElementById("stats");
  el.innerHTML = `
    <div class="stat"><strong>Sources</strong><div>${stats.sourceCount}</div></div>
    <div class="stat"><strong>Items</strong><div>${stats.itemCount}</div></div>
    <div class="stat"><strong>High Signal</strong><div>${stats.highSignalCount}</div></div>
    <div class="stat"><strong>Test This Week</strong><div>${stats.testThisWeekCount}</div></div>
    <div class="stat"><strong>Ignored</strong><div>${stats.ignoredCount}</div></div>
    <div class="stat"><strong>Last Ingest</strong><div>${stats.lastIngestedAt || "-"}</div></div>
    <div class="stat"><strong>Provider</strong><div>${stats.provider || "openai"}</div></div>
  `;
}

function renderSources(sources) {
  const el = document.getElementById("sources");
  el.innerHTML = "";
  sources.forEach((s) => {
    const div = document.createElement("div");
    div.className = "source";
    div.innerHTML = `
      <strong>${s.name}</strong>
      <div>${s.url}</div>
      <div>
        <span class="badge">${s.active ? "active" : "paused"}</span>
      </div>
    `;
    const toggle = document.createElement("button");
    toggle.className = "secondary";
    toggle.textContent = s.active ? "Pause" : "Resume";
    toggle.onclick = async () => {
      await api(`/api/sources/${s.id}/toggle`, { method: "PATCH" });
      await refresh();
    };
    const del = document.createElement("button");
    del.className = "secondary";
    del.textContent = "Delete";
    del.onclick = async () => {
      await api(`/api/sources/${s.id}`, { method: "DELETE" });
      await refresh();
    };
    div.appendChild(toggle);
    div.appendChild(del);
    el.appendChild(div);
  });
}

function renderItems(items) {
  const el = document.getElementById("items");
  el.innerHTML = "";
  items.slice(0, 20).forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-header">
        <strong>${item.title}</strong>
        <span class="badge">score: ${item.totalScore}</span>
      </div>
      <div>${item.source}</div>
      <div><span class="badge">${item.category}</span> <span class="badge">${item.status}</span></div>
      <p>${item.summary}</p>
      <a href="${item.url}" target="_blank" rel="noreferrer">Open</a>
    `;
    el.appendChild(div);
  });
}

function renderDigest(digests) {
  const el = document.getElementById("digest");
  el.textContent = digests[0]?.text || "No digest generated yet.";
}

function renderAllSummary(payload) {
  document.getElementById("allSummary").textContent = payload.summary || "No summary available.";
}

function renderCategories(categories) {
  const select = document.getElementById("categoryFilter");
  const previous = state.selectedCategory || "all";
  select.innerHTML = "";
  categories.forEach((category) => {
    const opt = document.createElement("option");
    opt.value = category;
    opt.textContent = category === "all" ? "All categories" : category;
    select.appendChild(opt);
  });
  select.value = categories.includes(previous) ? previous : "all";
  state.selectedCategory = select.value;
}

function renderSettings(settings) {
  const provider = settings.provider || "openai";
  document.getElementById("providerSelect").value = provider;
  document.getElementById("openaiKey").value = settings.openai?.apiKey || "";
  document.getElementById("openaiModel").value = settings.openai?.model || "gpt-4o-mini";
  document.getElementById("grokKey").value = settings.grok?.apiKey || "";
  document.getElementById("grokModel").value = settings.grok?.model || "grok-beta";
  toggleProviderFields(provider);
}

function toggleProviderFields(provider) {
  const openaiFields = document.getElementById("openaiFields");
  const grokFields = document.getElementById("grokFields");
  if (provider === "grok") {
    openaiFields.style.display = "none";
    grokFields.style.display = "block";
  } else {
    openaiFields.style.display = "block";
    grokFields.style.display = "none";
  }
}

async function refresh() {
  const categoryQuery = encodeURIComponent(state.selectedCategory || "all");
  const [stats, sources, items, digests, settings, categories, allSummary] = await Promise.all([
    api("/api/stats"),
    api("/api/sources"),
    api(`/api/items?limit=100&category=${categoryQuery}`),
    api("/api/digests"),
    api("/api/settings"),
    api("/api/categories"),
    api("/api/items-summary")
  ]);
  renderStats(stats);
  renderSources(sources);
  renderCategories(categories);
  renderItems(items);
  renderAllSummary(allSummary);
  renderDigest(digests);
  renderSettings(settings);
}

document.getElementById("btnIngest").onclick = async () => {
  addActivity("Running ingestion...");
  const out = await api("/api/ingest", { method: "POST" });
  if (out.errors?.length) {
    console.warn("Ingestion errors:", out.errors);
    addActivity(`Ingestion finished with ${out.errors.length} source errors.`);
  } else {
    addActivity(`Ingestion completed. Added ${out.added} new items.`);
  }
  await refresh();
};

document.getElementById("btnSeed").onclick = async () => {
  addActivity("Loading sample data...");
  await api("/api/seed-sample", { method: "POST" });
  addActivity("Sample data loaded.");
  await refresh();
};

document.getElementById("btnDigest").onclick = async () => {
  addActivity("Generating daily digest...");
  const digest = await api("/api/digest", { method: "POST" });
  addActivity(`Digest generated with ${digest.itemCount} items.`);
  await refresh();
};

document.getElementById("btnRefresh").onclick = async () => {
  addActivity("Refreshing dashboard...");
  await refresh();
  addActivity("Dashboard refreshed.");
};

document.getElementById("categoryFilter").onchange = async (event) => {
  state.selectedCategory = event.target.value;
  addActivity(`Category filter set to: ${state.selectedCategory}`);
  await refresh();
};

document.getElementById("sourceForm").onsubmit = async (event) => {
  event.preventDefault();
  const name = document.getElementById("sourceName").value.trim();
  const url = document.getElementById("sourceUrl").value.trim();
  if (!name || !url) return;
  await api("/api/sources", {
    method: "POST",
    body: JSON.stringify({ name, url })
  });
  document.getElementById("sourceForm").reset();
  await refresh();
};

document.getElementById("settingsForm").onsubmit = async (event) => {
  event.preventDefault();
  const provider = document.getElementById("providerSelect").value;
  const payload =
    provider === "openai"
      ? {
          provider,
          openai: {
            apiKey: document.getElementById("openaiKey").value.trim(),
            model: document.getElementById("openaiModel").value.trim() || "gpt-4o-mini"
          }
        }
      : {
          provider,
          grok: {
            apiKey: document.getElementById("grokKey").value.trim(),
            model: document.getElementById("grokModel").value.trim() || "grok-beta"
          }
        };
  await api("/api/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  addActivity(`Settings saved. Active provider: ${provider}`);
  await refresh();
};

document.getElementById("providerSelect").onchange = (event) => {
  toggleProviderFields(event.target.value);
};

refresh().catch((error) => {
  console.error(error);
  addActivity("Failed to load dashboard. Check network/server.");
});
