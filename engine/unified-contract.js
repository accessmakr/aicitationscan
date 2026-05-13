export function buildUnifiedResponse({
  url,
  detections,
  score,
  aiVisibility,
  migrationRisk
}) {

  return {

    success: true,

    analyzedAt:
      new Date().toISOString(),

    url,

    detections,

    score,

    aiVisibility,

    migrationRisk,

    reportPath:
      `/site-report/${
        url
          .replace("https://", "")
          .replace("http://", "")
      }.html`
  };
}
