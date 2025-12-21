"""
Levenshtein distance service for fuzzy text matching.
"""


def levenshtein_distance(s1: str, s2: str) -> int:
    """
    Calculate the Levenshtein distance between two strings.
    
    The Levenshtein distance is the minimum number of single-character edits
    (insertions, deletions, or substitutions) required to change one string into another.
    
    Args:
        s1: First string
        s2: Second string
        
    Returns:
        The Levenshtein distance between s1 and s2
    """
    # Convert to lowercase for case-insensitive comparison
    s1 = s1.lower()
    s2 = s2.lower()
    
    # Create a matrix to store distances
    len1, len2 = len(s1), len(s2)
    
    # Initialize matrix with base cases
    matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]
    
    # Fill first column and row
    for i in range(len1 + 1):
        matrix[i][0] = i
    for j in range(len2 + 1):
        matrix[0][j] = j
    
    # Calculate distances
    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            if s1[i - 1] == s2[j - 1]:
                cost = 0
            else:
                cost = 1
            
            matrix[i][j] = min(
                matrix[i - 1][j] + 1,      # deletion
                matrix[i][j - 1] + 1,      # insertion
                matrix[i - 1][j - 1] + cost  # substitution
            )
    
    return matrix[len1][len2]


def levenshtein_similarity(query: str, text: str) -> float:
    """
    Calculate similarity score between two strings based on Levenshtein distance.
    Truncates the longer string to match the query length for better partial matching.
    
    Returns a score between 0.0 (completely different) and 1.0 (identical).
    
    Args:
        query: The search query string
        text: The text to compare against
        
    Returns:
        Similarity score between 0.0 and 1.0
    """
    query_lower = query.lower()
    text_lower = text.lower()
    
    # If query is longer than text, use full text
    if len(query_lower) >= len(text_lower):
        distance = levenshtein_distance(query_lower, text_lower)
        max_len = max(len(query_lower), len(text_lower))
        return 1.0 if max_len == 0 else 1.0 - (distance / max_len)
    
    # Find the best matching substring of the same length as query
    best_similarity = 0.0
    query_len = len(query_lower)
    
    for i in range(len(text_lower) - query_len + 1):
        substring = text_lower[i:i + query_len]
        distance = levenshtein_distance(query_lower, substring)
        similarity = 1.0 - (distance / query_len)
        
        if similarity > best_similarity:
            best_similarity = similarity
        
        # Early exit if we found a perfect match
        if best_similarity == 1.0:
            break
    
    return best_similarity


def search_by_similarity(query: str, items: list[tuple[str, any]], threshold: float = 0.6) -> list[tuple[any, float]]:
    """
    Search items by similarity to query string using Levenshtein distance.
    
    Args:
        query: The search query string
        items: List of tuples (text_to_match, item_data)
        threshold: Minimum similarity score to include (0.0 to 1.0)
        
    Returns:
        List of tuples (item_data, similarity_score) sorted by similarity (highest first)
    """
    results = []
    
    for text, item in items:
        similarity = levenshtein_similarity(query, text)
        if similarity >= threshold:
            results.append((item, similarity))
    
    # Sort by similarity score (highest first)
    results.sort(key=lambda x: x[1], reverse=True)
    
    return results
