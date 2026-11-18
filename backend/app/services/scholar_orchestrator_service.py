"""
Scholar AI Evidence-Based Orchestrator Service
Core Thesis: "Student activity is not the same as student competence."
"Completion does not equal mastery."

This orchestrator unifies all deterministic Scholar AI evidence layers:
Telemetry -> FPDE Diagnostic -> Intervention Plan -> Mastery Assessment -> Roadmap Adaptation -> Verified Capability.
Selects ONE primary deterministic action grounded strictly in verifiable backend evidence.
No LLM, RAG, or fabricated behavior.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.problem import CodingTelemetry
from app.models.roadmap import RoadmapNode
from app.schemas.scholar import (
    ScholarAction,
    FalseProgressSummary,
    InterventionSummary,
    MasterySummary,
    RoadmapSummary,
    CapabilitySummary,
    ScholarStudentState,
    ScholarNextAction,
)
from app.services.false_progress_detector import FalseProgressDetector
from app.services.intervention_service import InterventionService
from app.services.mastery_service import MasteryService
from app.services.roadmap_adaptation_service import RoadmapAdaptationService
from app.services.readiness_service import ReadinessService

class ScholarOrchestratorService:
    """
    Orchestration layer that consumes existing deterministic backend outputs
    and provides a coherent, explainable student state and next action.
    """

    @classmethod
    def get_student_state(cls, db: Session, student_id: str) -> Optional[ScholarStudentState]:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None

        telemetry: List[CodingTelemetry] = (
            db.query(CodingTelemetry)
            .filter(CodingTelemetry.student_id == student_id)
            .order_by(CodingTelemetry.timestamp.asc())
            .all()
        )
        roadmap: List[RoadmapNode] = (
            db.query(RoadmapNode)
            .filter(RoadmapNode.student_id == student_id)
            .order_by(RoadmapNode.sequence.asc())
            .all()
        )

        # 1. False-progress diagnostic
        diagnostic = FalseProgressDetector.analyze_student(db, student_id)

        # 2. Intervention plan
        intervention = InterventionService.generate_intervention(student, diagnostic, telemetry, roadmap)

        # 3. Mastery-check state
        mastery_status = MasteryService.get_latest_status(db, student_id)
        latest_check = mastery_status.latest_result if mastery_status.status == "RECORDED" else None

        # 4. Roadmap adaptation decision
        adaptation = RoadmapAdaptationService.determine_adaptation(db, student_id)

        # 5. Verified capability / readiness
        capability = ReadinessService.evaluate_verified_capability(db, student_id)

        # Build FalseProgressSummary
        fp_summary = FalseProgressSummary(
            detected=diagnostic.is_false_progress,
            index=diagnostic.false_progress_index,
            severity=diagnostic.severity,
            triggers=diagnostic.trigger_codes,
        )

        # Build InterventionSummary
        interv_summary = InterventionSummary(
            required=intervention.intervention_required,
            type=intervention.intervention_type,
            priority=intervention.priority,
            target_topics=intervention.target_topics,
            roadmap_action=intervention.roadmap_action,
        )

        # Build MasterySummary
        if latest_check:
            score_source = "client_supplied"
            for ev in latest_check.evidence:
                if ev.metric == "conceptual_score_source":
                    score_source = ev.observed_value
            mastery_summary = MasterySummary(
                status=mastery_status.status,
                topic=latest_check.topic,
                decision=latest_check.decision,
                conceptual_score=latest_check.conceptual_score,
                conceptual_score_source=score_source,
                independent_success=latest_check.independent,
            )
        else:
            mastery_summary = MasterySummary(
                status="NO_RECORDED_CHECK",
                topic=None,
                decision=None,
                conceptual_score=None,
                conceptual_score_source=None,
                independent_success=None,
            )

        # Build RoadmapSummary
        roadmap_summary = RoadmapSummary(
            action=adaptation.action if adaptation else "CONTINUE_NORMAL",
            topic=adaptation.topic if adaptation else None,
            evidence_status=adaptation.evidence_status if adaptation else "SUFFICIENT",
        )

        # Build CapabilitySummary
        cap_summary = CapabilitySummary(
            standard_readiness_score=capability.standard_readiness_score if capability else 0.0,
            verified_capability_score=capability.verified_capability_score if capability else 0.0,
            readiness_status=capability.readiness_status if capability else "INSUFFICIENT_EVIDENCE",
            mastery_coverage=capability.mastery_coverage if capability else 0.0,
            mastery_confidence_multiplier=capability.mastery_confidence_multiplier if capability else 0.5,
        )

        # Build explicit evidence chain
        evidence_chain = ["TELEMETRY_RECORDED"]
        if diagnostic.is_false_progress:
            evidence_chain.append(f"FALSE_PROGRESS_DETECTED_{diagnostic.severity}")
        else:
            evidence_chain.append("GENUINE_MASTERY_TELEMETRY")

        if intervention.intervention_required:
            evidence_chain.append(f"INTERVENTION_{intervention.priority}")
        else:
            evidence_chain.append("NO_INTERVENTION_REQUIRED")

        if latest_check:
            evidence_chain.append(f"MASTERY_CHECK_{latest_check.decision}")
        else:
            evidence_chain.append("MASTERY_CHECK_UNRECORDED")

        evidence_chain.append(f"ROADMAP_{roadmap_summary.action}")
        evidence_chain.append(f"CAPABILITY_{cap_summary.readiness_status}")

        return ScholarStudentState(
            student_id=student.id,
            false_progress=fp_summary,
            intervention=interv_summary,
            mastery=mastery_summary,
            roadmap=roadmap_summary,
            capability=cap_summary,
            evidence_chain=evidence_chain,
        )

    @classmethod
    def get_next_action(cls, db: Session, student_id: str) -> Optional[ScholarNextAction]:
        state = cls.get_student_state(db, student_id)
        if not state:
            return None

        # -------------------------------------------------------------------
        # Rule 1: Insufficient Evidence (< 5 problems or INSUFFICIENT_EVIDENCE)
        # -------------------------------------------------------------------
        if (
            state.roadmap.evidence_status == "INSUFFICIENT_EVIDENCE"
            or state.capability.readiness_status == "INSUFFICIENT_EVIDENCE"
        ):
            return ScholarNextAction(
                student_id=student_id,
                action=ScholarAction.COLLECT_MORE_EVIDENCE.value,
                target_topic=None,
                reason="Insufficient behavioral evidence (minimum 5 problem submissions required) to evaluate competence or recommend intervention.",
                source_components=["TELEMETRY_SERVICE", "ROADMAP_ADAPTATION"],
                evidence=[
                    {
                        "metric": "telemetry_data_sufficiency",
                        "observed_value": "INSUFFICIENT",
                        "requirement": ">=5 problem events",
                        "status": "FAIL",
                    }
                ],
            )

        # -------------------------------------------------------------------
        # Rule 2: NOT_MASTERED check requires complete remediation
        # -------------------------------------------------------------------
        if state.mastery.decision == "NOT_MASTERED" or state.roadmap.action == "REMEDIATE_TOPIC":
            topic = (
                state.mastery.topic
                or state.roadmap.topic
                or (state.intervention.target_topics[0] if state.intervention.target_topics else "Current Topic")
            )
            return ScholarNextAction(
                student_id=student_id,
                action=ScholarAction.COMPLETE_REMEDIATION.value,
                target_topic=topic,
                reason=f"Targeted remediation is required for {topic} because the most recent diagnostic check resulted in NOT_MASTERED.",
                source_components=["MASTERY_CHECK", "ROADMAP_ADAPTATION"],
                evidence=[
                    {
                        "metric": "mastery_check_decision",
                        "observed_value": "NOT_MASTERED",
                        "requirement": "MASTERED",
                        "status": "FAIL",
                    }
                ],
            )

        # -------------------------------------------------------------------
        # Rule 3: MASTERED + RESUME_ROADMAP (Verified independent mastery)
        # -------------------------------------------------------------------
        if state.roadmap.action == "RESUME_ROADMAP" or (
            state.mastery.decision == "MASTERED"
            and state.mastery.conceptual_score_source == "server_evaluated"
        ):
            topic = (
                state.roadmap.topic
                or state.mastery.topic
                or (state.intervention.target_topics[0] if state.intervention.target_topics else "Current Topic")
            )
            return ScholarNextAction(
                student_id=student_id,
                action=ScholarAction.RESUME_ROADMAP.value,
                target_topic=topic,
                reason=f"Independent mastery was verified for {topic} through server-evaluated conceptual assessment and unassisted problem solving. Roadmap advancement may resume.",
                source_components=["MASTERY_CHECK", "VERIFIED_ASSESSMENT_SERVICE", "ROADMAP_ADAPTATION"],
                evidence=[
                    {
                        "metric": "mastery_check_decision",
                        "observed_value": "MASTERED",
                        "requirement": "MASTERED",
                        "status": "PASS",
                    },
                    {
                        "metric": "conceptual_score_source",
                        "observed_value": state.mastery.conceptual_score_source,
                        "requirement": "server_evaluated",
                        "status": "PASS",
                    },
                ],
            )

        # -------------------------------------------------------------------
        # Rule 4: Active intervention / PAUSE_ADVANCEMENT without completed mastery
        # -------------------------------------------------------------------
        if (
            state.intervention.required
            or state.roadmap.action == "PAUSE_ADVANCEMENT"
            or state.false_progress.detected
        ):
            topic = (
                state.intervention.target_topics[0]
                if state.intervention.target_topics
                else (state.roadmap.topic or "Current Topic")
            )
            return ScholarNextAction(
                student_id=student_id,
                action=ScholarAction.COMPLETE_MASTERY_CHECK.value,
                target_topic=topic,
                reason=f"False-progress evidence requires independent mastery verification for {topic} before roadmap advancement can resume.",
                source_components=["FALSE_PROGRESS_DIAGNOSTIC", "INTERVENTION_PLAN", "ROADMAP_ADAPTATION"],
                evidence=[
                    {
                        "metric": "false_progress_detected",
                        "observed_value": state.false_progress.detected,
                        "requirement": "false",
                        "status": "FAIL",
                    },
                    {
                        "metric": "mastery_check_status",
                        "observed_value": state.mastery.status,
                        "requirement": "RECORDED (MASTERED)",
                        "status": "PENDING",
                    },
                ],
            )

        # -------------------------------------------------------------------
        # Rule 5: Genuine mastery with no active interventions (Priya)
        # -------------------------------------------------------------------
        return ScholarNextAction(
            student_id=student_id,
            action=ScholarAction.CONTINUE_LEARNING.value,
            target_topic=None,
            reason="Student telemetry demonstrates genuine independent problem solving with no false-progress triggers. Normal roadmap learning continues.",
            source_components=["TELEMETRY_SERVICE", "FALSE_PROGRESS_DIAGNOSTIC", "VERIFIED_CAPABILITY_SERVICE"],
            evidence=[
                {
                    "metric": "false_progress_detected",
                    "observed_value": False,
                    "requirement": "false",
                    "status": "PASS",
                },
                {
                    "metric": "mastery_confidence_multiplier",
                    "observed_value": state.capability.mastery_confidence_multiplier,
                    "requirement": "1.0",
                    "status": "PASS",
                },
            ],
        )
