import axios from "axios";
import { analyzeTechnology } from "../../engine/intelligence-engine.js";
import { calculateScores } from "../../engine/scoring-engine.js";
import { generateInsights } from "../../engine/explanation-engine.js";

// Helper: normalize URL
function normalizeUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://${url}`;
}

// Fetch raw site data (same logic as fetch-site.js but internal)
async function fetchSite(targetUrl) {
  const response = await axios.get(targetUrl, {
    timeout: 15000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "AI Visibility Intelligence Engine"
    }
  });

  return {
    html: response.data,
    headers: response.headers,
    finalUrl: response.request?.res?.responseUrl || targetUrl,
    status: response.status
  };
}

// AI Visibility Scoring (your moat layer)
function calculateAIVisibility(stack, html) {
  let score = 70; // baseline modern web assumption

  const text = html.toLowerCase();

  // Positive signals
  if (text.includes("schema.org")) score += 5;
  if (text.includes("application/ld+json")) score += 8;
  if (text.includes("llms.txt")) score += 10;
  if (text.includes("openai")) score += 2;
  if (text.includes("anthropic")) score += 2;

  // Stack-based boosts
  if (stack.some(s => s.technology === "Next.js")) score += 5;
  if (stack.some(s => s.technology === "React")) score += 3;
  if (stack.some(s => s.technology === "Cloudflare")) score += 3;

  // Penalties
  if (text.includes("jquery")) score -= 5;
  if (text.includes("wp-content")) score -= 3;

  return Math.max(0, Math.min(100, score));
}

// Migration risk engine
function calculateMigrationRisk(stack) {
  const techCount = stack.length;

  const hasLegacy = stack.some(t =>
    ["jQuery", "WordPress", "Drupal"].includes(t.technology)
  );

  if (hasLegacy || techCount > 10) return "high";
  if (techCount > 6) return "medium";
  return "low";
}

// Grade system
function calculateGrade(scores) {
  const avg =
    (scores.seo +
      scores.performance +
      scores.security +
      scores.ai_visibility) /
    4;

  if (avg >= 90) return "A+";
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  return "D";
}

export default async (req) => {
  try {
    const url = new URL(req.url).searchParams.get("url");

    if (!url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing URL parameter"
        }),
        { status: 400 }
      );
    }

    const targetUrl = normalizeUrl(url);

    // 1. Fetch site
    const siteData = await fetchSite(targetUrl);

    // 2. Detect technologies
    const techStack = await analyzeTechnology(siteData);

    // 3. Compute scores
    const scores = calculateScores({
      html: siteData.html,
      headers: siteData.headers,
      stack: techStack
    });

    // 4. AI Visibility (your moat)
    const aiVisibility = calculateAIVisibility(
      techStack,
      siteData.html
    );

    // 5. Migration risk
    const migrationRisk = calculateMigrationRisk(techStack);

    // 6. Insights engine
    const insights = generateInsights({
      stack: techStack,
      html: siteData.html,
      scores
    });

    // 7. Final grade
    const grade = calculateGrade({
      ...scores,
      ai_visibility: aiVisibility
    });

    // 8. Final SaaS response
    const result = {
      success: true,
      url: targetUrl,
      finalUrl: siteData.finalUrl,

      stack: techStack,

      scores: {
        ...scores,
        ai_visibility: aiVisibility
      },

      migration_risk: migrationRisk,

      grade,

      insights,

      summary: {
        isModernStack: aiVisibility > 80,
        enterpriseReadiness: scores.security > 80,
        seoStrength: scores.seo,
        performanceHealth: scores.performance
      },

      meta: {
        status: siteData.status,
        analyzedAt: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        "content-type": "application/json"
      }
    });

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
