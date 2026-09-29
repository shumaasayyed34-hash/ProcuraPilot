"""
OCR Accuracy Evaluation Metrics (Phase 1 Task 4)
Provides standard OCR accuracy metrics: Character Accuracy Rate (CAR),
Word Accuracy Rate (WAR), and Levenshtein Distance similarity score.
"""

from typing import Dict, List, Any


def levenshtein_distance(str1: str, str2: str) -> int:
    """Computes standard edit/Levenshtein distance between two strings."""
    m, n = len(str1), len(str2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if str1[i - 1] == str2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # Deletion
                    dp[i][j - 1],      # Insertion
                    dp[i - 1][j - 1],  # Substitution
                )

    return dp[m][n]


def calculate_character_accuracy_rate(expected: str, actual: str) -> float:
    """Calculates Character Accuracy Rate (CAR) percentage.
    
    Formula: max(0.0, (1 - edit_distance / max(len(expected), 1))) * 100
    """
    if not expected and not actual:
        return 100.0
    if not expected:
        return 0.0

    dist = levenshtein_distance(expected, actual)
    max_len = max(len(expected), 1)
    acc = max(0.0, 1.0 - (dist / max_len))
    return round(acc * 100.0, 2)


def calculate_word_accuracy_rate(expected: str, actual: str) -> float:
    """Calculates Word Accuracy Rate (WAR) percentage.
    
    Splits both strings into tokens/words and computes word edit distance accuracy.
    """
    words_expected = expected.strip().split()
    words_actual = actual.strip().split()

    if not words_expected and not words_actual:
        return 100.0
    if not words_expected:
        return 0.0

    # Token-level Levenshtein distance
    m, n = len(words_expected), len(words_actual)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if words_expected[i - 1] == words_actual[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],
                    dp[i][j - 1],
                    dp[i - 1][j - 1],
                )

    dist = dp[m][n]
    acc = max(0.0, 1.0 - (dist / max(m, 1)))
    return round(acc * 100.0, 2)


def evaluate_ocr_accuracy(expected_text: str, ocr_text: str, engine_name: str = "OCR") -> Dict[str, Any]:
    """Generates a comprehensive OCR accuracy report comparing OCR text with ground truth text.
    
    Returns:
        Dict containing car_percentage, war_percentage, edit_distance, expected_len, ocr_len
    """
    car = calculate_character_accuracy_rate(expected_text, ocr_text)
    war = calculate_word_accuracy_rate(expected_text, ocr_text)
    edit_dist = levenshtein_distance(expected_text, ocr_text)

    return {
        "engine": engine_name,
        "car_percentage": car,
        "war_percentage": war,
        "levenshtein_distance": edit_dist,
        "expected_character_count": len(expected_text),
        "ocr_character_count": len(ocr_text),
        "expected_word_count": len(expected_text.strip().split()),
        "ocr_word_count": len(ocr_text.strip().split()),
    }
