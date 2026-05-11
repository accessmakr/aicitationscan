export function generateExplanation(detection) {

  const explanations = [];

  detection.matches.forEach(match => {
    explanations.push(match.evidence);
  });

  return explanations;
}
