export async function analyzeTechnology(
  { html = "", headers = {} },
  signatures = {}
) {

  const text =
    `${html} ${JSON.stringify(headers)}`
      .toLowerCase();

  const detections = [];

  for (const category of Object.keys(signatures)) {

    const technologies =
      signatures[category];

    for (const techName of Object.keys(technologies)) {

      const patterns =
        technologies[techName];

      let matched = false;

      for (const pattern of patterns) {

        if (
          text.includes(
            pattern.toLowerCase()
          )
        ) {

          matched = true;

          detections.push({
            category,
            technology: techName,
            confidence: 90,
            matchedPattern: pattern
          });

          break;
        }
      }
    }
  }

  return detections;
}
