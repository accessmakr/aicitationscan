import axios from "axios";

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "Mozilla/5.0 (X11; Linux x86_64)"
];

export async function fetchWithRetry(url, retries = 2) {

  for (let i = 0; i <= retries; i++) {

    try {

      const response = await axios.get(url, {
        timeout: 10000,

        headers: {
          "User-Agent":
            userAgents[
              Math.floor(Math.random() * userAgents.length)
            ],

          "Accept":
            "text/html,application/xhtml+xml"
        }
      });

      return {
        html: response.data,
        headers: response.headers
      };

    } catch (error) {

      if (i === retries) {
        throw new Error(
          `Unable to fetch site: ${
            error.response?.status || "Timeout"
          }`
        );
      }

      await new Promise(resolve =>
        setTimeout(resolve, 1200)
      );
    }
  }
}
