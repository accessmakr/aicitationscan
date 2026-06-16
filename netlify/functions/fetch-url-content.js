// netlify/functions/fetch-url-content.js
//
// Server-side URL content fetcher for the AI Citation Checker tool.
// Fetches a user-supplied article URL, extracts the main readable text
// with cheerio, and returns it so the citation engine can analyse it
// exactly as if the text had been pasted in manually.
//
// Endpoint (via the existing netlify.toml redirect /api/* -> /.netlify/functions/:splat):
//   POST /api/fetch-url-content    body: { "url": "https://example.com/article" }
//
// Security measures:
//   - Only http/https URLs accepted, hostname + resolved IP checked against
//     private/reserved ranges (SSRF + DNS-rebinding guard)
//   - Response capped at 500KB, 8s upstream timeout
//   - Basic per-IP rate limiting via Netlify Blobs (fails open if Blobs
//     is ever unavailable, so a secondary system never breaks the primary one)
//
// Known limitations (by design, communicated to the user on failure):
//   - Cannot read JS-rendered SPA content (cheerio does not execute JS)
//   - Cannot read paywalled or login-gated pages
//   - Some sites block non-browser user agents

import axios from 'axios';
import * as cheerio from 'cheerio';
import dns from 'node:dns';
import { getStore } from '@netlify/blobs';

const MAX_BYTES          = 500 * 1024; // 500KB cap on fetched response
const FETCH_TIMEOUT_MS   = 8000;       // headroom under Netlify's 10s function limit
const MAX_TEXT_CHARS     = 60000;      // cap on returned text payload
const RATE_LIMIT_WINDOW  = 60;         // seconds
const RATE_LIMIT_MAX     = 8;          // requests per window per IP

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function json(statusCode, payload) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(payload) };
}

/* ───────────────────────── SSRF guard ─────────────────────────
   Reject loopback, link-local, private, and carrier-NAT ranges so
   this function can never be used to probe internal infrastructure. */

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return true; // malformed -> unsafe
  const [a, b] = parts;
  if (a === 10) return true;                          // 10.0.0.0/8
  if (a === 127) return true;                          // 127.0.0.0/8 loopback
  if (a === 0) return true;                            // 0.0.0.0/8
  if (a === 169 && b === 254) return true;             // 169.254.0.0/16 (link-local + cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true;     // 172.16.0.0/12
  if (a === 192 && b === 168) return true;              // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true;    // 100.64.0.0/10 carrier-grade NAT
  return false;
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true;                                          // loopback
  if (/^fe[89ab]/.test(lower)) return true;                                  // fe80::/10 link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;         // fc00::/7 unique local
  if (lower.startsWith('::ffff:')) {                                        // IPv4-mapped IPv6
    const v4 = lower.split('::ffff:')[1];
    if (v4 && v4.includes('.')) return isPrivateIPv4(v4);
  }
  return false;
}

function isPrivateIP(ip) {
  return ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '[::1]', '::1']);

async function assertSafeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Enter a valid URL, including https://');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('This host cannot be fetched');
  }

  // Resolve DNS and verify every resulting IP is public.
  // This defends against DNS rebinding: a public-looking hostname
  // that resolves to an internal IP at request time.
  let addresses;
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch {
    throw new Error('Could not resolve this domain');
  }

  if (!addresses.length || addresses.some(a => isPrivateIP(a.address))) {
    throw new Error('This host cannot be fetched');
  }

  return parsed.toString();
}

/* ───────────────── Basic per-IP rate limiting ─────────────────
   Uses Netlify Blobs (already a project dependency). Fails open:
   if Blobs is ever unreachable, we log it and let the request
   through rather than breaking the tool over a secondary system. */
async function checkRateLimit(ip) {
  try {
    const store = getStore('citation-checker-rate-limit');
    const key = `rl:${ip}`;
    const now = Math.floor(Date.now() / 1000);

    const existingRaw = await store.get(key);
    const existing = existingRaw ? JSON.parse(existingRaw) : null;

    if (existing && now - existing.windowStart < RATE_LIMIT_WINDOW) {
      if (existing.count >= RATE_LIMIT_MAX) return false;
      await store.set(key, JSON.stringify({ count: existing.count + 1, windowStart: existing.windowStart }));
      return true;
    }

    await store.set(key, JSON.stringify({ count: 1, windowStart: now }));
    return true;
  } catch (err) {
    console.error('Rate limit check failed, failing open:', err.message);
    return true;
  }
}

/* ───────────────────── Content extraction ─────────────────────
   Strips non-content tags, prefers a real article/main container
   over full-body text, and normalises whitespace. */
function extractArticleText(html) {
  const $ = cheerio.load(html);

  $('script, style, noscript, iframe, svg, nav, footer, header, aside, form, button, .cookie-banner, .ad, .advertisement')
    .remove();

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').first().text() ||
    $('h1').first().text() ||
    '';

  const CONTENT_SELECTORS = [
    'article', 'main', '[role="main"]',
    '.post-content', '.article-content', '.article-body',
    '.entry-content', '.content', '#content',
  ];

  let container = null;
  for (const sel of CONTENT_SELECTORS) {
    const found = $(sel).first();
    if (found.length && found.text().trim().length > 200) {
      container = found;
      break;
    }
  }
  if (!container) container = $('body');

  const text = container
    .text()
    .replace(/\s+/g, ' ')
    .replace(/ ([.,;:!?])/g, '$1')
    .trim();

  return { title: title.trim().slice(0, 200), text };
}

/* ───────────────────────────── Handler ───────────────────────────────── */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: JSON_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed. Use POST.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const rawUrl = String(body.url || '').trim();
  if (!rawUrl) {
    return json(400, { error: 'Provide a "url" field' });
  }

  const clientIp =
    event.headers['x-nf-client-connection-ip'] ||
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown';

  const allowed = await checkRateLimit(clientIp);
  if (!allowed) {
    return json(429, { error: 'Too many requests. Please wait a minute and try again.' });
  }

  let safeUrl;
  try {
    safeUrl = await assertSafeUrl(rawUrl);
  } catch (err) {
    return json(400, { error: err.message });
  }

  try {
    const response = await axios.get(safeUrl, {
      timeout: FETCH_TIMEOUT_MS,
      maxContentLength: MAX_BYTES,
      maxBodyLength: MAX_BYTES,
      maxRedirects: 5,
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 300,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AICitationScanBot/1.0; +https://aicitationscan.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const contentType = String(response.headers['content-type'] || '');
    if (!contentType.includes('html')) {
      return json(422, { error: 'This URL did not return a readable HTML page. Paste the text directly instead.' });
    }

    const { title, text } = extractArticleText(response.data);

    if (text.length < 100) {
      return json(422, { error: 'Could not find readable article content on this page. Paste the text directly instead.' });
    }

    const trimmedText = text.slice(0, MAX_TEXT_CHARS);
    const wordCount = trimmedText.split(/\s+/).filter(Boolean).length;

    return json(200, {
      title,
      text: trimmedText,
      wordCount,
      sourceUrl: safeUrl,
      truncated: text.length > MAX_TEXT_CHARS,
    });

  } catch (err) {
    if (err.code === 'ECONNABORTED' || String(err.message || '').includes('timeout')) {
      return json(502, { error: 'The page took too long to respond. Paste the text directly instead.' });
    }
    if (err.response) {
      return json(502, { error: `The page returned an error (${err.response.status}). Paste the text directly instead.` });
    }
    if (String(err.message || '').includes('maxContentLength') || String(err.message || '').includes('maxBodyLength')) {
      return json(413, { error: 'This page is too large to fetch. Paste the text directly instead.' });
    }
    console.error('fetch-url-content error:', err.message);
    return json(502, { error: "This page couldn't be fetched. Paste the article text directly." });
  }
};
