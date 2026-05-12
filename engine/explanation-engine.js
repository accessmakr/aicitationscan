export function generateInsights({ stack = [], html = "", scores = {} }) {
  const insights = [];

  // Stack insights
  if (stack.some(s => s.technology === "Next.js")) {
    insights.push("Modern React framework (Next.js) detected, optimized for SSR/SSG.");
  }

  if (stack.some(s => s.technology === "WordPress")) {
    insights.push("Legacy CMS detected (WordPress) — may limit performance and AI readability.");
  }

  if (stack.length > 8) {
    insights.push("High number of technologies detected — potential stack complexity risk.");
  }

  // SEO insights
  if (scores.seo > 85) {
    insights.push("Strong SEO implementation detected.");
  } else {
    insights.push("SEO structure may need improvement for better indexing.");
  }

  // AI visibility insights
  if (html.includes("schema.org")) {
    insights.push("Structured data present — improves AI and search understanding.");
  } else {
    insights.push("Missing structured data reduces AI visibility.");
  }

  return insights;
}
