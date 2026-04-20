import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an AI update analyst.
Return strict JSON:
{
  "summary": "max 70 words",
  "category": "Model/API|Tooling|Workflow|Research",
  "impact": 1-5,
  "urgency": 1-5,
  "adoptability": 1-5,
  "durability": 1-5,
  "actionRecommendation": "one concrete action under 30 mins",
  "status": "New|Ignore|TestThisWeek"
}`;

function heuristicScore(item) {
  const text = `${item.title || ""} ${item.contentSnippet || ""}`.toLowerCase();
  let impact = 2;
  let urgency = 2;
  let adoptability = 3;
  let durability = 2;
  let category = "Research";
  let status = "New";

  if (/(changelog|release|api|model|latency|pricing|feature)/.test(text)) {
    impact = 4;
    urgency = 4;
    adoptability = 4;
    durability = 4;
    category = "Model/API";
    status = "TestThisWeek";
  }
  if (/(tool|agent|editor|workflow|automation)/.test(text)) {
    category = "Tooling";
  }
  if (/(rumor|viral|leak|anonymous|agi soon)/.test(text)) {
    impact = 1;
    urgency = 1;
    adoptability = 1;
    durability = 1;
    status = "Ignore";
  }

  return {
    summary: (item.contentSnippet || "No summary available.").slice(0, 220),
    category,
    impact,
    urgency,
    adoptability,
    durability,
    actionRecommendation: "Read official docs and test one use-case in 30 minutes.",
    status
  };
}

export async function scoreItem(item) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return heuristicScore(item);
  }

  try {
    const client = new OpenAI({ apiKey });
    const userPrompt = `Title: ${item.title || ""}
Source: ${item.source || ""}
PublishedAt: ${item.isoDate || ""}
Snippet: ${item.contentSnippet || ""}
URL: ${item.url || ""}`;
    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ]
    });
    const parsed = JSON.parse(resp.choices[0].message.content);
    return parsed;
  } catch (error) {
    return heuristicScore(item);
  }
}

export function totalScore(scored) {
  return Number(scored.impact) + Number(scored.urgency) + Number(scored.adoptability) + Number(scored.durability);
}
