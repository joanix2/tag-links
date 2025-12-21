/**
 * Calculate the Levenshtein distance between two strings.
 *
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string into another.
 */
export function levenshteinDistance(s1: string, s2: string): number {
  // Convert to lowercase for case-insensitive comparison
  const str1 = s1.toLowerCase();
  const str2 = s2.toLowerCase();

  const len1 = str1.length;
  const len2 = str2.length;

  // Create a matrix to store distances
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Fill first column and row
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings based on Levenshtein distance.
 * Truncates the longer string to match the query length for better partial matching.
 *
 * Returns a score between 0.0 (completely different) and 1.0 (identical).
 */
export function levenshteinSimilarity(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // If query is longer than text, use full text
  if (queryLower.length >= textLower.length) {
    const distance = levenshteinDistance(queryLower, textLower);
    const maxLen = Math.max(queryLower.length, textLower.length);
    return maxLen === 0 ? 1.0 : 1.0 - distance / maxLen;
  }

  // Find the best matching substring of the same length as query
  let bestSimilarity = 0;
  const queryLen = queryLower.length;

  for (let i = 0; i <= textLower.length - queryLen; i++) {
    const substring = textLower.substring(i, i + queryLen);
    const distance = levenshteinDistance(queryLower, substring);
    const similarity = 1.0 - distance / queryLen;

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
    }

    // Early exit if we found a perfect match
    if (bestSimilarity === 1.0) {
      break;
    }
  }

  return bestSimilarity;
}

/**
 * Filter and sort items by similarity to query using Levenshtein distance.
 */
export function fuzzySearch<T>(query: string, items: T[], getText: (item: T) => string, threshold: number = 0.3): T[] {
  if (!query.trim()) {
    return items;
  }

  // Calculate similarity for each item
  const withSimilarity = items.map((item) => ({
    item,
    similarity: levenshteinSimilarity(query, getText(item)),
  }));

  // Filter by threshold and sort by similarity (highest first)
  return withSimilarity
    .filter(({ similarity }) => similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map(({ item }) => item);
}
