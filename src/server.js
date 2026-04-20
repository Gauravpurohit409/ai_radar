import "dotenv/config";
import express from "express";
import cron from "node-cron";
import Parser from "rss-parser";
import path from "path";
import { fileURLToPath } from "url";
import { buildDailyDigest } from "./digest.js";
import { readStore, upsertItems, writeStore } from "./storage.js";
import { scoreItem, totalScore } from "./scoring.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const parser = new Parser();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

async function ingestFeeds() {
  const db = readStore();
  const activeSources = db.sources.filter((s) => s.active);
  const scoredItems = [];
  const errors = [];

  for (const source of activeSources) {
    try {
      const feed = await parser.parseURL(source.url);
      const latest = (feed.items || []).slice(0, 10);
      for (const raw of latest) {
        const score = await scoreItem({ ...raw, source: source.name });
        const item = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          source: source.name,
          title: raw.title || "Untitled",
          url: raw.link || raw.guid || "",
          publishedAt: raw.isoDate || raw.pubDate || new Date().toISOString(),
          summary: score.summary,
          category: score.category,
          impact: Number(score.impact),
          urgency: Number(score.urgency),
          adoptability: Number(score.adoptability),
          durability: Number(score.durability),
          totalScore: totalScore(score),
          status: score.status,
          actionRecommendation: score.actionRecommendation,
          createdAt: new Date().toISOString()
        };
        scoredItems.push(item);
      }
    } catch (error) {
      errors.push({ source: source.name, message: error.message });
    }
  }

  const added = upsertItems(scoredItems);
  return { added, scanned: scoredItems.length, errors };
}

function createDigest() {
  const db = readStore();
  const today = new Date().toISOString().slice(0, 10);
  const todayItems = db.items.filter((item) => (item.publishedAt || "").slice(0, 10) === today && item.totalScore >= 12);
  const digestText = buildDailyDigest(todayItems);
  const digest = {
    id: `${Date.now()}-digest`,
    createdAt: new Date().toISOString(),
    itemCount: todayItems.length,
    text: digestText
  };
  db.digests = [digest, ...db.digests].slice(0, 100);
  writeStore(db);
  return digest;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ai-radar-web" });
});

app.get("/api/sources", (_req, res) => {
  res.json(readStore().sources);
});

app.post("/api/sources", (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: "name and url are required" });
  const db = readStore();
  const source = { id: `${Date.now()}`, name, url, active: true };
  db.sources.push(source);
  writeStore(db);
  res.status(201).json(source);
});

app.patch("/api/sources/:id/toggle", (req, res) => {
  const db = readStore();
  const source = db.sources.find((s) => s.id === req.params.id);
  if (!source) return res.status(404).json({ error: "source not found" });
  source.active = !source.active;
  writeStore(db);
  res.json(source);
});

app.delete("/api/sources/:id", (req, res) => {
  const db = readStore();
  db.sources = db.sources.filter((s) => s.id !== req.params.id);
  writeStore(db);
  res.status(204).send();
});

app.post("/api/ingest", async (_req, res) => {
  const result = await ingestFeeds();
  res.json(result);
});

app.post("/api/seed-sample", (_req, res) => {
  const now = new Date().toISOString();
  const sample = [
    {
      id: `${Date.now()}-s1`,
      source: "OpenAI Changelog",
      title: "Structured outputs update",
      url: "https://example.com/openai-structured",
      publishedAt: now,
      summary: "Structured output enforcement improves automation reliability for JSON-heavy workflows.",
      category: "Model/API",
      impact: 4,
      urgency: 4,
      adoptability: 4,
      durability: 4,
      totalScore: 16,
      status: "TestThisWeek",
      actionRecommendation: "Try schema-constrained output in one current workflow.",
      createdAt: now
    },
    {
      id: `${Date.now()}-s2`,
      source: "Anthropic News",
      title: "Latency improvements announced",
      url: "https://example.com/anthropic-latency",
      publishedAt: now,
      summary: "Lower first-token latency can improve chat UX for production copilots.",
      category: "Model/API",
      impact: 4,
      urgency: 3,
      adoptability: 4,
      durability: 4,
      totalScore: 15,
      status: "New",
      actionRecommendation: "Benchmark response latency before and after switching model settings.",
      createdAt: now
    }
  ];
  const added = upsertItems(sample);
  res.json({ added });
});

app.get("/api/items", (req, res) => {
  const limit = Number(req.query.limit || 100);
  res.json(readStore().items.slice(0, limit));
});

app.get("/api/stats", (_req, res) => {
  const db = readStore();
  const items = db.items;
  const high = items.filter((i) => i.totalScore >= 14).length;
  const test = items.filter((i) => i.status === "TestThisWeek").length;
  const ignored = items.filter((i) => i.status === "Ignore").length;
  res.json({
    sourceCount: db.sources.length,
    itemCount: items.length,
    highSignalCount: high,
    testThisWeekCount: test,
    ignoredCount: ignored,
    lastIngestedAt: db.lastIngestedAt
  });
});

app.post("/api/digest", (_req, res) => {
  const digest = createDigest();
  res.json(digest);
});

app.get("/api/digests", (_req, res) => {
  res.json(readStore().digests);
});

// Twice daily ingest + daily digest (server local time)
cron.schedule("0 8,18 * * *", async () => {
  await ingestFeeds();
});

cron.schedule("30 20 * * *", () => {
  createDigest();
});

app.listen(PORT, () => {
  console.log(`AI Radar web app running on http://localhost:${PORT}`);
});
