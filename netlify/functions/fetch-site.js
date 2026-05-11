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

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 Tech Stack Intelligence Bot"
      }
    });

    const html = response.data;

    // lightweight script extraction only (no DOM parser)
    const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)]
      .map(m => m[1]);

    return new Response(JSON.stringify({
      success: true,
      data: {
        url,
        status: response.status,
        headers: response.headers,
        html: html.slice(0, 100000),
        scripts
      }
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500 });
  }
};
