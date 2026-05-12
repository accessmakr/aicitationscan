export function calculateScores(detections = []) {
  if (!Array.isArray(detections)) {
    return {
      score: 0,
      grade: "F",
      breakdown: []
    };
  }

  let total = 0;
  let max = 0;

  const breakdown = detections.map((d) => {
    const weight = d.confidence || 0;

    total += weight;
    max += 100;

    return {
      technology: d.technology,
      contribution: weight
    };
  });

  const score = Math.min(
    Math.round((total / Math.max(max, 1)) * 100),
    100
  );

  let grade = "F";

  if (score >= 90) grade = "A (Modern Stack)";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 40) grade = "D";

  return {
    score,
    grade,
    breakdown
  };
}
