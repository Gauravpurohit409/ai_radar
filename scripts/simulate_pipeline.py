#!/usr/bin/env python3
"""
Local simulation for AI Radar v1 pipeline.

- Reads sample feed entries from samples/sample_feed_items.json
- Scores entries via OpenAI (or falls back to deterministic local scoring)
- Prints a compact daily digest
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List


ROOT = Path(__file__).resolve().parent.parent
SAMPLES_FILE = ROOT / "samples" / "sample_feed_items.json"
SCORING_PROMPT_FILE = ROOT / "prompts" / "scoring_prompt.txt"


def load_env_file() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def local_score(item: Dict[str, Any]) -> Dict[str, Any]:
    title = f"{item.get('title', '')} {item.get('snippet', '')}".lower()

    impact = 2
    urgency = 2
    adoptability = 3
    durability = 2
    category = "Research"
    status = "Review"

    if any(k in title for k in ["changelog", "api", "release", "controls", "latency"]):
        impact = 4
        urgency = 4
        adoptability = 4
        durability = 4
        category = "Model/API"
        status = "TestThisWeek"

    if any(k in title for k in ["workflow", "automation", "tool"]):
        category = "Workflow"

    if any(k in title for k in ["rumor", "viral", "agi breakthrough", "anonymous"]):
        impact = 1
        urgency = 1
        adoptability = 1
        durability = 1
        category = "Research"
        status = "Ignore"

    summary = item.get("snippet", "")[:220]
    action = "Review official docs and test one small use-case in under 30 minutes."
    total = impact + urgency + adoptability + durability

    return {
        "summary": summary,
        "category": category,
        "impact": impact,
        "urgency": urgency,
        "adoptability": adoptability,
        "durability": durability,
        "actionRecommendation": action,
        "status": status,
        "totalScore": total,
    }


def score_with_openai(item: Dict[str, Any]) -> Dict[str, Any]:
    try:
        from openai import OpenAI
    except Exception as exc:
        raise RuntimeError("openai package not installed") from exc

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    client = OpenAI(api_key=api_key)
    prompt = SCORING_PROMPT_FILE.read_text()
    prompt = (
        prompt.replace("{{title}}", str(item.get("title", "")))
        .replace("{{source}}", str(item.get("source", "")))
        .replace("{{publishedAt}}", str(item.get("publishedAt", "")))
        .replace("{{snippet}}", str(item.get("snippet", "")))
        .replace("{{url}}", str(item.get("url", "")))
    )

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Return strict JSON only."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    content = resp.choices[0].message.content.strip()
    parsed = json.loads(content)
    parsed["totalScore"] = (
        int(parsed["impact"])
        + int(parsed["urgency"])
        + int(parsed["adoptability"])
        + int(parsed["durability"])
    )
    return parsed


def build_digest(scored_items: List[Dict[str, Any]]) -> str:
    top = sorted(scored_items, key=lambda x: x["totalScore"], reverse=True)
    top3 = top[:3]
    ignored = [x for x in scored_items if x.get("status") == "Ignore"]
    tests = [x for x in scored_items if x.get("status") == "TestThisWeek"]

    lines = ["AI Radar Daily Brief", ""]
    for idx, item in enumerate(top3, 1):
        lines.append(f"Top Shift {idx}: {item['title']}")
        lines.append(f"Why it matters: {item['summary']}")
        lines.append(f"Action: {item['actionRecommendation']}")
        lines.append("")

    if tests:
        lines.append(f"Test Tomorrow: {tests[0]['title']}")
    else:
        lines.append("Test Tomorrow: Pick the highest-scored item and run a 30-minute experiment.")

    if ignored:
        lines.append(f"Ignore/Noise: {ignored[0]['title']}")
    else:
        lines.append("Ignore/Noise: No low-quality hype items detected today.")

    return "\n".join(lines)


def main() -> None:
    load_env_file()
    items = json.loads(SAMPLES_FILE.read_text())
    scored: List[Dict[str, Any]] = []

    for item in items:
        row = {"title": item["title"], "source": item["source"], "url": item["url"]}
        try:
            result = score_with_openai(item)
            row.update(result)
            row["engine"] = "openai"
        except Exception:
            result = local_score(item)
            row.update(result)
            row["engine"] = "local-fallback"
        scored.append(row)

    print("Scored Items:")
    print(json.dumps(scored, indent=2))
    print("\n" + "=" * 60 + "\n")
    print(build_digest(scored))


if __name__ == "__main__":
    main()
