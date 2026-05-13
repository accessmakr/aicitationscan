/**
 * =========================================================
 * AI CITATION SCAN
 * PRODUCTION REPORT GENERATOR v3
 * =========================================================
 *
 * FEATURES
 * ---------------------------------------------------------
 * ✅ Batch domain processing
 * ✅ Queue processing
 * ✅ Cache-first architecture
 * ✅ Curated SEO generation
 * ✅ Pagination generation
 * ✅ Internal linking
 * ✅ Duplicate prevention
 * ✅ search-index.json support
 * ✅ index.json support
 * ✅ pending/completed queue support
 * ✅ Netlify-safe static generation
 * ✅ SaaS-scale architecture
 *
 * =========================================================
 *
 * SINGLE:
 * node scripts/generate-site-report.js openai.com
 *
 * MULTIPLE:
 * node scripts/generate-site-report.js openai.com claude.ai
 *
 * QUEUE FILE:
 * node scripts/generate-site-report.js --queue domains.txt
 *
 * =========================================================
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const SITE_REPORT_DIR = path.join(ROOT, "site-report");

const CACHE_DIR = path.join(ROOT, ".cache");

const PENDING_DIR = path.join(
  ROOT,
  "site-report",
  "cache",
  "pending"
);

const COMPLETED_DIR = path.join(
  ROOT,
  "site-report",
  "cache",
  "completed"
);

const INDEX_JSON_PATH = path.join(
  SITE_REPORT_DIR,
  "index.json"
);

const SEARCH_INDEX_PATH = path.join(
  SITE_REPORT_DIR,
  "search-index.json"
);

const API_BASE =
  "https://aicitationscan.com/.netlify/functions";

const PAGE_SIZE = 25;

ensureDir(SITE_REPORT_DIR);
ensureDir(CACHE_DIR);
ensureDir(PENDING_DIR);
ensureDir(COMPLETED_DIR);

main();

/**
 * =========================================================
 * MAIN
 * =========================================================
 */

async function main() {
  const args = process.argv.slice(2);

  let domains = [];

  /**
   * ---------------------------------------------------------
   * QUEUE FILE MODE
   * ---------------------------------------------------------
   */

  if (args[0] === "--queue") {
    const queueFile = args[1];

    if (!queueFile) {
      console.error("Missing queue file.");
      process.exit(1);
    }

    const queuePath = path.join(ROOT, queueFile);

    if (!fs.existsSync(queuePath)) {
      console.error("Queue file not found.");
      process.exit(1);
    }

    domains = fs
      .readFileSync(queuePath, "utf8")
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
  } else {
    domains = args;
  }

  /**
   * ---------------------------------------------------------
   * PENDING QUEUE MODE
   * ---------------------------------------------------------
   */

  const pendingDomains = fs
    .readdirSync(PENDING_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));

  domains = [...new Set([...domains, ...pendingDomains])];

  if (!domains.length) {
    console.error("No domains supplied.");
    process.exit(1);
  }

  console.log(`\nGenerating ${domains.length} reports...\n`);

  /**
   * ---------------------------------------------------------
   * LOAD EXISTING REGISTRIES
   * ---------------------------------------------------------
   */

  const existingRegistry = loadJSON(
    INDEX_JSON_PATH,
    []
  );

  const registryMap = new Map(
    existingRegistry.map((i) => [i.domain, i])
  );

  const searchIndex = loadJSON(
    SEARCH_INDEX_PATH,
    []
  );

  const searchMap = new Map(
    searchIndex.map((i) => [i.domain, i])
  );

  /**
   * =========================================================
   * PROCESS DOMAINS
   * =========================================================
   */

  for (const domain of domains) {
    try {
      const normalized = normalizeDomain(domain);

      console.log(`→ ${normalized}`);

      /**
       * -----------------------------------------------------
       * FETCH ANALYSIS
       * -----------------------------------------------------
       */

      const report = await fetchAnalysis(normalized);

      /**
       * -----------------------------------------------------
       * CURATED PROGRAMMATIC SEO LOGIC
       * -----------------------------------------------------
       */

      const existingSearch =
        searchMap.get(normalized);

      const searchCount =
        existingSearch?.searchCount || 1;

      const manuallyApproved =
        existingSearch?.manuallyApproved || false;

      const shouldGenerate =
        (report.score?.score || 0) >= 60 ||
        searchCount >= 3 ||
        manuallyApproved === true;

      /**
       * -----------------------------------------------------
       * ALWAYS UPDATE SEARCH REGISTRY
       * -----------------------------------------------------
       */

      searchMap.set(normalized, {
        domain: normalized,

        technologies:
          report.detections?.map(
            (d) => d.technology
          ) || [],

        score: report.score?.score || 0,

        grade: report.score?.grade || "Unknown",

        aiVisibility:
          report.aiVisibility?.score || 0,

        migrationRisk:
          report.migrationRisk?.level || "Unknown",

        path: `/site-report/${normalized}.html`,

        searchCount: searchCount + 1,

        manuallyApproved,

        updatedAt: new Date().toISOString()
      });

      /**
       * -----------------------------------------------------
       * SKIP LOW QUALITY PAGES
       * -----------------------------------------------------
       */

      if (!shouldGenerate) {
        console.log(
          `↳ skipped ${normalized} (quality threshold not met)`
        );

        continue;
      }

      /**
       * -----------------------------------------------------
       * BUILD HTML
       * -----------------------------------------------------
       */

      const html = buildHTML(report);

      const htmlFilePath = path.join(
        SITE_REPORT_DIR,
        `${normalized}.html`
      );

      fs.writeFileSync(htmlFilePath, html);

      /**
       * -----------------------------------------------------
       * UPDATE INDEX REGISTRY
       * -----------------------------------------------------
       */

      registryMap.set(normalized, {
        domain: normalized,

        title:
          `${normalized} Tech Stack Report`,

        grade:
          report.score?.grade || "Unknown",

        score:
          report.score?.score || 0,

        aiVisibility:
          report.aiVisibility?.score || 0,

        migrationRisk:
          report.migrationRisk?.level ||
          "Unknown",

        path:
          `/site-report/${normalized}.html`,

        generatedAt:
          new Date().toISOString()
      });

      /**
       * -----------------------------------------------------
       * MOVE QUEUE FILE TO COMPLETED
       * -----------------------------------------------------
       */

      const pendingFile = path.join(
        PENDING_DIR,
        `${normalized}.json`
      );

      const completedFile = path.join(
        COMPLETED_DIR,
        `${normalized}.json`
      );

      if (fs.existsSync(pendingFile)) {
        fs.renameSync(
          pendingFile,
          completedFile
        );
      }

      console.log(
        `✓ Generated ${normalized}.html`
      );

    } catch (err) {
      console.error(`✗ Failed ${domain}`);
      console.error(err.message);
    }
  }

  /**
   * =========================================================
   * SAVE REGISTRIES
   * =========================================================
   */

  const registry = Array.from(
    registryMap.values()
  ).sort((a, b) => b.score - a.score);

  const searchRegistry = Array.from(
    searchMap.values()
  );

  fs.writeFileSync(
    INDEX_JSON_PATH,
    JSON.stringify(registry, null, 2)
  );

  fs.writeFileSync(
    SEARCH_INDEX_PATH,
    JSON.stringify(searchRegistry, null, 2)
  );

  /**
   * =========================================================
   * GENERATE PAGINATION
   * =========================================================
   */

  generatePaginationPages(registry);

  console.log("\n✓ index.json updated");
  console.log("✓ search-index.json updated");
  console.log("✓ pagination generated");
  console.log("\nDone.\n");
}

/**
 * =========================================================
 * FETCH ANALYSIS
 * =========================================================
 */

async function fetchAnalysis(domain) {
  const cacheFile = path.join(
    CACHE_DIR,
    `${domain}.json`
  );

  /**
   * ---------------------------------------------------------
   * CACHE HIT
   * ---------------------------------------------------------
   */

  if (fs.existsSync(cacheFile)) {
    const age =
      Date.now() -
      fs.statSync(cacheFile).mtimeMs;

    const sixHours =
      1000 * 60 * 60 * 6;

    if (age < sixHours) {
      console.log(`  ↳ using cache`);

      return JSON.parse(
        fs.readFileSync(cacheFile, "utf8")
      );
    }
  }

  /**
   * ---------------------------------------------------------
   * FETCH LIVE API
   * ---------------------------------------------------------
   */

  const endpoint =
    `${API_BASE}/analyze-site?url=` +
    encodeURIComponent(domain);

  const res = await fetch(endpoint);

  if (!res.ok) {
    throw new Error(
      `API failed: ${res.status}`
    );
  }

  const json = await res.json();

  /**
   * ---------------------------------------------------------
   * SAVE CACHE
   * ---------------------------------------------------------
   */

  fs.writeFileSync(
    cacheFile,
    JSON.stringify(json, null, 2)
  );

  /**
   * ---------------------------------------------------------
   * WRITE PENDING QUEUE FILE
   * ---------------------------------------------------------
   */

  fs.writeFileSync(
    path.join(
      PENDING_DIR,
      `${domain}.json`
    ),
    JSON.stringify({
      domain,
      queuedAt: new Date().toISOString()
    })
  );

  return json;
}

/**
 * =========================================================
 * BUILD REPORT HTML
 * =========================================================
 */

function buildHTML(report) {
  const domain = clean(
    report.url || "unknown-site"
  );

  const detections =
    report.detections || [];

  const techHTML = detections.length
    ? detections.map(
        (d) => `
<li class="border rounded-xl p-4 bg-white shadow-sm">
<strong>${escapeHTML(
          d.technology
        )}</strong>

<div class="text-sm text-gray-500 mt-1">
Confidence:
${d.confidence || 0}
</div>
</li>
`
      ).join("")
    : `<li>No technologies detected.</li>`;

  return `
<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>
${domain} Technology Stack Report
</title>

<meta
name="description"
content="Technology stack, AI visibility, migration risk, SEO intelligence, and infrastructure analysis for ${domain}."
>

<link
rel="canonical"
href="https://aicitationscan.com/site-report/${domain}.html"
>

<script src="https://cdn.tailwindcss.com"></script>

</head>

<body class="bg-gray-50 text-gray-900">

<div class="max-w-5xl mx-auto px-6 py-12">

<a
href="/site-report/index.html"
class="text-emerald-600 font-semibold"
>
← Back to Reports
</a>

<h1 class="text-4xl font-bold mt-6 mb-4">
${domain} Technology Stack Report
</h1>

<p class="text-lg text-gray-600 mb-8">
AI visibility audit, CMS detection, migration complexity, and infrastructure analysis.
</p>

<div class="grid md:grid-cols-3 gap-6 mb-10">

<div class="bg-white rounded-2xl p-6 shadow-sm border">
<div class="text-sm text-gray-500">
Overall Score
</div>

<div class="text-4xl font-bold mt-2">
${report.score?.score || 0}
</div>

<div class="mt-2 text-emerald-600 font-semibold">
${report.score?.grade || "Unknown"}
</div>
</div>

<div class="bg-white rounded-2xl p-6 shadow-sm border">
<div class="text-sm text-gray-500">
AI Visibility
</div>

<div class="text-4xl font-bold mt-2">
${report.aiVisibility?.score || 0}
</div>

<div class="mt-2 text-violet-600 font-semibold">
${report.aiVisibility?.grade || "Unknown"}
</div>
</div>

<div class="bg-white rounded-2xl p-6 shadow-sm border">
<div class="text-sm text-gray-500">
Migration Risk
</div>

<div class="text-4xl font-bold mt-2">
${report.migrationRisk?.riskScore || 0}
</div>

<div class="mt-2 text-red-600 font-semibold">
${report.migrationRisk?.level || "Unknown"}
</div>
</div>

</div>

<section class="mb-12">

<h2 class="text-2xl font-bold mb-6">
Detected Technologies
</h2>

<ul class="grid md:grid-cols-2 gap-4">
${techHTML}
</ul>

</section>

<section class="mb-12">

<h2 class="text-2xl font-bold mb-4">
Insights
</h2>

<ul class="list-disc pl-6 space-y-2">

${(report.insights || [])
  .map(
    (i) =>
      `<li>${escapeHTML(i)}</li>`
  )
  .join("")}

</ul>

</section>

<section class="mt-20 border-t pt-10 text-sm text-gray-500">
Generated by AI Citation Scan.
</section>

</div>

</body>
</html>
`;
}

/**
 * =========================================================
 * PAGINATION
 * =========================================================
 */

function generatePaginationPages(
  registry
) {
  const totalPages = Math.ceil(
    registry.length / PAGE_SIZE
  );

  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {
    const start =
      (page - 1) * PAGE_SIZE;

    const items =
      registry.slice(
        start,
        start + PAGE_SIZE
      );

    const html =
      buildPaginationHTML(
        items,
        page,
        totalPages
      );

    const filename =
      page === 1
        ? "index.html"
        : `page-${page}.html`;

    fs.writeFileSync(
      path.join(
        SITE_REPORT_DIR,
        filename
      ),
      html
    );
  }
}

function buildPaginationHTML(
  items,
  currentPage,
  totalPages
) {
  return `
<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>
Website Technology Reports
</title>

<meta
name="description"
content="Browse website technology stack intelligence reports."
>

<script src="https://cdn.tailwindcss.com"></script>

</head>

<body class="bg-gray-50 text-gray-900">

<div class="max-w-6xl mx-auto px-6 py-12">

<h1 class="text-4xl font-bold mb-10">
Website Technology Reports
</h1>

<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

${items.map((item) => `
<a
href="${item.path}"
class="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-lg transition block"
>

<h2 class="text-xl font-bold mb-2">
${item.domain}
</h2>

<div class="text-sm text-gray-500 mb-3">
${item.grade}
</div>

<div class="text-sm">
AI Visibility:
${item.aiVisibility}
</div>

<div class="text-sm">
Migration Risk:
${item.migrationRisk}
</div>

</a>
`).join("")}

</div>

<div class="flex gap-3 mt-12 flex-wrap">

${Array.from(
  { length: totalPages },
  (_, i) => {
    const p = i + 1;

    const href =
      p === 1
        ? "/site-report/index.html"
        : `/site-report/page-${p}.html`;

    return `
<a
href="${href}"
class="px-4 py-2 rounded-xl border ${
  p === currentPage
    ? "bg-black text-white"
    : "bg-white"
}"
>
${p}
</a>
`;
  }
).join("")}

</div>

</div>

</body>
</html>
`;
}

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function normalizeDomain(domain) {
  return domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .toLowerCase();
}

function clean(url) {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true
    });
  }
}

function loadJSON(file, fallback) {
  if (!fs.existsSync(file)) {
    return fallback;
  }

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return fallback;
  }
}

function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
