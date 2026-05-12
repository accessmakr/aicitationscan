// /js/api-client.js

const API_BASE = "/.netlify/functions";

export async function analyzeSite(domain) {
  try {
    const res = await fetch(
      `${API_BASE}/analyze-site?url=${encodeURIComponent(domain)}`
    );

    if (!res.ok) {
      throw new Error("Failed to analyze site");
    }

    return await res.json();

  } catch (err) {
    console.error("analyzeSite error:", err);

    return {
      success: false,
      error: err.message
    };
  }
}

export async function compareDomains(urlA, urlB) {
  try {
    const res = await fetch(
      `${API_BASE}/compare-domains?urlA=${encodeURIComponent(urlA)}&urlB=${encodeURIComponent(urlB)}`
    );

    if (!res.ok) {
      throw new Error("Failed to compare domains");
    }

    return await res.json();

  } catch (err) {
    console.error("compareDomains error:", err);

    return {
      success: false,
      error: err.message
    };
  }
}

export async function getCachedReport(domain) {
  try {
    const res = await fetch(
      `${API_BASE}/cache-site-report?url=${encodeURIComponent(domain)}`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch cached report");
    }

    return await res.json();

  } catch (err) {
    console.error("getCachedReport error:", err);

    return {
      success: false,
      error: err.message
    };
  }
}
