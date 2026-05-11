export function matchPattern(content, pattern, matchType = "contains") {

  if (!content || !pattern) {
    return false;
  }

  switch (matchType) {

    case "exact":
      return content === pattern;

    case "startsWith":
      return content.startsWith(pattern);

    case "endsWith":
      return content.endsWith(pattern);

    case "regex":
      return new RegExp(pattern, "i").test(content);

    case "contains":
    default:
      return content.toLowerCase().includes(pattern.toLowerCase());
  }
}
