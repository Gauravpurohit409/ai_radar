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
  items: [],
  digests: [],
  lastIngestedAt: null
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
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
