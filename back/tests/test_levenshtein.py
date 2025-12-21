"""
Tests for the Levenshtein distance service.
"""
import pytest
from src.services.levenshtein_service import (
    levenshtein_distance,
    levenshtein_similarity,
    search_by_similarity
)


def test_levenshtein_distance_identical():
    """Test that identical strings have distance 0"""
    assert levenshtein_distance("hello", "hello") == 0
    assert levenshtein_distance("Python", "python") == 0  # Case insensitive


def test_levenshtein_distance_one_edit():
    """Test single character edits"""
    assert levenshtein_distance("cat", "bat") == 1  # substitution
    assert levenshtein_distance("cat", "cats") == 1  # insertion
    assert levenshtein_distance("cats", "cat") == 1  # deletion


def test_levenshtein_distance_multiple_edits():
    """Test multiple character edits"""
    assert levenshtein_distance("kitten", "sitting") == 3
    assert levenshtein_distance("saturday", "sunday") == 3


def test_levenshtein_similarity():
    """Test similarity score calculation"""
    # Identical strings should have similarity 1.0
    assert levenshtein_similarity("hello", "hello") == 1.0
    
    # Completely different strings should have low similarity
    similarity = levenshtein_similarity("abc", "xyz")
    assert 0.0 <= similarity < 0.5
    
    # Similar strings should have high similarity
    similarity = levenshtein_similarity("javascript", "javascrip")
    assert similarity > 0.8


def test_search_by_similarity():
    """Test fuzzy search functionality"""
    items = [
        ("javascript", {"id": 1, "name": "JavaScript"}),
        ("python", {"id": 2, "name": "Python"}),
        ("typescript", {"id": 3, "name": "TypeScript"}),
        ("java", {"id": 4, "name": "Java"}),
    ]
    
    # Search for "javascrip" should match "javascript" and "typescript"
    results = search_by_similarity("javascrip", items, threshold=0.7)
    
    # Should have matches
    assert len(results) > 0
    
    # First result should be the best match (javascript)
    assert results[0][0]["id"] == 1
    
    # Results should be sorted by similarity
    for i in range(len(results) - 1):
        assert results[i][1] >= results[i + 1][1]


def test_search_by_similarity_no_matches():
    """Test search with no matches above threshold"""
    items = [
        ("apple", {"id": 1}),
        ("banana", {"id": 2}),
    ]
    
    results = search_by_similarity("xyz", items, threshold=0.9)
    assert len(results) == 0


def test_search_by_similarity_threshold():
    """Test that threshold filtering works correctly"""
    items = [
        ("test", {"id": 1}),
        ("testing", {"id": 2}),
        ("completely different", {"id": 3}),
    ]
    
    # Low threshold should include more results
    results_low = search_by_similarity("test", items, threshold=0.3)
    results_high = search_by_similarity("test", items, threshold=0.8)
    
    assert len(results_low) >= len(results_high)


def test_levenshtein_similarity_substring():
    """Test similarity with substring matching (truncation)"""
    # Query "java" should match well with "javascript" by finding the best substring
    similarity = levenshtein_similarity("java", "javascript")
    assert similarity == 1.0  # "java" matches perfectly with first 4 chars of "javascript"
    
    # Query "script" should match well with "javascript" 
    similarity = levenshtein_similarity("script", "javascript")
    assert similarity == 1.0  # "script" matches perfectly with last 6 chars
    
    # Query "reac" should match well with "react-tutorial"
    similarity = levenshtein_similarity("reac", "react-tutorial")
    assert similarity >= 0.75  # Should match "reac" from "react"
    
    # Partial match with typo
    similarity = levenshtein_similarity("javs", "javascript")
    assert similarity >= 0.75  # "javs" vs "java" = 1 edit out of 4 chars


def test_levenshtein_similarity_longer_query():
    """Test that longer queries still work correctly"""
    # If query is longer than text, should use full comparison
    similarity = levenshtein_similarity("javascript", "java")
    assert 0.0 < similarity < 0.5  # Should have low similarity

