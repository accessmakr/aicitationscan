import fs from "fs";
import path from "path";

const SITE_URL = "https://aicitationscan.com";
const API_ENDPOINT = `${SITE_URL}/.netlify/functions/analyze-site`;

// WHERE GENERATED REPORTS ARE STORED
const REPORTS_DIR = path.resolve("site-report");

// DOMAINS TO GENERATE REPORTS FOR
// YOU CAN LATER AUTO-FILL THIS FROM DATABASES/APIS/CSV
const domains = [
  "openai.com",
  "shopify.com",
  "vercel.com",
  "notion.so",
  "hubspot.com"
];

// ENSURE REPORT FOLDER EXISTS
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// CLEAN DOMAIN FOR URL + FILESYSTEM
function cleanDomain(domain) {
  return domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\//g, "")
    .replace(/\./g, "-")
    .toLowerCase();
}

// ESCAPE HTML
function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// BUILD TECHNOLOGY LIST
function renderTechnologyList(detections = []) {
  if (!detections.length) {
    return `<p>No major technologies detected.</p>`;
  }

  return detections
    .map((tech) => {
      return `
        <div class="tech-card">
          <h3>${escapeHtml(tech.technology)}</h3>
          <p><strong>Confidence:</strong> ${tech.confidence}%</p>

          <div class="signal-group">
            <strong>Signals:</strong>
            <ul>
              ${(tech.signals || [])
                .map(
                  (signal) =>
                    `<li>${escapeHtml(signal)}</li>`
                )
                .join("")}
            </ul>
          </div>
        </div>
      `;
    })
    .join("");
}

// BUILD INSIGHTS
function renderInsights(insights = []) {
  if (!insights.length) {
    return `<p>No insights available.</p>`;
  }

  return `
    <ul class="insights-list">
      ${insights
        .map(
          (item) => `<li>${escapeHtml(item)}</li>`
        )
        .join("")}
    </ul>
  `;
}

// BUILD STRUCTURED DATA
function generateStructuredData(domain, data) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${domain} Technology Stack Analysis`,
    description:
      `AI visibility + technology intelligence analysis for ${domain}`,
    author: {
      "@type": "Organization",
      name: "AI Citation Scan"
    },
    publisher: {
      "@type": "Organization",
      name: "AI Citation Scan"
    },
    mainEntity: {
      "@type": "WebSite",
      name: domain,
      url: `https://${domain}`
    },
    keywords: [
      "technology stack",
      "AI visibility",
      "SEO analysis",
      "website intelligence",
      "CMS detection"
    ],
    about: (data.detections || []).map((x) => x.technology)
  };
}

// BUILD HTML REPORT
function generateHTML(domain, data) {
  const slug = cleanDomain(domain);

  const title = `${domain} Technology Stack Analysis & AI Visibility Audit`;

  const description =
    `Analyze ${domain}'s CMS, hosting, AI visibility, SEO readiness, infrastructure stack, analytics tools, migration risk, and frontend technologies.`;

  const technologies = renderTechnologyList(
    data.detections || []
  );

  const insights = renderInsights(data.insights || []);

  const structuredData = generateStructuredData(domain, data);

  return `
<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>${escapeHtml(title)}</title>

<meta name="description" content="${escapeHtml(description)}" />

<link rel="canonical" href="${SITE_URL}/site-report/${slug}.html" />

<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${SITE_URL}/site-report/${slug}.html" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />

<script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
</script>

<style>
body {
  font-family: Arial, sans-serif;
  line-height: 1.7;
  max-width: 1100px;
  margin: auto;
  padding: 40px;
  color: #111;
}

h1, h2, h3 {
  line-height: 1.2;
}

.hero {
  margin-bottom: 50px;
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 50px;
}

.score-card {
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 10px;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.tech-card {
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 10px;
}

.signal-group ul {
  padding-left: 18px;
}

.insights-list li {
  margin-bottom: 10px;
}

.section {
  margin-bottom: 60px;
}

footer {
  margin-top: 80px;
  padding-top: 30px;
  border-top: 1px solid #ddd;
}
</style>

</head>
<body>

<header class="hero">
  <h1>${escapeHtml(domain)} Technology Stack Analysis</h1>

  <p>
    Comprehensive AI visibility audit, infrastructure intelligence,
    CMS detection, frontend framework analysis, SEO readiness review,
    hosting analysis, and migration complexity scoring.
  </p>
</header>

<section class="section">
  <h2>Overall Intelligence Scores</h2>

  <div class="score-grid">

    <div class="score-card">
      <h3>Technology Grade</h3>
      <p><strong>${escapeHtml(data.score?.grade || "N/A")}</strong></p>
      <p>Score: ${data.score?.score || 0}/100</p>
    </div>

    <div class="score-card">
      <h3>AI Visibility</h3>
      <p><strong>${escapeHtml(data.aiVisibility?.grade || "N/A")}</strong></p>
      <p>Score: ${data.aiVisibility?.score || 0}/100</p>
    </div>

    <div class="score-card">
      <h3>Migration Risk</h3>
      <p><strong>${escapeHtml(data.migrationRisk?.level || "N/A")}</strong></p>
      <p>Risk Score: ${data.migrationRisk?.riskScore || 0}/100</p>
    </div>

  </div>
</section>

<section class="section">
  <h2>Detected Technologies</h2>

  <div class="tech-grid">
    ${technologies}
  </div>
</section>

<section class="section">
  <h2>AI Visibility Analysis</h2>

  <p>
    This section evaluates how understandable the website is for
    AI systems, search engines, LLM crawlers, and answer engines.
  </p>

  <ul>
    <li>
      Schema detected:
      <strong>${data.aiVisibility?.signals?.schema ? "Yes" : "No"}</strong>
    </li>

    <li>
      Semantic structure:
      <strong>${data.aiVisibility?.signals?.semantic ? "Strong" : "Weak"}</strong>
    </li>

    <li>
      LLM crawl readiness:
      <strong>${data.aiVisibility?.signals?.llmReady ? "Ready" : "Needs Improvement"}</strong>
    </li>
  </ul>
</section>

<section class="section">
  <h2>Technology Insights</h2>
  ${insights}
</section>

<section class="section">
  <h2>What This Means</h2>

  <p>
    This report combines technology fingerprinting, AI visibility scoring,
    SEO intelligence, frontend detection, hosting analysis, CDN analysis,
    and migration complexity evaluation.
  </p>

  <p>
    AI Citation Scan uses a multi-engine detection architecture inspired by:
  </p>

  <ul>
    <li>BuiltWith</li>
    <li>Wappalyzer</li>
    <li>Ahrefs</li>
    <li>AI visibility optimization systems</li>
  </ul>
</section>

<footer>
  <p>
    Generated by AI Citation Scan
  </p>

  <p>
    <a href="${SITE_URL}/programmatic/website-tech-stack-checker.html">
      Run another technology stack analysis
    </a>
  </p>
</footer>

</body>
</html>
`;
}

// GENERATE REPORT
async function generateReport(domain) {
  try {
    console.log(`Generating report for ${domain}...`);

    const response = await fetch(
      `${API_ENDPOINT}?url=${encodeURIComponent(domain)}`
    );

    const data = await response.json();

    if (!data.success) {
      console.error(`Failed: ${domain}`);
      console.error(data.error);
      return;
    }

    const slug = cleanDomain(domain);

    const html = generateHTML(domain, data);

    const filePath = path.join(
      REPORTS_DIR,
      `${slug}.html`
    );

    fs.writeFileSync(filePath, html);

    console.log(`Saved: ${filePath}`);

  } catch (error) {
    console.error(`Error generating ${domain}`);
    console.error(error.message);
  }
}

// MAIN RUNNER
async function run() {
  console.log("Starting programmatic SEO generation...");

  for (const domain of domains) {
    await generateReport(domain);
  }

  console.log("All reports generated.");
}

run();
```

# NEXT STEP

Create this folder at repo root:

```txt
/site-report/
```

Then run:

```bash
node scripts/generate-site-report.js
```

It will automatically generate:

```txt
/site-report/openai-com.html
/site-report/shopify-com.html
/site-report/vercel-com.html
```

using your LIVE intelligence API.

# IMPORTANT

Your sitemap workflow can now automatically:

* detect new report pages
* add them to sitemap.xml
* redeploy sitemap
* allow Google to discover them

This is the beginning of the full programmatic SEO layer.
