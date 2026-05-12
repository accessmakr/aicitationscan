export function calculateScores(detections) {
  if (!Array.isArray(detections)) {
    return {
      score: 0,
      grade: "Unknown",
      breakdown: []
    };
  }

  let total = 0;

  const breakdown = detections.map((item) => {
    const confidence = item.confidence || 0;
    total += confidence;

    return {
      technology: item.technology,
      confidence
    };
  });

  const avgScore =
    detections.length > 0
      ? Math.round(total / detections.length)
      : 0;

  return {
    score: avgScore,
    grade: getGrade(avgScore),
    breakdown
  };
}

function getGrade(score) {
  if (score >= 85) return "A (Modern Stack)";
  if (score >= 70) return "B (Good Stack)";
  if (score >= 50) return "C (Average Stack)";
  if (score >= 30) return "D (Legacy Stack)";
  return "F (Outdated Stack)";
}
