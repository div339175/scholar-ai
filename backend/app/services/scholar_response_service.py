"""
Scholar AI Evidence-Grounded Response Generator
Core Thesis: "Student activity is not the same as student competence."
"Completion does not equal mastery."

This service transforms the already-verified Scholar student state, next action,
and grounded knowledge context into a concise, user-facing response.
It makes NO new decisions, triggers NO external APIs, and does NOT use an LLM.
Existing deterministic services remain the single source of truth.
"""

from typing import Optional, List
from sqlalchemy.orm import Session

from app.schemas.scholar import (
    ScholarAction,
    ScholarStudentState,
    ScholarNextAction,
    ScholarGroundedContext,
    ScholarResponse,
    ResponseEvidenceItem,
)
from app.services.scholar_orchestrator_service import ScholarOrchestratorService
from app.services.scholar_knowledge_service import ScholarKnowledgeService

class ScholarResponseService:
    """
    Deterministic Response Generator for Scholar AI.
    Converts verified engine state and action context into an explainable response.
    """

    @classmethod
    def generate_response(cls, db: Session, student_id: str) -> Optional[ScholarResponse]:
        # 1. Obtain verified state from orchestrator
        state = ScholarOrchestratorService.get_student_state(db, student_id)
        if not state:
            return None

        # 2. Obtain verified next action
        next_action = ScholarOrchestratorService.get_next_action(db, student_id)
        if not next_action:
            return None

        # 3. Obtain grounded knowledge context
        context = ScholarKnowledgeService.get_context_for_action(
            student_id=student_id,
            action=next_action.action,
            target_topic=next_action.target_topic,
        )

        # 4. Derive deterministic confidence from existing evidence status
        confidence = cls._derive_confidence(state, next_action.action)

        # 5. Apply deterministic response rules
        headline, message, why_this_action, next_step = cls._apply_response_rules(
            action=next_action.action,
            target_topic=next_action.target_topic,
            state=state,
        )

        # 6. Assemble auditable evidence items strictly from existing state
        evidence_items = cls._assemble_evidence(state, next_action, context)

        source_types = [
            "SCHOLAR_STUDENT_STATE",
            "SCHOLAR_NEXT_ACTION",
            "CURATED_PROTOTYPE_KNOWLEDGE",
        ]

        return ScholarResponse(
            student_id=student_id,
            action=next_action.action,
            headline=headline,
            message=message,
            target_topic=next_action.target_topic,
            why_this_action=why_this_action,
            evidence=evidence_items,
            knowledge=context.knowledge,
            next_step=next_step,
            confidence=confidence,
            source_types=source_types,
        )

    @classmethod
    def _derive_confidence(cls, state: ScholarStudentState, action: str) -> str:
        """
        Derives categorical confidence strictly from deterministic evidence properties.
        Never fabricates numerical probabilities.
        """
        if (
            action == ScholarAction.COLLECT_MORE_EVIDENCE.value
            or state.roadmap.evidence_status == "INSUFFICIENT_EVIDENCE"
            or state.capability.readiness_status == "INSUFFICIENT_EVIDENCE"
        ):
            return "INSUFFICIENT"
        elif state.false_progress.detected:
            if state.false_progress.severity in ("CRITICAL", "HIGH"):
                return "HIGH"
            elif state.false_progress.severity == "MEDIUM":
                return "MEDIUM"
            else:
                return "LOW"
        elif state.capability.readiness_status in ("VERIFIED_READY", "PARTIALLY_VERIFIED"):
            return "HIGH"
        else:
            return "MEDIUM"

    @classmethod
    def _apply_response_rules(
        cls,
        action: str,
        target_topic: Optional[str],
        state: ScholarStudentState,
    ) -> tuple[str, str, str, str]:
        """
        Maps ScholarAction to user-facing messages based strictly on existing state.
        """
        topic_display = target_topic or "Current Topic"

        if action == ScholarAction.COMPLETE_MASTERY_CHECK.value:
            headline = f"Mastery Verification Required: {topic_display}"
            message = (
                f"Before continuing your roadmap, complete the independent mastery check for {topic_display}. "
                f"The existing Scholar action policy requires independent verification for {topic_display} before roadmap advancement can resume."
            )
            why_this_action = (
                f"False-progress evidence requires independent mastery verification for {topic_display} "
                f"before roadmap advancement can resume."
            )
            next_step = f"Review the {topic_display} concepts below, then complete the unassisted mastery check problem."

        elif action == ScholarAction.COMPLETE_REMEDIATION.value:
            headline = f"Targeted Remediation Required: {topic_display}"
            message = (
                f"Your most recent diagnostic check for {topic_display} resulted in NOT_MASTERED. "
                f"Targeted remediation is required before advancing further on this roadmap track."
            )
            why_this_action = (
                f"The latest mastery evaluation confirmed that independent solving criteria were not met for {topic_display}."
            )
            next_step = (
                f"Work through the {topic_display} foundational concepts below and complete practice problems before re-attempting the check."
            )

        elif action == ScholarAction.RESUME_ROADMAP.value:
            topic_suffix = f" for {target_topic}" if target_topic else ""
            headline = f"Roadmap Advancement Resumed{topic_suffix}"
            message = (
                f"Your independent mastery check{topic_suffix} satisfies the verification requirement. "
                f"Roadmap progression can now resume."
            )
            why_this_action = (
                f"Verified independent problem solving and server-evaluated conceptual score were confirmed{topic_suffix}."
            )
            next_step = "Proceed to the next unlocked node on your learning roadmap."

        elif action == ScholarAction.CONTINUE_LEARNING.value:
            headline = "Roadmap Progression on Track"
            message = "Your current Scholar state supports continuing your roadmap normally."
            why_this_action = "Scholar has no active false-progress intervention requiring a roadmap pause."
            next_step = "Continue solving upcoming problems independently according to your roadmap schedule."

        elif action == ScholarAction.COLLECT_MORE_EVIDENCE.value:
            headline = "Additional Telemetry Required"
            message = (
                "Scholar does not yet have enough telemetry to evaluate your independent competence. "
                "Complete additional learning activity so the system can evaluate your progress."
            )
            why_this_action = (
                "A minimum of 5 problem submissions is required before behavioral diagnostics and progression decisions can be evaluated."
            )
            next_step = "Submit additional coding problem attempts on the platform to establish a baseline telemetry history."

        elif action == ScholarAction.REVIEW_CONCEPT.value:
            headline = f"Conceptual Review Recommended: {topic_display}"
            message = f"Before attempting new coding problems, review the core invariants for {topic_display}."
            why_this_action = f"Telemetry indicates conceptual friction in {topic_display} requiring pattern review."
            next_step = f"Study the {topic_display} reference material below and trace the algorithmic patterns on paper."

        else:
            headline = "Scholar Learning Guidance"
            message = f"Scholar recommends {action} based on your verified learning telemetry."
            why_this_action = "Action determined by Scholar deterministic orchestration policy."
            next_step = "Follow the indicated action on your roadmap."

        return headline, message, why_this_action, next_step

    @classmethod
    def _assemble_evidence(
        cls,
        state: ScholarStudentState,
        next_action: ScholarNextAction,
        context: ScholarGroundedContext,
    ) -> List[ResponseEvidenceItem]:
        """
        Assembles auditable evidence list strictly from facts present in existing state.
        """
        evidence_items: List[ResponseEvidenceItem] = [
            ResponseEvidenceItem(
                source="SCHOLAR_NEXT_ACTION",
                detail=f"Deterministic action policy selected {next_action.action}",
            )
        ]

        if state.false_progress.detected:
            evidence_items.append(
                ResponseEvidenceItem(
                    source="FALSE_PROGRESS_DIAGNOSTIC",
                    detail=f"False progress detected with severity {state.false_progress.severity} (FPI: {state.false_progress.index})",
                )
            )
        else:
            evidence_items.append(
                ResponseEvidenceItem(
                    source="FALSE_PROGRESS_DIAGNOSTIC",
                    detail="No false-progress intervention is currently active",
                )
            )

        if state.mastery.status == "RECORDED":
            decision = state.mastery.decision or "EVALUATED"
            score_src = state.mastery.conceptual_score_source or "recorded"
            evidence_items.append(
                ResponseEvidenceItem(
                    source="MASTERY_CHECK",
                    detail=f"Latest mastery check decision is {decision} (source: {score_src})",
                )
            )

        evidence_items.append(
            ResponseEvidenceItem(
                source="ROADMAP_ADAPTATION",
                detail=f"Roadmap adaptation state is {state.roadmap.action}",
            )
        )
        evidence_items.append(
            ResponseEvidenceItem(
                source="VERIFIED_CAPABILITY_SERVICE",
                detail=f"Readiness status is {state.capability.readiness_status} (verified score: {state.capability.verified_capability_score})",
            )
        )

        if context.knowledge and next_action.target_topic:
            evidence_items.append(
                ResponseEvidenceItem(
                    source="CURATED_PROTOTYPE_KNOWLEDGE",
                    detail=f"{len(context.knowledge)} curated conceptual items retrieved for {next_action.target_topic}",
                )
            )

        return evidence_items
