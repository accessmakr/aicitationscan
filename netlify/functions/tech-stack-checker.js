import axios from "axios";
import cheerio from "cheerio";
import fs from "fs";
import path from "path";

const loadJSON = (filename) => {
  const filePath = path.resolve(`data/${filename}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const cmsSignatures = loadJSON("cms-signatures.json");
const frameworkSignatures = loadJSON("framework-signatures.json");
const analyticsSignatures = loadJSON("analytics-signatures.json");
const hostingSignatures = loadJSON("hosting-signatures.json");

function detectTechnologies(html, signatures) {
  const found = [];

  signatures.forEach((tech) => {
    const matched = tech.patterns.some((pattern) =>
      html.toLowerCase().includes(pattern.toLowerCase())
    );

    if (matched) {
      found.push(tech.name);
    }
  });

  return found;
}

export async function handler(event) {
  try {
    const url = event.queryStringParameters.url;

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing URL"
        })
      };
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "AI Citation Scan Bot"
      }
    });

    const html = response.data;

    const $ = cheerio.load(html);

    const title = $("title").text() || "Unknown";

    const cms = detectTechnologies(html, cmsSignatures);
    const frameworks = detectTechnologies(html, frameworkSignatures);
    const analytics = detectTechnologies(html, analyticsSignatures);
    const hosting = detectTechnologies(html, hostingSignatures);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        title,
        cms,
        frameworks,
        analytics,
        hosting
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}
