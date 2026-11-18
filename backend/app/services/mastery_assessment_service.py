"""
Mastery Assessment Service
Core Principle: "Conceptual score must be traceable to explicit assessment evidence."

Provides curated conceptual questions without answer leakage, evaluates student
MCQ submissions with exact matching (no LLMs), and stores verified conceptual scores.
"""

from typing import Optional, Dict, Tuple
from sqlalchemy.orm import Session
from app.data.mastery_questions import (
    get_question_by_topic,
    get_question_by_id,
    StoredMasteryQuestion,
)
from app.schemas.scholar import (
    MasteryAssessmentQuestion,
    MasteryAssessmentResult,
    MasteryEvidenceItem,
)
from app.models.scholar import MasteryAssessmentRecord

# Secondary in-memory read cache. The authoritative source of truth is
# the database-backed MasteryAssessmentRecord table.
_VERIFIED_ASSESSMENT_SCORES: Dict[Tuple[str, str], float] = {}

class MasteryAssessmentService:
    """
    Deterministic Assessment Evaluation Service with Database Persistence.
    Evaluates submissions against server-side answer keys and persists verified scores.
    """

    @classmethod
    def get_question(cls, topic: str) -> Optional[MasteryAssessmentQuestion]:
        """
        Retrieves a curated prototype assessment question for a topic.
        STRICT SECURITY: Excludes correct_answer and internal explanation to prevent leakage.
        """
        stored = get_question_by_topic(topic)
        if not stored:
            return None

        return MasteryAssessmentQuestion(
            question_id=stored.question_id,
            topic=stored.topic,
            question_text=stored.question_text,
            options=stored.options,
            difficulty=stored.difficulty,
        )

    @classmethod
    def evaluate_answer(
        cls,
        student_id: str,
        topic: str,
        question_id: str,
        answer: str,
        db: Optional[Session] = None,
    ) -> Optional[MasteryAssessmentResult]:
        """
        Deterministically evaluates student's submitted answer against stored answer key.
        Generates server-side score (100.0 if correct, 0.0 if incorrect) and persists
        the authoritative result to the database.
        """
        stored = get_question_by_id(question_id)
        if not stored:
            return None

        # Exact normalized comparison (e.g., "B" or "b" -> "B")
        clean_submitted = answer.strip().upper()
        # If student submitted "B) ...", extract the letter prefix
        if len(clean_submitted) > 1 and clean_submitted[1] in (")", ".", ":", " "):
            clean_submitted = clean_submitted[0]

        is_correct = (clean_submitted == stored.correct_answer.strip().upper())
        score = 100.0 if is_correct else 0.0

        # 1. Authoritative persistence: Write to database
        close_session = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            close_session = True
        try:
            record = MasteryAssessmentRecord(
                student_id=student_id,
                topic=topic,
                question_id=question_id,
                score=score,
                correct=is_correct,
                assessment_source="server_evaluated",
                attempt_answer=clean_submitted,
                verification_status="VERIFIED",
            )
            db.add(record)
            db.commit()
        except Exception:
            db.rollback()
        finally:
            if close_session:
                db.close()

        # 2. Update secondary cache
        _VERIFIED_ASSESSMENT_SCORES[(student_id, topic)] = score

        evidence = [
            MasteryEvidenceItem(
                metric="assessment_answer",
                observed_value=clean_submitted,
                requirement=f"expected_answer={stored.correct_answer}",
                status="PASS" if is_correct else "FAIL",
            )
        ]

        next_action = "PROCEED_TO_CODING_CHECK" if is_correct else "RETRY_CONCEPTUAL_REVIEW"

        return MasteryAssessmentResult(
            student_id=student_id,
            topic=topic,
            question_id=question_id,
            correct=is_correct,
            score=score,
            evidence=evidence,
            next_action=next_action,
        )

    @classmethod
    def get_verified_score(
        cls,
        student_id: str,
        topic: str,
        db: Optional[Session] = None,
    ) -> Optional[float]:
        """
        Retrieves the server-verified assessment score for a student and topic.
        Authoritative source is the database ledger. Falls back to cache.
        """
        # 1. Check database first (authoritative source of truth)
        close_session = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            close_session = True
        try:
            record = (
                db.query(MasteryAssessmentRecord)
                .filter(
                    MasteryAssessmentRecord.student_id == student_id,
                    MasteryAssessmentRecord.topic == topic,
                )
                .order_by(MasteryAssessmentRecord.created_at.desc())
                .first()
            )
            if record is not None:
                _VERIFIED_ASSESSMENT_SCORES[(student_id, topic)] = record.score
                return record.score
        except Exception:
            pass
        finally:
            if close_session:
                db.close()

        # 2. Fallback to cache if database has no record or errored
        return _VERIFIED_ASSESSMENT_SCORES.get((student_id, topic))

    @classmethod
    def clear_verified_scores(cls, db: Optional[Session] = None):
        """Testing utility to reset assessment score cache and persistent records."""
        _VERIFIED_ASSESSMENT_SCORES.clear()
        close_session = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            close_session = True
        try:
            db.query(MasteryAssessmentRecord).delete()
            db.commit()
        except Exception:
            db.rollback()
        finally:
            if close_session:
                db.close()
