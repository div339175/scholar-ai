"""
Scholar AI Evidence-Grounded Knowledge Service
Deterministic conceptual knowledge retrieval.

IMPORTANT ARCHITECTURAL RULES:
1. No embeddings, vector databases, or semantic vector search.
2. No LLM ranking or fuzzy AI heuristics.
3. Completely deterministic query matching (exact topic, tag, and normalized keyword).
4. Strictly isolated from the mastery assessment bank (never exposes question answer keys).
"""

from typing import List, Optional, Dict, Any
import re

from app.data.scholar_knowledge import SCHOLAR_KNOWLEDGE_BANK, StoredKnowledgeItem
from app.schemas.scholar import (
    ScholarKnowledgeItem,
    ScholarKnowledgeRetrieval,
    ScholarGroundedContext,
)

class ScholarKnowledgeService:
    """
    Deterministic Knowledge Retrieval Service for Scholar AI.
    Provides curated conceptual foundations for student interventions and actions.
    """

    @classmethod
    def get_by_id(cls, knowledge_id: str) -> Optional[ScholarKnowledgeItem]:
        """Look up a single knowledge item by unique knowledge_id."""
        for item in SCHOLAR_KNOWLEDGE_BANK:
            if item.knowledge_id == knowledge_id:
                return ScholarKnowledgeItem(
                    knowledge_id=item.knowledge_id,
                    topic=item.topic,
                    title=item.title,
                    content=item.content,
                    difficulty=item.difficulty,
                    source_type=item.source_type,
                    tags=item.tags,
                )
        return None

    @classmethod
    def get_by_topic(cls, topic: str) -> List[ScholarKnowledgeRetrieval]:
        """
        Deterministic topic-level retrieval.
        Matches exact topic case-insensitively and returns items sorted by knowledge_id.
        """
        results: List[ScholarKnowledgeRetrieval] = []
        target = topic.strip().lower()

        for item in SCHOLAR_KNOWLEDGE_BANK:
            if item.topic.lower() == target:
                results.append(
                    ScholarKnowledgeRetrieval(
                        knowledge_id=item.knowledge_id,
                        topic=item.topic,
                        title=item.title,
                        content=item.content,
                        difficulty=item.difficulty,
                        source_type=item.source_type,
                        tags=item.tags,
                        retrieval_reason="topic_match",
                    )
                )

        # Strictly deterministic order by knowledge_id
        results.sort(key=lambda x: x.knowledge_id)
        return results

    @classmethod
    def search(cls, topic: Optional[str] = None, query: str = "") -> List[ScholarKnowledgeRetrieval]:
        """
        Deterministic keyword and tag search.
        Matches exact tags, title keywords, and content keywords.
        Never uses embeddings or fuzzy neural approximations.
        """
        tokens = [w.strip().lower() for w in re.split(r"\W+", query) if len(w.strip()) > 1]
        results: List[Dict[str, Any]] = []

        pool = SCHOLAR_KNOWLEDGE_BANK
        if topic:
            pool = [item for item in pool if item.topic.lower() == topic.strip().lower()]

        for item in pool:
            item_tags_lower = [t.lower() for t in item.tags]
            title_lower = item.title.lower()
            content_lower = item.content.lower()

            matched_reason: Optional[str] = None
            priority = 99

            if not tokens:
                # If query is empty, match everything in pool with topic_match
                matched_reason = "topic_match" if topic else "all_match"
                priority = 4
            else:
                for token in tokens:
                    # Tag match takes precedence
                    if any(token in tag for tag in item_tags_lower):
                        matched_reason = "tag_match"
                        priority = 1
                        break
                    # Title match
                    elif token in title_lower:
                        matched_reason = "title_keyword_match"
                        priority = 2
                        break
                    # Content match
                    elif token in content_lower:
                        matched_reason = "content_keyword_match"
                        priority = 3
                        break

            if matched_reason:
                retrieval = ScholarKnowledgeRetrieval(
                    knowledge_id=item.knowledge_id,
                    topic=item.topic,
                    title=item.title,
                    content=item.content,
                    difficulty=item.difficulty,
                    source_type=item.source_type,
                    tags=item.tags,
                    retrieval_reason=matched_reason,
                )
                results.append({"priority": priority, "item": retrieval})

        # Deterministic sort: by match priority first, then alphabetically by knowledge_id
        results.sort(key=lambda x: (x["priority"], x["item"].knowledge_id))
        return [r["item"] for r in results]

    @classmethod
    def get_context_for_action(
        cls,
        student_id: str,
        action: str,
        target_topic: Optional[str],
    ) -> ScholarGroundedContext:
        """
        Connects deterministic ScholarAction and target topic to curated conceptual knowledge.
        If the action requires no conceptual guidance or has no target topic, returns empty knowledge list.
        """
        evidence_sources = [
            "SCHOLAR_STUDENT_STATE",
            "SCHOLAR_NEXT_ACTION",
            "CURATED_PROTOTYPE_KNOWLEDGE",
        ]

        # Actions that require grounded conceptual guidance
        if target_topic and action in (
            "COMPLETE_MASTERY_CHECK",
            "COMPLETE_REMEDIATION",
            "REVIEW_CONCEPT",
            "RESUME_ROADMAP",
            "CONTINUE_LEARNING",
        ):
            knowledge_items = cls.get_by_topic(target_topic)
        else:
            # If no target topic (e.g., Priya CONTINUE_LEARNING or COLLECT_MORE_EVIDENCE), do not invent
            knowledge_items = []

        return ScholarGroundedContext(
            student_id=student_id,
            action=action,
            target_topic=target_topic if knowledge_items else target_topic,
            knowledge=knowledge_items,
            evidence_sources=evidence_sources,
        )
