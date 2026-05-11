/**
 * Intelligence Engine - Website Tech Stack Profiler
 * Heuristic-heavy, frontend-only analysis system
 */

export async function analyzeWebsite(payload) {
  const html = payload?.data?.html || "";
  const headers = payload?.data?.headers || {};
  const scripts = payload?.data?.scripts || [];
  const url = payload?.data?.url || "";

  const lower = html.toLowerCase();

  // Load signature databases
  const [cmsDB, frameworkDB, hostingDB, analyticsDB] =
    await Promise.all([
      loadJSON("/data/cms-signatures.json"),
      loadJSON("/data/framework-signatures.json"),
      loadJSON("/data/hosting-signatures.json"),
      loadJSON("/data/analytics-signatures.json")
    ]);

  const result = {
    url,

    // CORE DETECTIONS
    cms: detectFromDB(lower, cmsDB),
    frameworks: detectFromDB(lower, frameworkDB),
    hosting: detectFromDB(lower, hostingDB),
    analytics: detectFromDB(lower, analyticsDB),

    // STRUCTURAL INSIGHTS
    seo: analyzeSEO(lower),
    performance: analyzePerformance(lower, scripts),
    aiReadability: 0,

    // META OUTPUT
    scores: {},
    insights: [],
    interpretation: ""
  };

  result.scores = calculateScores(result, scripts);
  result.aiReadability = calculateAIReadability(result);
  result.insights = generateInsights(result);
  result.interpretation = generateInterpretation(result);

  return result;
}

---

/**
 * LOAD SIGNATURE FILES
 */
async function loadJSON(path) {
  try {
    const res = await fetch(path);
    return await res.json();
  } catch (e) {
    return {};
  }
}

---

/**
 * GENERIC SIGNATURE MATCHER
 */
function detectFromDB(text, db) {
  const results = [];

  for (const key in db) {
    const patterns = db[key];

    let matchCount = 0;

    for (const pattern of patterns) {
      if (text.includes(pattern.toLowerCase())) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      results.push({
        name: key,
        confidence: Math.min(0.95, 0.5 + matchCount * 0.2),
        evidence: patterns.filter(p => text.includes(p.toLowerCase()))
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

---

/**
 * SEO ANALYSIS
 */
function analyzeSEO(html) {
  return {
    hasTitle: html.includes("<title>"),
    hasMetaDescription: html.includes('name="description"'),
    hasOG: html.includes("og:"),
    hasSchema: html.includes("application/ld+json"),
    hasCanonical: html.includes('rel="canonical"')
  };
}

---

/**
 * PERFORMANCE ANALYSIS (heuristic)
 */
function analyzePerformance(html, scripts) {
  return {
    scriptCount: scripts.length,
    heavyScripts: scripts.length > 20,
    likelySlow: scripts.length > 30
  };
}

---

/**
 * SCORING ENGINE
 */
function calculateScores(result, scripts) {
  const seo = result.seo;

  const seoScore =
    (seo.hasTitle ? 25 : 0) +
    (seo.hasMetaDescription ? 25 : 0) +
    (seo.hasOG ? 20 : 0) +
    (seo.hasSchema ? 20 : 0) +
    (seo.hasCanonical ? 10 : 0);

  const performanceScore = Math.max(0, 100 - scripts.length * 3);

  const modernityScore =
    result.frameworks?.length
      ? 70 + result.frameworks[0].confidence * 30
      : 50;

  const aiScore =
    (seo.hasSchema ? 40 : 0) +
    (result.cms?.length ? 20 : 0) +
    (result.frameworks?.length ? 20 : 0) +
    20;

  const migrationScore =
    result.cms?.some(c => c.name === "wordpress")
      ? 80
      : result.cms?.length
        ? 60
        : 40;

  return {
    seo: Math.round(seoScore),
    performance: Math.round(performanceScore),
    modernity: Math.round(modernityScore),
    aiReadability: Math.round(aiScore),
    migrationComplexity: Math.round(migrationScore)
  };
}

---

/**
 * AI READABILITY SCORE
 */
function calculateAIReadability(result) {
  let score = 50;

  if (result.seo?.hasSchema) score += 20;
  if (result.cms?.length) score += 10;
  if (result.frameworks?.length) score += 10;
  if (result.analytics?.length) score += 10;

  return Math.min(100, score);
}

---

/**
 * INSIGHTS GENERATOR
 */
function generateInsights(result) {
  const insights = [];

  if (result.cms?.length) {
    insights.push(`Primary CMS: ${result.cms[0].name}`);
  }

  if (result.frameworks?.length) {
    insights.push(`Frontend stack likely uses ${result.frameworks[0].name}`);
  }

  if (result.analytics?.length > 2) {
    insights.push("Heavy marketing/analytics stack detected");
  }

  if (result.performance?.likelySlow) {
    insights.push("Potential performance risk due to script overload");
  }

  return insights;
}

---

/**
 * ARCHITECTURAL INTERPRETATION (HEURISTIC LAYER)
 */
function generateInterpretation(result) {
  if (result.frameworks?.length && result.cms?.length) {
    return `This site likely uses ${result.frameworks[0].name} combined with ${result.cms[0].name}, suggesting a hybrid architecture optimized for content delivery and dynamic rendering.`;
  }

  if (result.cms?.length) {
    return `This site is primarily CMS-driven using ${result.cms[0].name}, indicating a content-first architecture with limited frontend abstraction.`;
  }

  return "Architecture is unclear or highly custom-built with minimal detectable framework signals.";
}
