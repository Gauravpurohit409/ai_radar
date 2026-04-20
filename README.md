# AI Radar Web App

Single deployable web app to stay updated on AI with minimal effort.

No Feedly/Zapier/Notion required.

## Features

- Add/remove/pause RSS sources in UI
- Manual ingestion button (`Run Ingestion Now`)
- Auto scheduler (8 AM + 6 PM ingest, 8:30 PM digest)
- AI scoring per item (OpenAI if key exists, otherwise heuristic fallback)
- Dashboard with high-signal counts and latest items
- Daily digest generation and history

## Tech

- Node.js + Express
- `rss-parser` for feed ingestion
- `node-cron` for scheduled jobs
- OpenAI API for optional AI scoring
- JSON file storage (`data/store.json`)

## Local run

1. Install dependencies:

   ```bash
   npm install
   ```

2. (Optional) add OpenAI key:

   ```bash
   cp .env.example .env
   ```

   Then set `OPENAI_API_KEY=...`

3. Start app:

   ```bash
   npm run dev
   ```

4. Open:

   [http://localhost:3000](http://localhost:3000)

## Deploy on Render

This repo includes `render.yaml`.

1. Push this repo to GitHub.
2. In Render, create a new Blueprint from repo.
3. Set environment variable `OPENAI_API_KEY` (optional but recommended).
4. Deploy.

## API endpoints

- `GET /api/health`
- `GET /api/sources`
- `POST /api/sources`
- `PATCH /api/sources/:id/toggle`
- `DELETE /api/sources/:id`
- `POST /api/ingest`
- `GET /api/items?limit=100`
- `GET /api/stats`
- `POST /api/digest`
- `GET /api/digests`
