export async function analyzeTechnology(data = {}, signatures = {}) {
  const html = (data.html || "").toLowerCase();
  const headers = JSON.stringify(data.headers || {}).toLowerCase();

  const results = [];

  for (const [tech, config] of Object.entries(signatures || {})) {
    let score = config.baseConfidence || 50;
    const signals = config.signals || [];
    const matched = [];

    for (const s of signals) {
      let source = "";

      if (["html", "script", "url"].includes(s.type)) {
        source = html;
      } else if (s.type === "header") {
        source = headers;
      }

      if (source.includes((s.pattern || "").toLowerCase())) {
        score += s.weight || 1;
        matched.push(s.pattern);
      }
    }

    if (matched.length > 0) {
      results.push({
        technology: tech,
        confidence: Math.min(score, 100),
        signals: matched
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
