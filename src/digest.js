export function buildDailyDigest(items) {
  const ranked = [...items].sort((a, b) => b.totalScore - a.totalScore);
  const top = ranked.slice(0, 3);
  const test = ranked.find((i) => i.status === "TestThisWeek");
  const ignore = ranked.find((i) => i.status === "Ignore");

  const lines = ["AI Radar Daily Brief", ""];
  top.forEach((item, idx) => {
    lines.push(`Top Shift ${idx + 1}: ${item.title}`);
    lines.push(`Why it matters: ${item.summary}`);
    lines.push(`Action: ${item.actionRecommendation}`);
    lines.push("");
  });

  lines.push(`Test Tomorrow: ${test ? test.title : "Pick highest scored item and run 30-minute test."}`);
  lines.push(`Ignore/Noise: ${ignore ? ignore.title : "No obvious hype-only item today."}`);

  return lines.join("\n");
}
