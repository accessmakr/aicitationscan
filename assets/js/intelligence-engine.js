/**
 * Unified Website Intelligence Engine
 * Built for SaaS-grade tech stack detection
 */

export async function analyzeWebsite(payload) {
  const data = payload?.data || {};

  const html = (data.html || "").toLowerCase();
  const headers = normalizeHeaders(data.headers || {});
  const scripts = data.scripts || [];
  const url = data.url || "";

  // Load signature datasets
  const [cmsDB, fwDB, hostDB, analyticsDB] = await Promise.all([
    load("/data/cms-signatures.json"),
    load("/data/framework-signatures.json"),
    load("/data/hosting-signatures.json"),
    load("/data/analytics-signatures.json")
  ]);

  const context = {
    html,
    headers,
    scripts: scripts.map(s => s.toLowerCase()),
    url
  };

  // Run detection engines
  const cms = detectEntity(context, cmsDB, "cms");
  const frameworks = detectEntity(context, fwDB, "framework");
  const hosting = detectEntity(context, hostDB, "hosting");
  const analytics = detectEntity(context, analyticsDB, "analytics");

  // Derived intelligence layers
  const seo = analyzeSEO(context);
  const performance = analyzePerformance(context);
  const security = analyzeSecurity(headers);

  // Scoring system
  const scores = buildScores({
    cms,
    frameworks,
    hosting,
    analytics,
    seo,
    performance
  });

  // AI readiness layer (your differentiator)
  const aiReadiness = calculateAIReadiness({
    seo,
    cms,
    frameworks,
    performance
  });

  // Final insights
  const insights = generateInsights({
    cms,
    frameworks,
    hosting,
    analytics,
    performance
  });

  return {
    url,

    cms,
    frameworks,
    hosting,
    analytics,

    seo,
    performance,
    security,

    scores,
    aiReadiness,
    insights,

    summary: generateSummary({
      cms,
      frameworks,
      hosting
    })
  };
}

---

/**
 * LOAD JSON SIGNATURE FILES
 */
async function load(path) {
  try {
    const res = await fetch(path);
    return await res.json();
  } catch {
    return {};
  }
}

---

/**
 * NORMALIZE HEADERS
 */
function normalizeHeaders(headers) {
  const normalized = {};
  for (const k in headers) {
    normalized[k.toLowerCase()] = headers[k];
  }
  return normalized;
}

---

/**
 * CORE DETECTION ENGINE (WEIGHTED)
 */
function detectEntity(context, db, type) {
  const results = [];
  const { html, headers, scripts, url } = context;

  for (const key in db) {
    const entry = db[key];

    let score = 0;
    let evidence = [];

    for (const signal of entry.signals || []) {
      const pattern = signal.pattern.toLowerCase();
      const weight = signal.weight || 1;

      let matched = false;

      switch (signal.type) {
        case "html":
          matched = html.includes(pattern);
          break;

        case "script":
          matched = scripts.some(s => s.includes(pattern));
          break;

        case "url":
          matched = url.includes(pattern);
          break;

        case "header":
          matched = Object.keys(headers).some(h =>
            h.includes(pattern) || headers[h]?.toLowerCase?.().includes(pattern)
          );
          break;
      }

      if (matched) {
        score += weight;
        evidence.push({ pattern, type: signal.type, weight });
      }
    }

    if (score > 0) {
      const confidence = Math.min(
        entry.confidence || 0.9,
        score / (entry.signals.length * 2)
      );

      results.push({
        name: key,
        type,
        score,
        confidence: round(confidence),
        evidence
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

---

/**
 * SEO ANALYSIS
 */
function analyzeSEO(ctx) {
  return {
    hasTitle: ctx.html.includes("<title"),
    hasMetaDescription: ctx.html.includes("name=\"description\""),
    hasOG: ctx.html.includes("og:"),
    hasSchema: ctx.html.includes("application/ld+json"),
    hasCanonical: ctx.html.includes("canonical")
  };
}

---

/**
 * PERFORMANCE ANALYSIS
 */
function analyzePerformance(ctx) {
  return {
    scriptCount: ctx.scripts.length,
    heavy: ctx.scripts.length > 25,
    risk: ctx.scripts.length > 40
  };
}

---

/**
 * SECURITY ANALYSIS (LIGHTWEIGHT)
 */
function analyzeSecurity(headers) {
  return {
    https: true,
    csp: !!headers["content-security-policy"],
    hsts: !!headers["strict-transport-security"],
    xframe: !!headers["x-frame-options"]
  };
}

---

/**
 * SCORING ENGINE
 */
function buildScores(data) {
  const cmsScore = data.cms?.[0]?.confidence * 100 || 0;
  const fwScore = data.frameworks?.[0]?.confidence * 100 || 0;
  const hostScore = data.hosting?.[0]?.confidence * 100 || 0;
  const analyticsScore = data.analytics?.length * 15;

  const seoScore =
    Object.values(data.seo).filter(Boolean).length * 20;

  const performanceScore = Math.max(
    0,
    100 - (data.performance.scriptCount * 2)
  );

  const complexity =
    data.cms?.[0]?.name === "wordpress" ? 80 : 50;

  return {
    cms: round(cmsScore),
    frameworks: round(fwScore),
    hosting: round(hostScore),
    analytics: round(analyticsScore),
    seo: round(seoScore),
    performance: round(performanceScore),
    migrationComplexity: round(complexity)
  };
}

---

/**
 * AI READINESS SCORE (YOUR UNIQUE DIFFERENTIATOR)
 */
function calculateAIReadiness(data) {
  let score = 50;

  if (data.seo.hasSchema) score += 20;
  if (data.seo.hasOG) score += 10;
  if (data.cms?.length) score += 10;
  if (data.frameworks?.length) score += 10;
  if (data.performance.scriptCount < 15) score += 10;

  return Math.min(100, score);
}

---

/**
 * INSIGHTS GENERATION
 */
function generateInsights(data) {
  const insights = [];

  if (data.cms?.length) {
    insights.push(`CMS detected: ${data.cms[0].name}`);
  }

  if (data.frameworks?.length) {
    insights.push(`Frontend framework: ${data.frameworks[0].name}`);
  }

  if (data.performance.risk) {
    insights.push("High script load may impact performance");
  }

  if (data.analytics?.length > 2) {
    insights.push("Heavy marketing tracking stack detected");
  }

  return insights;
}

---

/**
 * SUMMARY (HUMAN + AI READABLE)
 */
function generateSummary(data) {
  return `
This website appears to use ${data.cms?.[0]?.name || "unknown CMS"} 
with ${data.frameworks?.[0]?.name || "no detectable framework"} frontend architecture.
  `.trim();
}

function round(n) {
  return Math.round(n * 100) / 100;
}
