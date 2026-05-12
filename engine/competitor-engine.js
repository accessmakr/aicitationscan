export function compareCompetitors(a, b) {
  const scoreA = a.score?.score || 0;
  const scoreB = b.score?.score || 0;

  return {
    winner:
      scoreA > scoreB ? a.url :
      scoreB > scoreA ? b.url :
      "Tie",

    gap: Math.abs(scoreA - scoreB),

    comparison: {
      a: scoreA,
      b: scoreB
    }
  };
}
