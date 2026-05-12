export function calculateScores(detections = []) {
  if (!Array.isArray(detections)) {
    detections = [];
  }

  const raw = detections.reduce((sum, d) => sum + (d.confidence || 0), 0);

  const score = Math.min(Math.round(raw / 2), 100);

  let grade = "F";
  if (score >= 90) grade = "A";
  else if (score >= 75) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 40) grade = "D";

  return {
    score,
    grade
  };
}
