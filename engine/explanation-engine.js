export function generateInsights({ detections, score, aiVisibility, migration }) {
  const insights = [];

  if (score.score >= 80) {
    insights.push("Strong modern tech stack detected.");
  } else {
    insights.push("Website may need modernization for better SEO + AI visibility.");
  }

  if (aiVisibility.score < 60) {
    insights.push("Low AI visibility: improve schema + semantic structure.");
  }

  if (migration.riskScore > 70) {
    insights.push("High migration risk: strong platform lock-in detected.");
  }

  if (detections.length > 5) {
    insights.push("Complex stack detected: multiple dependencies increase maintenance cost.");
  }

  return insights;
}
