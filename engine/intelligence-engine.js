export async function analyzeTechnology(data, signatures) {
  // 🔒 HARD SAFETY GUARD (prevents your exact crash)
  if (!data || typeof data !== "object") {
    return [];
  }

  if (!signatures || typeof signatures !== "object") {
    return [];
  }

  const html = (data.html || "").toLowerCase();
  const headers = JSON.stringify(data.headers || {}).toLowerCase();

  const results = [];

  // Iterate safely over signature groups
  for (const [tech, config] of Object.entries(signatures)) {
    if (!config || !Array.isArray(config.signals)) continue;

    let score = 0;
    const matchedSignals = [];

    for (const signal of config.signals) {
      if (!signal || !signal.pattern) continue;

      let source = "";

      // HTML / script-based detection
      if (signal.type === "html" || signal.type === "script") {
        source = html;
      }

      // header-based detection
      if (signal.type === "header") {
        source = headers;
      }

      const pattern = signal.pattern.toLowerCase();

      if (source.includes(pattern)) {
        score += signal.weight || 1;
        matchedSignals.push(signal.pattern);
      }
    }

    if (score > 0) {
      results.push({
        technology: tech,
        confidence: Math.min(score * 20, 100),
        signals: matchedSignals
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
