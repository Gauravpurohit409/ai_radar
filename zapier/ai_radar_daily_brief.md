# Zap 2: AI Radar Daily Brief

This Zap sends one concise digest each evening from today's top-scored items.

## Trigger

- **App**: Schedule by Zapier
- **Time**: 8:30 PM daily

## Step 1: Query Notion items

- **App**: Notion -> Find Database Items
- Database: `AI Radar Items`
- Filters:
  - `PublishedAt` is today
  - `InDigest` equals false
  - `TotalScore` >= 12
- Sort:
  - `TotalScore` descending
- Limit:
  - 10 items max

## Step 2: Prepare digest content

- **App**: Code by Zapier (JavaScript) or Formatter utilities
- Build JSON array of top items including:
  - title
  - source
  - summary
  - totalscore
  - actionRecommendation
  - status
  - url

## Step 3: Generate final digest with OpenAI

- **App**: OpenAI
- **Model**: `gpt-4o-mini`
- Prompt: use `prompts/digest_prompt.txt`
- Variable:
  - `{{items_json}}` -> array from Step 2

## Step 4: Deliver digest

Choose one:

- **Gmail**: send to yourself
- **Slack**: post to your private channel

### Subject
`AI Radar Daily Brief - {{zap_meta_human_now}}`

### Body
Use OpenAI output directly.

## Step 5: Mark items as digested

- Loop through items from Step 1
- **App**: Notion -> Update Database Item
- Set `InDigest = true`

This avoids duplicate digest entries next day.

