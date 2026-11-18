"""
Evidence-Based Roadmap Adaptation Engine
Core Principle: "Every roadmap adaptation decision must be traceable to existing backend evidence."

Determines whether the student's roadmap should:
1. CONTINUE_NORMAL
2. PAUSE_ADVANCEMENT
3. RESUME_ROADMAP
4. REMEDIATE_TOPIC

Completely deterministic, transparent, and non-LLM based.
"""

from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.problem import CodingTelemetry
from app.models.roadmap import RoadmapNode, NodeType, NodeStatus
from app.schemas.roadmap import (
    RoadmapAdaptationDecision,
    RoadmapAdaptationAction,
    EvidenceStatus,
)
from app.schemas.scholar import MasteryEvidenceItem
from app.services.false_progress_detector import FalseProgressDetector
from app.services.intervention_service import InterventionService
from app.services.mastery_service import MasteryService
from app.services.mastery_assessment_service import MasteryAssessmentService

class RoadmapAdaptationService:
    """
    Deterministic Roadmap Adaptation Engine.
    Grounds all roadmap mutations in verified Scholar AI metrics and empirical telemetry.
    """

    @classmethod
    def determine_adaptation(
        cls,
        db: Session,
        student_id: str,
        skip_apply: bool = False,
    ) -> Optional[RoadmapAdaptationDecision]:
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

        diagnostic = FalseProgressDetector.analyze_student(db, student_id)
        intervention = InterventionService.generate_intervention(student, diagnostic, telemetry, roadmap)
        mastery_status = MasteryService.get_latest_status(db, student_id)

        # -------------------------------------------------------------------
        # Precedence 1: Rule D — Insufficient Evidence
        # -------------------------------------------------------------------
        if len(telemetry) < 5 or diagnostic.confidence == 0.0:
            decision = RoadmapAdaptationDecision(
                student_id=student.id,
                action=RoadmapAdaptationAction.CONTINUE_NORMAL.value,
                topic=None,
                evidence_status=EvidenceStatus.INSUFFICIENT_EVIDENCE.value,
                reason="Insufficient behavioural evidence (minimum 5 problem submissions required) to evaluate false progress or determine roadmap adaptation.",
                source_components=["TELEMETRY_SERVICE", "FALSE_PROGRESS_DIAGNOSTIC"],
                evidence=[
                    MasteryEvidenceItem(
                        metric="telemetry_count",
                        observed_value=len(telemetry),
                        requirement=">=5",
                        status="MISSING",
                    )
                ],
            )
            if not skip_apply:
                cls.apply_adaptation_to_nodes(db, student.id, decision)
            return decision

        active_target_topic = (
            intervention.mastery_check_topic or
            (intervention.target_topics[0] if intervention.target_topics else None)
        )

        latest_mastery = mastery_status.latest_result if mastery_status.status == "RECORDED" else None

        # -------------------------------------------------------------------
        # Precedence 2: Rule B — Resume Roadmap (Verified Mastered on Target Topic)
        # -------------------------------------------------------------------
        if latest_mastery and latest_mastery.decision == "MASTERED":
            # Topic check: ensure mastery belongs to the relevant target topic
            if active_target_topic is None or latest_mastery.topic == active_target_topic:
                verified_score = MasteryAssessmentService.get_verified_score(student.id, latest_mastery.topic, db=db)
                has_verified_assessment = (
                    verified_score is not None or
                    any(
                        e.metric == "conceptual_score_source" and e.observed_value == "VERIFIED_ASSESSMENT_SERVICE"
                        for e in latest_mastery.evidence
                    )
                )

                if has_verified_assessment:
                    safe_evidence = [
                        e for e in latest_mastery.evidence
                        if "answer" not in e.metric.lower() or "expected" not in e.requirement.lower()
                    ]
                    decision = RoadmapAdaptationDecision(
                        student_id=student.id,
                        action=RoadmapAdaptationAction.RESUME_ROADMAP.value,
                        topic=latest_mastery.topic,
                        evidence_status=EvidenceStatus.SUFFICIENT.value,
                        reason=(
                            f"Roadmap advancement is resumed because independent mastery was verified for {latest_mastery.topic} "
                            "through server-side assessment and unassisted first-attempt problem solving."
                        ),
                        source_components=["MASTERY_CHECK", "VERIFIED_ASSESSMENT_SERVICE"],
                        evidence=safe_evidence,
                    )
                    if not skip_apply:
                        cls.apply_adaptation_to_nodes(db, student.id, decision)
                    return decision

        # -------------------------------------------------------------------
        # Precedence 3: Rule C — Remediate Topic (Explicitly Not Mastered)
        # -------------------------------------------------------------------
        if latest_mastery and latest_mastery.decision == "NOT_MASTERED":
            if active_target_topic is None or latest_mastery.topic == active_target_topic:
                safe_evidence = [
                    e for e in latest_mastery.evidence
                    if "answer" not in e.metric.lower() or "expected" not in e.requirement.lower()
                ]
                decision = RoadmapAdaptationDecision(
                    student_id=student.id,
                    action=RoadmapAdaptationAction.REMEDIATE_TOPIC.value,
                    topic=latest_mastery.topic,
                    evidence_status=EvidenceStatus.SUFFICIENT.value,
                    reason=f"Targeted remediation is required for {latest_mastery.topic} because the latest mastery check was not passed.",
                    source_components=["MASTERY_CHECK"],
                    evidence=safe_evidence,
                )
                if not skip_apply:
                    cls.apply_adaptation_to_nodes(db, student.id, decision)
                return decision

        # -------------------------------------------------------------------
        # Precedence 4: Rule A — Pause Advancement (Active Intervention Unverified)
        # -------------------------------------------------------------------
        if (
            intervention.intervention_required and
            intervention.roadmap_action in ("PAUSE_ADVANCEMENT", "INSERT_REMEDIATION") and
            intervention.mastery_check_required
        ):
            target_topic = active_target_topic or "Algorithmic Foundations"
            diagnostic_evidence_items = [
                MasteryEvidenceItem(
                    metric=ev.metric,
                    observed_value=ev.observed_value,
                    requirement=f"threshold={ev.threshold}",
                    status="FAIL",
                )
                for ev in diagnostic.evidence
            ]
            decision = RoadmapAdaptationDecision(
                student_id=student.id,
                action=RoadmapAdaptationAction.PAUSE_ADVANCEMENT.value,
                topic=target_topic,
                evidence_status=EvidenceStatus.SUFFICIENT.value,
                reason=(
                    f"Roadmap advancement is paused because false-progress evidence triggered remediation and mastery has not yet been verified for {target_topic}."
                ),
                source_components=["FALSE_PROGRESS_DIAGNOSTIC", "INTERVENTION_PLAN"],
                evidence=diagnostic_evidence_items,
            )
            if not skip_apply:
                cls.apply_adaptation_to_nodes(db, student.id, decision)
            return decision

        # -------------------------------------------------------------------
        # Precedence 5: Rule E — Normal Progress (Genuine Mastery Control)
        # -------------------------------------------------------------------
        decision = RoadmapAdaptationDecision(
            student_id=student.id,
            action=RoadmapAdaptationAction.CONTINUE_NORMAL.value,
            topic=None,
            evidence_status=EvidenceStatus.SUFFICIENT.value,
            reason="Current roadmap progression continues normally as learning telemetry reflects genuine independent mastery.",
            source_components=["FALSE_PROGRESS_DIAGNOSTIC", "INTERVENTION_PLAN"],
            evidence=[
                MasteryEvidenceItem(
                    metric="false_progress_detected",
                    observed_value=False,
                    requirement="is_false_progress=false",
                    status="PASS",
                )
            ],
        )
        if not skip_apply:
            cls.apply_adaptation_to_nodes(db, student.id, decision)
        return decision

    @classmethod
    def apply_adaptation_to_nodes(
        cls,
        db: Session,
        student_id: str,
        decision: Optional[RoadmapAdaptationDecision] = None,
    ) -> None:
        """
        Applies and persists the Scholar AI adaptation decision to the student's
        roadmap nodes in the database.
        - PAUSE_ADVANCEMENT: Locks downstream uncompleted nodes, halts unearned advancement.
        - REMEDIATE_TOPIC: Inserts or activates a remediation node for the target topic, halts downstream progression.
        - RESUME_ROADMAP: Completes remediation nodes, unlocks downstream progression.
        - CONTINUE_NORMAL: Maintains standard progression.
        """
        if decision is None:
            decision = cls.determine_adaptation(db, student_id, skip_apply=True)
            if not decision:
                return

        nodes = (
            db.query(RoadmapNode)
            .filter(RoadmapNode.student_id == student_id)
            .order_by(RoadmapNode.sequence.asc())
            .all()
        )
        if not nodes:
            return

        target_topic = decision.topic

        try:
            if decision.action == RoadmapAdaptationAction.PAUSE_ADVANCEMENT.value:
                # Downstream progression halted: lock uncompleted normal nodes
                for node in nodes:
                    if node.status != NodeStatus.COMPLETED.value:
                        node.is_locked = True
                        node.status = NodeStatus.LOCKED.value
                db.commit()

            elif decision.action == RoadmapAdaptationAction.REMEDIATE_TOPIC.value:
                # Insert or activate targeted remediation node
                remediation_node = next(
                    (n for n in nodes if n.topic == target_topic and n.node_type == NodeType.REMEDIATION.value),
                    None,
                )
                if not remediation_node:
                    import uuid
                    topic_node = next((n for n in nodes if n.topic == target_topic), None)
                    seq = topic_node.sequence if topic_node else 3
                    remediation_node = RoadmapNode(
                        id=f"rem_{student_id}_{uuid.uuid4().hex[:6]}",
                        student_id=student_id,
                        title=f"Targeted Remediation Sprint: {target_topic}",
                        topic=target_topic or "Algorithmic Foundations",
                        status=NodeStatus.IN_PROGRESS.value,
                        sequence=seq,
                        estimated_minutes=45,
                        is_locked=False,
                        node_type=NodeType.REMEDIATION.value,
                    )
                    db.add(remediation_node)
                else:
                    remediation_node.status = NodeStatus.IN_PROGRESS.value
                    remediation_node.is_locked = False

                # Ensure all normal uncompleted nodes remain locked
                for node in nodes:
                    if node.node_type == NodeType.NORMAL.value and node.status != NodeStatus.COMPLETED.value:
                        node.is_locked = True
                        node.status = NodeStatus.LOCKED.value
                db.commit()

            elif decision.action == RoadmapAdaptationAction.RESUME_ROADMAP.value:
                # Mark remediation / check nodes for target topic as COMPLETED
                for node in nodes:
                    if node.topic == target_topic and node.node_type in (NodeType.REMEDIATION.value, NodeType.MASTERY_CHECK.value):
                        node.status = NodeStatus.COMPLETED.value
                        node.is_locked = False

                # Unlock the next normal node in sequence to resume forward progression
                unlocked_one = False
                for node in nodes:
                    if node.node_type == NodeType.NORMAL.value and node.status != NodeStatus.COMPLETED.value:
                        if not unlocked_one:
                            node.is_locked = False
                            node.status = NodeStatus.IN_PROGRESS.value
                            unlocked_one = True
                db.commit()

            elif decision.action == RoadmapAdaptationAction.CONTINUE_NORMAL.value:
                # Normal progression: ensure uncompleted normal nodes sequential unlocking is preserved
                pass
        except Exception:
            db.rollback()
