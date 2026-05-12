import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { analyzeTechnology } from "../../engine/intelligence-engine.js";
import { calculateScores } from "../../engine/scoring-engine.js";
import { generateInsights } from "../../engine/explanation-engine.js";

/**
 * FIX: ensure these are declared ONLY ONCE
 */
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

/**
 * SAFE JSON LOADER
 */
function loadJSON(file) {
  try {
    const filePath = path.join(
      currentDir,
      "../../public/data",
      file
    );

    if (!fs.existsSync(filePath)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return {};
  }
}

export default async (req) => {
  try {
    const url = new URL(req.url).searchParams.get("url");

    if (!url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing URL"
        }),
        { status: 400 }
      );
    }

    const target = url.startsWith("http")
      ? url
      : `https://${url}`;

    // FETCH TARGET SITE
    const response = await axios.get(target, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "AI Visibility Scanner Bot"
      }
    });

    const html = response.data || "";
    const headers = response.headers || {};

    /**
     * LOAD SIGNATURES SAFELY
     */
    const signatures = {
      ...loadJSON("cms-signatures.json"),
      ...loadJSON("framework-signatures.json"),
      ...loadJSON("hosting-signatures.json"),
      ...loadJSON("analytics-signatures.json"),
      ...loadJSON("ai-signatures.json"),
      ...loadJSON("marketing-signatures.json"),
      ...loadJSON("ecommerce-signatures.json"),
      ...loadJSON("cdn-signatures.json"),
      ...loadJSON("security-signatures.json")
    };

    // HARD SAFETY CHECK
    if (!signatures || Object.keys(signatures).length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No signatures loaded from /public/data"
        }),
        { status: 500 }
      );
    }

    /**
     * RUN DETECTION ENGINE
     */
    const detections = await analyzeTechnology(
      { html, headers },
      signatures
    );

    /**
     * SCORE ENGINE (SAFE FALLBACK)
     */
    const scores =
      typeof calculateScores === "function"
        ? calculateScores(detections)
        : {
            score: 0,
            grade: "N/A",
            breakdown: detections
          };

    /**
     * INSIGHTS ENGINE (SAFE FALLBACK)
     */
    const insights =
      typeof generateInsights === "function"
        ? generateInsights(detections, scores)
        : [];

    return new Response(
      JSON.stringify({
        success: true,
        url: target,
        detections,
        score: scores.score || 0,
        grade: scores.grade || "Unknown",
        insights
      }),
      {
        headers: {
          "content-type": "application/json"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500 }
    );
  }
};
