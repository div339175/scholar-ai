"""
Scholar AI Deterministic Intent Classification Service
Core Product Thesis: "Student activity is not the same as student competence."
"Completion does not equal mastery."

This service deterministically classifies student conversational inputs into safe,
bounded Scholar intents. It uses normalized rule-based keyword matching.
DOES NOT use LLMs, embeddings, vector databases, or probabilistic neural approximations.
"""

import re
from typing import Optional, Tuple
from app.schemas.scholar import ScholarIntent

class ScholarIntentService:
    """
    Deterministic Intent Classifier for Scholar AI Conversational Interface.
    Maps user input to supported ScholarIntent enum values and extracts topic boundaries.
    """

    KNOWN_TOPICS = {
        "sliding window": "Sliding Window",
        "sliding-window": "Sliding Window",
        "dynamic programming": "Dynamic Programming",
        "dp": "Dynamic Programming",
        "recursion": "Recursion",
        "recursive": "Recursion",
        "backtracking": "Recursion",
        "graph traversal": "Graph Traversal",
        "graph": "Graph Traversal",
        "dfs": "Graph Traversal",
        "bfs": "Graph Traversal",
    }

    @classmethod
    def normalize_message(cls, message: str) -> str:
        """Normalizes input string by lowercasing, stripping punctuation, and compressing whitespace."""
        if not message:
            return ""
        lowered = message.lower().strip()
        # Replace non-alphanumeric (except hyphens) with spaces
        cleaned = re.sub(r"[^\w\s\-]", " ", lowered)
        return re.sub(r"\s+", " ", cleaned).strip()

    @classmethod
    def extract_topic(cls, normalized_text: str) -> Optional[str]:
        """Deterministically extracts a known prototype topic if present in the text."""
        # 1. Multi-word topic matches first
        if "sliding window" in normalized_text or "sliding-window" in normalized_text:
            return "Sliding Window"
        if "dynamic programming" in normalized_text:
            return "Dynamic Programming"
        if "graph traversal" in normalized_text:
            return "Graph Traversal"

        # 2. Tokenized matching for single-word / acronym topics
        tokens = normalized_text.split()
        if "dp" in tokens:
            return "Dynamic Programming"
        if "recursion" in tokens or "recursive" in tokens or "backtracking" in tokens:
            return "Recursion"
        if "graph" in tokens or "dfs" in tokens or "bfs" in tokens:
            return "Graph Traversal"

        return None

    @classmethod
    def classify_intent(cls, raw_message: str) -> Tuple[ScholarIntent, Optional[str]]:
        """
        Deterministically classifies raw user message into a ScholarIntent and optional topic.
        Precedence is strictly deterministic and auditable.
        """
        normalized = cls.normalize_message(raw_message)
        if not normalized:
            return ScholarIntent.UNKNOWN, None

        extracted_topic = cls.extract_topic(normalized)

        # 1. False Progress status
        if (
            "false progress" in normalized
            or "flag me" in normalized
            or "flagged" in normalized
            or "why did you flag" in normalized
            or "fpi" in normalized
        ):
            return ScholarIntent.FALSE_PROGRESS_STATUS, extracted_topic

        # 2. Intervention status
        if "remediation" in normalized or "intervention" in normalized:
            return ScholarIntent.INTERVENTION_STATUS, extracted_topic

        # 3. Topic Explanation
        if (
            "explain" in normalized
            or "teach me" in normalized
            or "teach" in normalized
            or "invariant" in normalized
            or (extracted_topic and (normalized.startswith("what is") or normalized.startswith("how does")))
        ):
            return ScholarIntent.EXPLAIN_TOPIC, extracted_topic

        # 4. Why this action
        if (
            "why are you asking" in normalized
            or "why this" in normalized
            or "why did you stop" in normalized
            or "why stop" in normalized
            or "why action" in normalized
            or "why is this" in normalized
            or "and why" in normalized
            or "why" in normalized.split()
        ):
            return ScholarIntent.WHY_THIS_ACTION, extracted_topic

        # 5. Mastery status
        if (
            "mastery" in normalized
            or "mastered" in normalized
            or "did i master" in normalized
            or "have i mastered" in normalized
        ):
            return ScholarIntent.MASTERY_STATUS, extracted_topic

        # 6. Readiness status
        if (
            "readiness" in normalized
            or "am i ready" in normalized
            or "are we ready" in normalized
            or "capability" in normalized
        ):
            return ScholarIntent.READINESS_STATUS, extracted_topic

        # 7. Roadmap status
        if "roadmap" in normalized or "where am i on" in normalized:
            return ScholarIntent.ROADMAP_STATUS, extracted_topic

        # 8. Next Action
        if (
            "next" in normalized
            or "what should i do" in normalized
            or "what to do" in normalized
            or "what should i practice" in normalized
            or "what do i do" in normalized
            or "what should we do" in normalized
        ):
            return ScholarIntent.NEXT_ACTION, extracted_topic

        return ScholarIntent.UNKNOWN, None
