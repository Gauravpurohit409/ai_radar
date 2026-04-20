async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
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
      <strong>${item.title}</strong>
      <div>${item.source} | score: ${item.totalScore}</div>
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

async function refresh() {
  const [stats, sources, items, digests] = await Promise.all([
    api("/api/stats"),
    api("/api/sources"),
    api("/api/items?limit=100"),
    api("/api/digests")
  ]);
  renderStats(stats);
  renderSources(sources);
  renderItems(items);
  renderDigest(digests);
}

document.getElementById("btnIngest").onclick = async () => {
  const out = await api("/api/ingest", { method: "POST" });
  if (out.errors?.length) {
    console.warn("Ingestion errors:", out.errors);
    alert(`Ingestion completed with ${out.errors.length} source error(s). Check browser console.`);
  }
  await refresh();
};

document.getElementById("btnSeed").onclick = async () => {
  await api("/api/seed-sample", { method: "POST" });
  await refresh();
};

document.getElementById("btnDigest").onclick = async () => {
  await api("/api/digest", { method: "POST" });
  await refresh();
};

document.getElementById("btnRefresh").onclick = refresh;

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

refresh().catch((error) => {
  console.error(error);
  alert("Failed to load dashboard.");
});
