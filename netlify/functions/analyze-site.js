import {
  analyzeTechnology
} from "../../engine/intelligence-engine.js";

import {
  calculateScores
} from "../../engine/scoring-engine.js";

import {
  computeAIVisibility
} from "../../engine/ai-visibility-engine.js";

import {
  computeMigrationRisk
} from "../../engine/migration-engine.js";

import {
  buildUnifiedResponse
} from "../../engine/unified-contract.js";

import signatures from "../../engine/signatures/signature-intelligence.json" assert { type: "json" };

import {
  fetchWithRetry
} from "./fetch-site.js";

export default async (req) => {

  try {

    const url =
      new URL(req.url)
      .searchParams
      .get("url");

    const hp =
      new URL(req.url)
      .searchParams
      .get("hp_field");

    if (hp) {
      return Response.json({
        success: false,
        error: "Bot detected"
      });
    }

    if (!url) {
      return Response.json({
        success: false,
        error: "Missing URL"
      });
    }

    const target =
      url.startsWith("http")
        ? url
        : `https://${url}`;

    const {
      html,
      headers
    } = await fetchWithRetry(target);

    const detections =
      await analyzeTechnology(
        { html, headers },
        signatures
      );

    const score =
      calculateScores(detections);

    const aiVisibility =
      computeAIVisibility({ html });

    const migrationRisk =
      computeMigrationRisk({
        detections
      });

    const finalResponse =
      buildUnifiedResponse({
        url: target,
        detections,
        score,
        aiVisibility,
        migrationRisk
      });

    return Response.json(finalResponse);

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    });
  }
};
