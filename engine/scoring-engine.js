export function calculateConfidence(score, baseConfidence) {

  let confidence = score * baseConfidence * 10;

  if (confidence > 100) {
    confidence = 100;
  }

  return Math.round(confidence);
}
