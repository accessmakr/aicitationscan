import axios from "axios";
import cheerio from "cheerio";
import crypto from "crypto";
import { getStore } from "@netlify/blobs";

const CACHE = getStore("tech-stack-cache");

const RATE_LIMIT = new Map();

function normalizeUrl(input) {
  if (!input.startsWith("http")) {
    return `https://${input}`;
  }
  return input;
}

function generateCacheKey(url) {
  return crypto.createHash("md5").update(url).digest("hex");
}

function detectCMS(html) {
  const lower = html.toLowerCase();

  if (lower.includes("wp-content")) {
    return "WordPress";
  }

  if (lower.includes("shopify")) {
    return "Shopify";
  }

  if (lower.includes("_next")) {
    return "Next.js";
  }

  if (lower.includes("wix")) {
    return "Wix";
  }

  if (lower.includes("squarespace")) {
    return "Squarespace";
  }

  return "Unknown";
}

function detectAnalytics(html) {
  const found = [];

  if (html.includes("gtag")) {
    found.push("Google Analytics");
  }

  if (html.includes("googletagmanager")) {
    found.push("Google Tag Manager");
  }

  if (html.includes("facebook.net")) {
    found.push("Meta Pixel");
  }

  if (html.includes("clarity.ms")) {
    found.push("Microsoft Clarity");
  }

  return found;
}

function detectAI(html) {
  const found = [];

  if (html.includes("openai")) {
    found.push("OpenAI");
  }

  if (html.includes("chatbase")) {
    found.push("Chatbase");
  }

  if (html.includes("intercom")) {
    found.push("Intercom AI");
  }

  return found;
}

function detectCDN(headers) {
  const server = headers.server || "";

  if (server.includes("cloudflare")) {
    return "Cloudflare";
  }

  if (server.includes("netlify")) {
    return "Netlify";
  }

  if (server.includes("vercel")) {
    return "Vercel";
  }

  return "Unknown";
}

function calculateScore(results) {
  let score = 100;

  if (results.cms === "Unknown") {
    score -= 10;
  }

  if (results.analytics.length === 0) {
    score -= 5;
  }

  if (results.aiTools.length === 0) {
    score -= 5;
  }

  return score;
}

export default async (req, context) => {
  try {
    const ip =
      req.headers.get("x-forwarded-for") || "anonymous";

    const now = Date.now();

    if (RATE_LIMIT.has(ip)) {
      const diff = now - RATE_LIMIT.get(ip);

      if (diff < 5000) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Rate limit exceeded"
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
      }
    }

    RATE_LIMIT.set(ip, now);

    const urlParam =
      new URL(req.url).searchParams.get("url");

    if (!urlParam) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing URL"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const targetUrl = normalizeUrl(urlParam);

    const cacheKey = generateCacheKey(targetUrl);

    const cached = await CACHE.get(cacheKey, {
      type: "json"
    });

    if (cached) {
      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          data: cached
        }),
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const response = await axios.get(targetUrl, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 AI Citation Scan Bot"
      }
    });

    const html = response.data;

    const $ = cheerio.load(html);

    const title = $("title").text() || "";

    const metaDescription =
      $('meta[name="description"]').attr("content") || "";

    const scripts = [];

    $("script").each((i, el) => {
      const src = $(el).attr("src");

      if (src) {
        scripts.push(src);
      }
    });

    const results = {
      url: targetUrl,
      title,
      metaDescription,
      cms: detectCMS(html),
      analytics: detectAnalytics(html),
      aiTools: detectAI(html),
      cdn: detectCDN(response.headers),
      scriptCount: scripts.length,
      scripts,
      headers: response.headers,
      generatedAt: new Date().toISOString()
    };

    results.score = calculateScore(results);

    await CACHE.setJSON(cacheKey, results);

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        data: results
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};
