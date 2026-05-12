import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================
// CONFIG
// ==============================
const SITE_REPORT_DIR = path.join(__dirname, "../public/site-report");
const INDEX_FILE = path.join(SITE_REPORT_DIR, "index.json");

// ==============================
// HELPERS
// ==============================
function normalizeDomain(input) {
  return input
    .replace("https://", "")
    .replace("http://", "")
    .replace("www.", "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function safeFileName(domain) {
  return domain.replace(/\./g, "-");
}

function ensureDir() {
  if (!fs.existsSync(SITE_REPORT_DIR)) {
    fs.mkdirSync(SITE_REPORT_DIR, { recursive: true });
  }
}

function loadIndex() {
  try {
    if (!fs.existsSync(INDEX_FILE)) return [];
    return JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveIndex(data) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(data, null, 2));
}

// ==============================
// CORE REPORT HTML GENERATOR
// ==============================
function generateHTMLReport(domain, analysis) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${domain} | AI Site Report</title>
  <meta name="description" content="AI generated technology, SEO, and visibility report for ${domain}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://aicitationscan.com/site-report/${safeFileName(domain)}.html">
</head>
<body>
  <h1>${domain} — AI Site Report</h1>

  <h2>Grade: ${analysis.grade}</h2>
  <h3>Score: ${analysis.score}</h3>

  <h2>Detections</h2>
  <pre>${JSON.stringify(analysis.detections, null, 2)}</pre>

  <h2>AI Visibility</h2>
  <pre>${JSON.stringify(analysis.aiVisibility, null, 2)}</pre>

  <h2>Migration Risk</h2>
  <pre>${JSON.stringify(analysis.migrationRisk, null, 2)}</pre>

  <h2>Insights</h2>
  <ul>
    ${analysis.insights.map(i => `<li>${i}</li>`).join("")}
  </ul>
</body>
</html>`;
}

// ==============================
// MAIN GENERATOR
// ==============================
async function generate(domainInput) {
  ensureDir();

  const domain = normalizeDomain(domainInput);
  const fileName = safeFileName(domain) + ".html";
  const filePath = path.join(SITE_REPORT_DIR, fileName);

  console.log(`Generating report for: ${domain}`);

  // 1. CALL YOUR API
  let analysis;
  try {
    const res = await axios.get(
      `https://aicitationscan.com/.netlify/functions/analyze-site?url=${domain}`
    );
    analysis = res.data;
  } catch (err) {
    console.error("API failed:", err.message);
    return;
  }

  // 2. WRITE HTML REPORT
  const html = generateHTMLReport(domain, analysis);
  fs.writeFileSync(filePath, html);
  console.log(`Report written: ${filePath}`);

  // 3. UPDATE INDEX.JSON
  const index = loadIndex();

  const exists = index.find(i => i.domain === domain);

  if (!exists) {
    index.push({
      domain,
      file: `/site-report/${fileName}`,
      score: analysis.score?.score || 0,
      grade: analysis.score?.grade || "Unknown",
      date: new Date().toISOString().split("T")[0]
    });

    saveIndex(index);
    console.log("Index updated");
  } else {
    console.log("Index already contains domain (skipping)");
  }

  console.log("DONE");
}

// ==============================
// CLI ENTRY
// ==============================
const args = process.argv.slice(2);

if (!args.length) {
  console.log("Usage: node scripts/generate-site-report.js openai.com");
  process.exit(1);
}

generate(args[0]);
