import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { analyzeTechnology } from "../../engine/intelligence-engine.js";
import { calculateScores } from "../../engine/scoring-engine.js";
import { generateInsights } from "../../engine/explanation-engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LOAD JSON SAFELY
function loadJSON(file) {
  try {
    const filePath = path.join(
      __dirname,
      "../../public/data",
      file
    );

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

    // FETCH SITE
    const response = await axios.get(target, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "AI Citation Scan Bot"
      }
    });

    const html = response.data;
    const headers = response.headers;

    // LOAD SIGNATURES (CRITICAL FIX)
    const signatures = {
      ...loadJSON("cms-signatures.json"),
      ...loadJSON("framework-signatures.json"),
      ...loadJSON("hosting-signatures.json"),
      ...loadJSON("analytics-signatures.json")
    };

    // SAFETY CHECK (THIS FIXES YOUR ERROR)
    if (!signatures || Object.keys(signatures).length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No signatures loaded"
        }),
        { status: 500 }
      );
    }

    // RUN ENGINE
    const detections = await analyzeTechnology(
      { html, headers },
      signatures
    );

    const scores = calculateScores(detections);
    const insights = generateInsights(detections, scores);

    return new Response(
      JSON.stringify({
        success: true,
        url: target,
        detections,
        score: scores.score,
        grade: scores.grade,
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
