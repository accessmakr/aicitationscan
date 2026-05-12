import axios from "axios";

export default async (req, context) => {
  try {
    const url = new URL(req.url).searchParams.get("url");

    if (!url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing URL"
        }),
        {
          status: 400
        }
      );
    }

    const target =
      url.startsWith("http")
        ? url
        : `https://${url}`;

    const response = await axios.get(target, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        "User-Agent":
          "AI Citation Scan Bot"
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        html: response.data,
        headers: response.headers,
        finalUrl: response.request.res.responseUrl,
        status: response.status
      }),
      {
        headers: {
          "content-type": "application/json"
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
        status: 500
      }
    );
  }
};
