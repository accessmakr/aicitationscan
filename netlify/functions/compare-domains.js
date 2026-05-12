import axios from "axios";
import { analyzeTechnology } from "../../engine/intelligence-engine.js";
import { calculateScores } from "../../engine/scoring-engine.js";
import { computeAIVisibility } from "../../engine/ai-visibility-engine.js";
import { computeMigrationRisk } from "../../engine/migration-engine.js";

import signatures from "../../public/data/signature-intelligence.json" assert { type: "json" };

export default async (req) => {
  try {
    const urlA = new URL(req.url).searchParams.get("urlA");
    const urlB = new URL(req.url).searchParams.get("urlB");

    const fetchSite = async (url) => {
      const target = url.startsWith("http") ? url : `https://${url}`;

      const res = await axios.get(target, { timeout: 15000 });

      const html = res.data;

      const detections = await analyzeTechnology({ html }, signatures);

      return {
        url: target,
        detections,
        score: calculateScores(detections),
        aiVisibility: computeAIVisibility({ html }),
        migrationRisk: computeMigrationRisk({ detections })
      };
    };

    const [a, b] = await Promise.all([
      fetchSite(urlA),
      fetchSite(urlB)
    ]);

    const winner =
      a.score.score > b.score.score ? "A" :
      a.score.score < b.score.score ? "B" : "Tie";

    return Response.json({
      success: true,
      a,
      b,
      comparison: {
        winner,
        gap: Math.abs(a.score.score - b.score.score)
      }
    });

  } catch (e) {
    return Response.json({
      success: false,
      error: e.message
    });
  }
};
