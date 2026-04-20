# Notion Setup: `AI Radar Items`

Create a new Notion database called `AI Radar Items` and add the following properties.

## Properties

| Property | Type | Notes |
|---|---|---|
| `Title` | Title | Article title |
| `URL` | URL | Canonical link |
| `Source` | Rich text | Source name (OpenAI, Anthropic, etc.) |
| `PublishedAt` | Date | Article publish date |
| `Summary` | Rich text | Max 70 words |
| `Impact` | Number | 1-5 |
| `Urgency` | Number | 1-5 |
| `Adoptability` | Number | 1-5 |
| `Durability` | Number | 1-5 |
| `TotalScore` | Formula | `toNumber(prop("Impact")) + toNumber(prop("Urgency")) + toNumber(prop("Adoptability")) + toNumber(prop("Durability"))` |
| `Category` | Select | `Model/API`, `Tooling`, `Workflow`, `Research` |
| `ActionRecommendation` | Rich text | Concrete next action under 30 mins |
| `Status` | Select | `New`, `Review`, `Ignore`, `TestThisWeek` |
| `InDigest` | Checkbox | Mark when included in daily digest |

## Suggested views

### 1) `Today Top Signals`
- Filter: `PublishedAt` is `Today`
- Filter: `TotalScore` is greater than or equal to `12`
- Sort: `TotalScore` descending

### 2) `Weekly Test Candidates`
- Filter: `Status` equals `TestThisWeek`
- Sort: `TotalScore` descending

### 3) `Ignored Noise`
- Filter: `Status` equals `Ignore`
- Sort: `PublishedAt` descending

### 4) `Needs Review`
- Filter: `Status` equals `New`
- Sort: `TotalScore` descending

## Optional second database: `AI Radar Experiments`

| Property | Type | Notes |
|---|---|---|
| `Experiment` | Title | Name of weekly test |
| `FromItem` | Relation | Link to `AI Radar Items` |
| `Hypothesis` | Rich text | What you expect |
| `SetupTimeMins` | Number | Target <= 30 |
| `Result` | Rich text | Outcome summary |
| `Decision` | Select | `Keep`, `Drop`, `Watch` |
| `WeekOf` | Date | Friday review week |

