export function normalizeOutput({
  detections = [],
  score = {},
  aiVisibility = {},
  migrationRisk = {},
  competitor = null,
  insights = []
}) {
  return {
    success: true,

    meta: {
      timestamp: new Date().toISOString(),
      version: "v2-unified"
    },

    detections,
    score,
    aiVisibility,
    migrationRisk,
    competitor,
    insights,

    summary: {
      grade: score.grade || "F",
      aiLevel: aiVisibility.grade || "Unknown",
      migrationLevel: migrationRisk.level || "Low"
    }
  };
}
