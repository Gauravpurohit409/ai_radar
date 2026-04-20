import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const defaultData = {
  sources: [
    { id: "openai", name: "OpenAI Changelog", url: "https://platform.openai.com/docs/changelog/rss.xml", active: true },
    { id: "anthropic", name: "Anthropic News", url: "https://www.anthropic.com/news/rss.xml", active: true },
    { id: "google-ai", name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", active: true }
  ],
  settings: {
    provider: "openai",
    openai: {
      apiKey: "",
      model: "gpt-4o-mini"
    },
    grok: {
      apiKey: "",
      model: "grok-beta",
      baseUrl: "https://api.x.ai/v1"
    }
  },
  items: [],
  digests: [],
  lastIngestedAt: null
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
    return;
  }

  // Backfill new keys for existing stores without overriding user data.
  const current = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
  const merged = {
    ...defaultData,
    ...current,
    settings: {
      ...defaultData.settings,
      ...(current.settings || {}),
      openai: {
        ...defaultData.settings.openai,
        ...((current.settings && current.settings.openai) || {})
      },
      grok: {
        ...defaultData.settings.grok,
        ...((current.settings && current.settings.grok) || {})
      }
    }
  };
  fs.writeFileSync(STORE_PATH, JSON.stringify(merged, null, 2), "utf-8");
}

export function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
}

export function writeStore(data) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function upsertItems(newItems) {
  const db = readStore();
  const seen = new Set(db.items.map((i) => i.url));
  const incoming = [];
  for (const item of newItems) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    incoming.push(item);
  }
  db.items = [...incoming, ...db.items].slice(0, 2000);
  db.lastIngestedAt = new Date().toISOString();
  writeStore(db);
  return incoming.length;
}
