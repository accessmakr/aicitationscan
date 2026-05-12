import axios from "axios";

import { analyzeTechnology } from "../../engine/intelligence-engine.js";
import { calculateScores } from "../../engine/scoring-engine.js";
import { generateAIVisibility } from "../../engine/ai-visibility-engine.js";
import { calculateMigrationRisk } from "../../engine/migration-engine.js";
import { compareCompetitors } from "../../engine/competitor-engine.js";
import { generateInsights } from "../../engine/explanation-engine.js";

function safeJSONParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

async function fetchSite(url) {
  const target = url.startsWith("http") ? url : `https://${url}`;

  const res = await axios.get(target, {
    timeout: 15000,
    headers: { "User-Agent": "AI Visibility Engine Bot" }
  });

  return {
    html: res.data || "",
    headers: res.headers || {},
    url: target
  };
}

export default async (req) => {
  try {
    const url = new URL(req.url).searchParams.get("url");
    const competitor = new URL(req.url).searchParams.get("compare");

    if (!url) {
      return json({ success: false, error: "Missing URL" }, 400);
    }

    const siteA = await fetchSite(url);

    const signatures = await loadSignatures();

    const detections = await analyzeTechnology(siteA, signatures);

    const score = calculateScores(detections);

    const aiVisibility = generateAIVisibility(siteA, detections);

    const migration = calculateMigrationRisk(detections);

    let competitorData = null;

    if (competitor) {
      const siteB = await fetchSite(competitor);
      const detB = await analyzeTechnology(siteB, signatures);

      competitorData = compareCompetitors(
        { url, detections, score },
        { url: competitor, detections: detB }
      );
    }

    const insights = generateInsights({
      detections,
      score,
      aiVisibility,
      migration
    });

    return json({
      success: true,
      url: siteA.url,
      detections,
      score,
      aiVisibility,
      migrationRisk: migration,
      competitor: competitorData,
      insights
    });

  } catch (err) {
    return json({
      success: false,
      error: err.message
    }, 500);
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

async function loadSignatures() {
  const base = "../../public/data/";

  const files = [
    "cms-signatures.json",
    "framework-signatures.json",
    "hosting-signatures.json",
    "analytics-signatures.json",
    "ai-signatures.json"
  ];

  const merged = {};

  for (const file of files) {
    try {
      const mod = await import(base + file, { assert: { type: "json" } });
      Object.assign(merged, mod.default || {});
    } catch {}
  }

  return merged;
}
