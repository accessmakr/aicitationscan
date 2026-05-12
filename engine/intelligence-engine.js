export async function analyzeTechnology(data, signatures) {
  const html =
    data.html.toLowerCase();

  const headers =
    JSON.stringify(data.headers).toLowerCase();

  const results = [];

  for (const [tech, config] of Object.entries(signatures)) {
    let score = 0;
    const matchedSignals = [];

    for (const signal of config.signals) {
      let source = "";

      if (
        signal.type === "html" ||
        signal.type === "script"
      ) {
        source = html;
      }

      if (signal.type === "header") {
        source = headers;
      }

      if (
        source.includes(
          signal.pattern.toLowerCase()
        )
      ) {
        score += signal.weight;
        matchedSignals.push(signal.pattern);
      }
    }

    if (score > 0) {
      results.push({
        technology: tech,
        confidence:
          Math.min(score * 20, 100),
        signals: matchedSignals
      });
    }
  }

  return results.sort(
    (a, b) =>
      b.confidence - a.confidence
  );
}
