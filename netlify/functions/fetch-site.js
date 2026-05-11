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

    const response = await fetch(url, {
      headers: {
        "User-Agent": "AI Citation Scan Bot"
      }
    });

    const html = await response.text();

    const headers = {};

    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      statusCode: 200,

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        success: true,
        html,
        headers
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
