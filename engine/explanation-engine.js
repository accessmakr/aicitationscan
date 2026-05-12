export function generateInsights(detections = [], scores = {}) {
  const insights = [];

  const hasCMS = detections.some(d =>
    ["wordpress", "shopify", "webflow"].includes(d.technology)
  );

  const hasAI = detections.some(d =>
    ["claude", "hubspot", "framer"].includes(d.technology)
  );

  const score = scores.score || 0;

  if (score >= 80) {
    insights.push("Strong modern architecture detected with good optimization signals.");
  } else {
    insights.push("Website structure may limit SEO and AI visibility performance.");
  }

  if (!hasCMS) {
    insights.push("No dominant CMS detected — likely custom or headless architecture.");
  }

  if (hasCMS) {
    insights.push("Traditional CMS detected — may impact performance or flexibility.");
  }

  if (hasAI) {
    insights.push("AI tooling detected (Claude/HubSpot/Framer integrations present).");
  }

  if (score < 60) {
    insights.push("Migration opportunity: site may benefit from modern stack upgrades.");
  }

  insights.push("Structured data and semantic HTML strongly influence AI visibility scoring.");

  return insights;
}
