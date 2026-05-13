export async function analyzeDomain(domain) {

  const response = await fetch(
    `/.netlify/functions/analyze-site?url=${encodeURIComponent(domain)}`
  );

  return await response.json();
}

export async function compareDomains(a, b) {

  const response = await fetch(
    `/.netlify/functions/compare-domains?urlA=${encodeURIComponent(a)}&urlB=${encodeURIComponent(b)}`
  );

  return await response.json();
}
