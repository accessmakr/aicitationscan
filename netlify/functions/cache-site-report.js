import fs from "fs";
import path from "path";

const CACHE_DIR = path.resolve("site-report/cache");
const TTL_HOURS = 24;

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function sanitizeDomain(domain = "") {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .replace(/[^a-z0-9.-]/g, "");
}

function getCachePath(domain) {
  return path.join(
    CACHE_DIR,
    `${sanitizeDomain(domain)}.json`
  );
}

function isExpired(timestamp) {
  const now = Date.now();
  const age = now - timestamp;
  const ttl = TTL_HOURS * 60 * 60 * 1000;

  return age > ttl;
}

export async function handler(event) {
  try {
    ensureCacheDir();

    const domain =
      event.queryStringParameters?.domain;

    if (!domain) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({
          success: false,
          cached: false,
          error: "Missing domain parameter"
        })
      };
    }

    const cleanDomain = sanitizeDomain(domain);

    const cachePath = getCachePath(cleanDomain);

    if (!fs.existsSync(cachePath)) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({
          success: true,
          cached: false,
          domain: cleanDomain,
          message: "No cache found"
        })
      };
    }

    const raw = fs.readFileSync(
      cachePath,
      "utf8"
    );

    const parsed = JSON.parse(raw);

    if (!parsed.cachedAt || !parsed.data) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          success: false,
          cached: false,
          error: "Invalid cache structure"
        })
      };
    }

    if (isExpired(parsed.cachedAt)) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({
          success: true,
          cached: false,
          expired: true,
          domain: cleanDomain,
          message: "Cache expired"
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600"
      },
      body: JSON.stringify({
        success: true,
        cached: true,
        expired: false,
        domain: cleanDomain,
        cachedAt: parsed.cachedAt,
        data: parsed.data
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({
        success: false,
        cached: false,
        error: error.message
      })
    };
  }
}
