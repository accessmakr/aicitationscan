import {
  compareDomains
} from "../../engine/competitor-engine.js";

import {
  analyzeTechnology
} from "../../engine/intelligence-engine.js";

import {
  calculateScores
} from "../../engine/scoring-engine.js";

import signatures from "../../engine/signatures/signature-intelligence.json" assert { type: "json" };

import {
  fetchWithRetry
} from "./fetch-site.js";

export default async (req) => {

  try {

    const params =
      new URL(req.url).searchParams;

    const urlA =
      params.get("urlA");

    const urlB =
      params.get("urlB");

    if (!urlA || !urlB) {

      return Response.json({
        success: false,
        error:
          "Both domains required"
      });
    }

    async function analyze(url) {

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

      return {
        url: target,
        detections,
        score
      };
    }

    const a =
      await analyze(urlA);

    const b =
      await analyze(urlB);

    const comparison =
      compareDomains(
        a.score,
        b.score
      );

    return Response.json({
      success: true,
      siteA: a,
      siteB: b,
      comparison
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    });
  }
};
