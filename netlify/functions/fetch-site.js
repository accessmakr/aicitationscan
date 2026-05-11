import axios from "axios";

export default async (req) => {
  try {
    const urlParam = new URL(req.url).searchParams.get("url");

    if (!urlParam) {
      return new Response(JSON.stringify({
        success: false,
        error: "Missing URL"
      }), { status: 400 });
    }

    const url = urlParam.startsWith("http")
      ? urlParam
      : `https://${urlParam}`;

    let response;

    try {
      response = await axios.get(url, {
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });
    } catch (err) {
      // HANDLE BLOCKED / 403 / BOT PROTECTION GRACEFULLY
      return new Response(JSON.stringify({
        success: false,
        error: "blocked_by_target",
        statusCode: err.response?.status || 0,
        url,
        note: "Target site blocked server-side request. Returning partial metadata only.",
        headers: err.response?.headers || {},
        partial: true
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    const html = response.data || "";

    // Lightweight script extraction (no DOM parser)
    const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)]
      .map(m => m[1]);

    // Basic metadata extraction (lightweight, safe)
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "";

    const metaDescriptionMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
    );
    const metaDescription = metaDescriptionMatch ? metaDescriptionMatch[1] : "";

    return new Response(JSON.stringify({
      success: true,
      data: {
        url,
        status: response.status,
        headers: response.headers,
        title,
        metaDescription,
        html: html.slice(0, 100000), // prevent payload explosion
        scripts,
        scriptCount: scripts.length
      }
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: "internal_error",
      message: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};
