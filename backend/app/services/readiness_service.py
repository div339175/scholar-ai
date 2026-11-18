from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid
from typing import Dict, Any, Optional, List
from app.models.student import Student, ReadinessSnapshot
from app.models.problem import CodingTelemetry
from app.models.roadmap import RoadmapNode
from app.models.scholar import ScholarIntervention, MasteryCheck
from app.schemas.student import (
    ReadinessStatus,
    ReadinessEvidenceItem,
    VerifiedCapabilityResponse,
)
from app.schemas.scholar import MasteryDecision
from app.services.false_progress_detector import FalseProgressDetector
from app.services.intervention_service import InterventionService
from app.services.mastery_service import MasteryService
from app.services.mastery_assessment_service import MasteryAssessmentService

class ReadinessService:
    """
    Computes Standard Readiness Score vs Verified Capability Score (VCS).
    
    Standard Readiness:
      Weighted combination of roadmap completion, problems solved, project milestones,
      and consistency streak.
      
    Verified Capability Score (VCS):
      Standard Readiness * Mastery Confidence Multiplier
      Grounded in server-evaluated conceptual assessments, independent problem solving,
      and false progress diagnostics.
    """

    @staticmethod
    def calculate_mastery_multiplier(db: Session, student_id: str) -> float:
        """
        Baseline telemetry-based mastery multiplier for Step 1 backwards-compatibility.
        Evaluates unassisted pass ratio and hint crutch factor.
        """
        events = db.query(CodingTelemetry).filter(CodingTelemetry.student_id == student_id).all()
        if not events:
            return 1.0

        total = len(events)
        first_attempt_passes = sum(1 for e in events if e.first_attempt_pass)
        total_hints = sum(e.hints_requested for e in events)

        # Baseline ratios
        pass_ratio = first_attempt_passes / total
        avg_hints_per_problem = total_hints / total

        raw_multiplier = (pass_ratio * 0.7) + (max(0.0, 1.0 - (avg_hints_per_problem / 3.0)) * 0.3)
        return round(max(0.35, min(1.0, raw_multiplier)), 3)

    @staticmethod
    def compute_standard_readiness(student: Student, problems_solved: int, project_score: float = 75.0) -> float:
        """
        Calculates Standard Readiness based on typical educational platform metrics:
        - Roadmap completion (40%)
        - Problems solved (30%, target 50 problems)
        - Consistency streak (15%, target 14 days)
        - Project milestones (15%)
        """
        norm_roadmap = min(max(student.roadmap_completion, 0.0), 100.0)
        norm_problems = min(problems_solved / 50.0, 1.0) * 100.0
        norm_streak = min(student.current_streak / 14.0, 1.0) * 100.0
        norm_project = min(max(project_score, 0.0), 100.0)

        standard_score = (
            (norm_roadmap * 0.40) +
            (norm_problems * 0.30) +
            (norm_streak * 0.15) +
            (norm_project * 0.15)
        )
        return round(standard_score, 1)

    @classmethod
    def get_or_create_readiness(cls, db: Session, student_id: str) -> Dict[str, Any]:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None

        # Count problems solved
        events = db.query(CodingTelemetry).filter(CodingTelemetry.student_id == student_id).all()
        problems_solved = len(events)

        standard_readiness = cls.compute_standard_readiness(student, problems_solved)
        mastery_multiplier = cls.calculate_mastery_multiplier(db, student_id)
        vcs = round(standard_readiness * mastery_multiplier, 1)

        # Record snapshot in database
        snapshot = ReadinessSnapshot(
            id=f"snap_{uuid.uuid4().hex[:12]}",
            student_id=student_id,
            standard_readiness=standard_readiness,
            mastery_multiplier=mastery_multiplier,
            verified_capability_score=vcs,
            created_at=datetime.now(timezone.utc),
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)

        return {
            "student_id": student.id,
            "standard_readiness": standard_readiness,
            "mastery_multiplier": mastery_multiplier,
            "verified_capability_score": vcs,
            "breakdown": {
                "roadmap_completion_pct": student.roadmap_completion,
                "problems_solved": problems_solved,
                "current_streak_days": student.current_streak,
                "hint_dependency_factor": mastery_multiplier,
            },
            "created_at": snapshot.created_at,
        }

    @classmethod
    def evaluate_verified_capability(cls, db: Session, student_id: str) -> Optional[VerifiedCapabilityResponse]:
        """
        Step 7 Evidence-Based Verified Capability Engine:
        Evaluates verified capability strictly from stored telemetry, diagnostics,
        interventions, and server-side verified mastery assessments.
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None

        limitations = [
            "Verified Capability is an evidence-backed prototype metric, not a guarantee of real-world job performance.",
            "Readiness calculations are derived strictly from recorded coding telemetry and server-verified diagnostic checks.",
            "Absence of false-progress detection does not imply mastery of unassessed topics.",
            "Conceptual mastery scores must be verified through the server-side assessment service rather than self-reported.",
        ]

        events = db.query(CodingTelemetry).filter(CodingTelemetry.student_id == student_id).all()
        total_events = len(events)
        standard_readiness = cls.compute_standard_readiness(student, total_events)

        # 1. Sparse Data Handling (< 5 problems)
        if total_events < 5:
            evidence_items = [
                ReadinessEvidenceItem(
                    metric="telemetry_count",
                    observed_value=total_events,
                    requirement=">=5",
                    status="INSUFFICIENT",
                ),
                ReadinessEvidenceItem(
                    metric="standard_readiness_score",
                    observed_value=standard_readiness,
                    requirement="Baseline activity score",
                    status="PASS",
                ),
            ]
            return VerifiedCapabilityResponse(
                student_id=student_id,
                standard_readiness_score=standard_readiness,
                verified_capability_score=round(standard_readiness * 0.5, 1),
                mastery_coverage=0.0,
                mastery_confidence_multiplier=0.5,
                readiness_status=ReadinessStatus.INSUFFICIENT_EVIDENCE.value,
                evidence_status="INSUFFICIENT_EVIDENCE",
                verified_topics=[],
                unverified_topics=[],
                false_progress_detected=False,
                evidence=evidence_items,
                limitations=limitations,
            )

        # 2. Diagnostic & False Progress State
        diagnostic = FalseProgressDetector.analyze_student(db, student_id)
        false_progress_detected = diagnostic.is_false_progress

        # 3. Target Topics Requiring Mastery Verification
        roadmap = (
            db.query(RoadmapNode)
            .filter(RoadmapNode.student_id == student_id)
            .order_by(RoadmapNode.sequence.asc())
            .all()
        )
        intervention = InterventionService.generate_intervention(student, diagnostic, events, roadmap)

        active_target_topic = (
            intervention.mastery_check_topic
            or (intervention.target_topics[0] if intervention.target_topics else None)
        )

        if active_target_topic:
            required_topics = [active_target_topic]
        elif false_progress_detected:
            required_topics = [diagnostic.affected_topics[0]] if diagnostic.affected_topics else ["General Algorithmic Foundations"]
        else:
            required_topics = []

        # 4. Verified vs Unverified Topics Evaluation
        verified_topics: List[str] = []
        unverified_topics: List[str] = []

        latest_status = MasteryService.get_latest_status(db, student_id)
        latest_result = latest_status.latest_result if latest_status.status == "RECORDED" else None

        for topic in required_topics:
            is_topic_verified = False

            # Check latest check if topic matches
            if latest_result and latest_result.topic == topic:
                is_mastered = (latest_result.decision == MasteryDecision.MASTERED.value or latest_result.passed is True)
                is_independent = (latest_result.independent is True)
                verified_score = MasteryAssessmentService.get_verified_score(student_id, topic, db=db)
                has_server_source = (
                    (verified_score is not None and verified_score >= 80.0)
                    or any(
                        e.metric == "conceptual_score_source" and e.observed_value == "server_evaluated"
                        for e in latest_result.evidence
                    )
                )
                if is_mastered and is_independent and has_server_source:
                    is_topic_verified = True
            else:
                # Check DB record for this topic
                db_check = (
                    db.query(MasteryCheck)
                    .join(ScholarIntervention)
                    .filter(
                        ScholarIntervention.student_id == student_id,
                        ScholarIntervention.topic == topic,
                        MasteryCheck.passed.isnot(None),
                    )
                    .order_by(MasteryCheck.id.desc())
                    .first()
                )
                if db_check and db_check.passed is True:
                    verified_score = MasteryAssessmentService.get_verified_score(student_id, topic, db=db)
                    if verified_score is not None and verified_score >= 80.0:
                        is_topic_verified = True

            if is_topic_verified:
                verified_topics.append(topic)
            else:
                unverified_topics.append(topic)

        # 5. Mastery Coverage & Confidence Multiplier Calculation
        if len(required_topics) == 0:
            if false_progress_detected:
                mastery_coverage = 0.0
                unverified_topics.append("General Learning Progression")
            else:
                mastery_coverage = 1.0
        else:
            mastery_coverage = round(len(verified_topics) / len(required_topics), 3)

        mastery_confidence_multiplier = round(0.5 + (0.5 * mastery_coverage), 3)
        verified_capability_score = round(standard_readiness * mastery_confidence_multiplier, 1)

        # 6. Determine Readiness Status
        if false_progress_detected and len(unverified_topics) > 0:
            readiness_status = ReadinessStatus.NOT_VERIFIED.value
        elif len(unverified_topics) > 0 or verified_capability_score < 80.0:
            readiness_status = ReadinessStatus.PARTIALLY_VERIFIED.value
        else:
            readiness_status = ReadinessStatus.VERIFIED_READY.value

        evidence_status = "SUFFICIENT"

        # 7. Structured Evidence Items
        evidence_items = [
            ReadinessEvidenceItem(
                metric="standard_readiness_score",
                observed_value=standard_readiness,
                requirement="Baseline activity score",
                status="PASS",
            ),
            ReadinessEvidenceItem(
                metric="false_progress_detected",
                observed_value=false_progress_detected,
                requirement="false",
                status="FAIL" if false_progress_detected else "PASS",
            ),
            ReadinessEvidenceItem(
                metric="mastery_coverage",
                observed_value=mastery_coverage,
                requirement="1.0" if required_topics else "N/A",
                status="PASS" if mastery_coverage >= 1.0 else ("FAIL" if required_topics else "PASS"),
            ),
            ReadinessEvidenceItem(
                metric="mastery_confidence_multiplier",
                observed_value=mastery_confidence_multiplier,
                requirement=">=0.80",
                status="PASS" if mastery_confidence_multiplier >= 0.80 else "FAIL",
            ),
        ]

        for t in verified_topics:
            evidence_items.append(
                ReadinessEvidenceItem(
                    metric="verified_mastery_topic",
                    observed_value=t,
                    requirement="MASTERED + server_evaluated + independent",
                    status="PASS",
                )
            )

        for t in unverified_topics:
            evidence_items.append(
                ReadinessEvidenceItem(
                    metric="unverified_mastery_topic",
                    observed_value=t,
                    requirement="MASTERED + server_evaluated + independent",
                    status="FAIL",
                )
            )

        return VerifiedCapabilityResponse(
            student_id=student_id,
            standard_readiness_score=standard_readiness,
            verified_capability_score=verified_capability_score,
            mastery_coverage=mastery_coverage,
            mastery_confidence_multiplier=mastery_confidence_multiplier,
            readiness_status=readiness_status,
            evidence_status=evidence_status,
            verified_topics=verified_topics,
            unverified_topics=unverified_topics,
            false_progress_detected=false_progress_detected,
            evidence=evidence_items,
            limitations=limitations,
        )

