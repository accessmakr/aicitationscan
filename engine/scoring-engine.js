export function calculateScores({ html = "", headers = {}, stack = [] }) {
  const text = html.toLowerCase();
  const headerText = JSON.stringify(headers).toLowerCase();

  let seo = 70;
  let performance = 70;
  let security = 70;

  // SEO signals
  if (text.includes("meta name=\"description\"")) seo += 5;
  if (text.includes("schema.org")) seo += 10;
  if (text.includes("og:title")) seo += 5;

  // Performance signals
  if (text.includes("cdn")) performance += 5;
  if (text.includes("cloudflare")) performance += 5;
  if (stack.length > 5) performance -= 5;

  // Security signals
  if (headerText.includes("strict-transport-security")) security += 10;
  if (headerText.includes("content-security-policy")) security += 10;

  return {
    seo: Math.min(seo, 100),
    performance: Math.min(performance, 100),
    security: Math.min(security, 100)
  };
}
