export function calculateMigrationRisk(detections = []) {
  let risk = 30;

  const techs = detections.map(d => d.technology);

  if (techs.includes("wordpress")) risk += 30;
  if (techs.includes("shopify")) risk += 25;
  if (techs.includes("webflow")) risk += 15;

  if (detections.length > 8) risk += 20;

  return {
    riskScore: Math.min(risk, 100),
    level:
      risk > 70 ? "High"
      : risk > 40 ? "Medium"
      : "Low"
  };
}
