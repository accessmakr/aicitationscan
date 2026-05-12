export function generateAIVisibility(site = {}, detections = []) {
  const html = (site.html || "").toLowerCase();

  let score = 50;

  const hasSchema = html.includes("application/ld+json");
  const hasHeadings = html.includes("<h1") && html.includes("<h2");
  const hasSemantic = html.includes("<article") || html.includes("<section");
  const hasLLMFile = html.includes("llms.txt");

  if (hasSchema) score += 20;
  if (hasHeadings) score += 10;
  if (hasSemantic) score += 10;
  if (hasLLMFile) score += 10;

  return {
    score: Math.min(score, 100),
    grade:
      score >= 80 ? "Strong"
      : score >= 60 ? "Moderate"
      : "Weak",
    signals: {
      schema: hasSchema,
      semantic: hasSemantic,
      llmReady: hasLLMFile
    }
  };
}
