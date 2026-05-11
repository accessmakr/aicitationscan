import { matchPattern } from "./detector-utils.js";
import { calculateConfidence } from "./scoring-engine.js";
import { generateExplanation } from "./explanation-engine.js";

export async function analyzeWebsite(data, signatures) {

  const results = [];

  for (const [slug, tech] of Object.entries(signatures)) {

    let score = 0;

    const matches = [];

    for (const signal of tech.signals) {

      let sourceContent = "";

      if (signal.type === "html") {
        sourceContent = data.html || "";
      }

      if (signal.type === "script") {
        sourceContent = data.scripts || "";
      }

      if (signal.type === "header") {
        sourceContent = JSON.stringify(data.headers || {});
      }

      const matched = matchPattern(
        sourceContent,
        signal.pattern,
        signal.match
      );

      if (matched) {

        score += signal.weight;

        matches.push({
          pattern: signal.pattern,
          evidence: signal.evidence,
          severity: signal.severity
        });
      }
    }

    if (tech.negativeSignals) {

      for (const negative of tech.negativeSignals) {

        const negativeMatched = matchPattern(
          data.html || "",
          negative.pattern,
          negative.match
        );

        if (negativeMatched) {
          score -= negative.weightPenalty;
        }
      }
    }

    if (score >= (tech.minimumDetectionScore || 1)) {

      const confidence = calculateConfidence(
        score,
        tech.baseConfidence || 1
      );

      results.push({
        slug,
        name: tech.name,
        category: tech.category,
        confidence,
        matches,
        explanations: generateExplanation({ matches })
      });
    }
  }

  return results;
}
