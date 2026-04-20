# Zap 1: AI Radar Daily Ingestion

This Zap ingests new feed items, scores them with OpenAI, and writes them to Notion.

## Trigger

- **App**: Schedule by Zapier
- **Frequency**: Daily
- **Times**: 8:00 AM and 6:00 PM (create two schedules or one Zap with two runs)

## Step 1: Get feed entries

Choose one:

1. **Preferred**: RSS by Zapier
   - Event: `New Item in Feed`
   - Add each critical RSS feed directly (one Zap per feed), or use a feed aggregator endpoint.
2. **If you have Feedly integration available**:
   - Event: new article in folder `AI-Radar-HighSignal`.

Note: Feedly Zapier support can vary by account tier. If unavailable, use RSS by Zapier with source URLs from `config/feedly/ai-radar-highsignal.opml`.

## Step 2: Deduplicate

- **App**: Filter by Zapier + Notion lookup
- Search Notion `AI Radar Items` where `URL == item link`
- Continue only if no record exists.

## Step 3: OpenAI scoring

- **App**: OpenAI (Chat Completions or Responses)
- **Model**: `gpt-4o-mini` (fast and cheap)
- Prompt: use `prompts/scoring_prompt.txt`
- Map variables:
  - `{{title}}` -> feed title
  - `{{source}}` -> feed source name
  - `{{publishedAt}}` -> feed publish date
  - `{{snippet}}` -> content snippet/summary
  - `{{url}}` -> feed link

## Step 4: Parse JSON

- **App**: Formatter by Zapier -> Utilities -> Import JSON
- Parse OpenAI response into fields:
  - summary
  - category
  - impact
  - urgency
  - adoptability
  - durability
  - actionRecommendation
  - status

## Step 5: Create Notion page

- **App**: Notion -> Create Database Item
- Target DB: `AI Radar Items`
- Map fields:
  - `Title` = feed title
  - `URL` = feed link
  - `Source` = source
  - `PublishedAt` = publish date
  - `Summary` = summary
  - `Impact` = impact
  - `Urgency` = urgency
  - `Adoptability` = adoptability
  - `Durability` = durability
  - `Category` = category
  - `ActionRecommendation` = actionRecommendation
  - `Status` = status
  - `InDigest` = false

`TotalScore` auto-computes in Notion formula.

## Step 6: High-score alert (optional)

- **App**: Filter by Zapier
  - Continue if `TotalScore >= 14` OR `(impact + urgency + adoptability + durability) >= 14`
- **Action**: Gmail/Slack send short alert

### Alert template

Subject: AI Radar High Signal: {{title}}

Body:
- Score: {{total}}
- Why it matters: {{summary}}
- Action: {{actionRecommendation}}
- Link: {{url}}

