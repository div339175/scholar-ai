"""
Scholar AI Evidence-Grounded Conversation Service
Core Product Thesis: "Student activity is not the same as student competence."
"Completion does not equal mastery."

This service implements the deterministic conversational interface contract.
It routes classified intents through strict evidence boundaries to existing Scholar state.
DOES NOT use LLMs, embeddings, vector databases, or generative chatbot approximations.
Conversational input is NEVER treated as student evidence.
"""

from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.student import Student
from app.schemas.scholar import (
    ScholarIntent,
    ScholarAction,
    ScholarConversationResponse,
    ScholarKnowledgeRetrieval,
)
from app.services.scholar_intent_service import ScholarIntentService
from app.services.scholar_orchestrator_service import ScholarOrchestratorService
from app.services.scholar_response_service import ScholarResponseService
from app.services.scholar_knowledge_service import ScholarKnowledgeService

class ScholarConversationService:
    """
    Deterministic Conversational Interface Service for Scholar AI.
    Maps user queries to explainable, evidence-bounded responses without LLMs.
    """

    @classmethod
    def handle_message(cls, db: Session, student_id: str, message: str) -> Optional[ScholarConversationResponse]:
        """
        Processes a student message deterministically:
        1. Validates student existence
        2. Classifies intent & topic
        3. Loads existing Scholar state & action
        4. Applies evidence boundary
        5. Returns structured conversational response
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None

        # 1. Classify intent
        intent, extracted_topic = ScholarIntentService.classify_intent(message)

        # 2. Retrieve existing state and action (read-only)
        state = ScholarOrchestratorService.get_student_state(db, student_id)
        next_action = ScholarOrchestratorService.get_next_action(db, student_id)

        target_topic: Optional[str] = next_action.target_topic if next_action else None
        action_val: Optional[str] = next_action.action if next_action else None

        # 3. Apply Evidence Boundary based on Intent
        if intent == ScholarIntent.NEXT_ACTION:
            scholar_response = ScholarResponseService.generate_response(db, student_id)
            if scholar_response:
                response_text = scholar_response.message
                knowledge = scholar_response.knowledge
                target_topic = scholar_response.target_topic
                action_val = scholar_response.action
            else:
                response_text = "No action recommendation available."
                knowledge = []
            evidence_sources = ["SCHOLAR_NEXT_ACTION", "SCHOLAR_STUDENT_STATE"]
            requires_action = (action_val != ScholarAction.CONTINUE_LEARNING.value)

        elif intent == ScholarIntent.WHY_THIS_ACTION:
            scholar_response = ScholarResponseService.generate_response(db, student_id)
            if scholar_response:
                response_text = f"The current Scholar action is {action_val} because {scholar_response.why_this_action}"
            else:
                response_text = f"The current Scholar action is {action_val} based on verified learning state."
            knowledge = []
            evidence_sources = ["SCHOLAR_NEXT_ACTION", "SCHOLAR_STUDENT_STATE"]
            requires_action = (action_val != ScholarAction.CONTINUE_LEARNING.value)

        elif intent == ScholarIntent.EXPLAIN_TOPIC:
            # Topic Safety Enforcement (Behavior B: Strict student grounding)
            if extracted_topic:
                if target_topic and extracted_topic.lower() == target_topic.lower():
                    # Matches active verified target topic
                    knowledge = ScholarKnowledgeService.get_by_topic(target_topic)
                    response_text = (
                        f"Here is the curated conceptual knowledge for your active Scholar target topic: {target_topic}. "
                        f"Review these invariants before completing your unassisted check."
                    )
                    evidence_sources = ["CURATED_PROTOTYPE_KNOWLEDGE", "SCHOLAR_NEXT_ACTION"]
                    requires_action = (action_val != ScholarAction.CONTINUE_LEARNING.value)
                else:
                    # Requested topic is not the student's active verified target topic
                    known_items = ScholarKnowledgeService.get_by_topic(extracted_topic)
                    if known_items:
                        response_text = (
                            f"{extracted_topic} is available in the curated knowledge base, "
                            f"but it is not the currently verified Scholar target topic."
                        )
                        evidence_sources = ["CURATED_PROTOTYPE_KNOWLEDGE", "SCHOLAR_STUDENT_STATE"]
                    else:
                        response_text = (
                            f"I do not have curated conceptual knowledge for '{extracted_topic}' "
                            f"in the prototype knowledge base."
                        )
                        evidence_sources = ["CURATED_PROTOTYPE_KNOWLEDGE"]
                    knowledge = []
                    requires_action = False
            else:
                # No topic named by user
                if target_topic:
                    knowledge = ScholarKnowledgeService.get_by_topic(target_topic)
                    response_text = (
                        f"Here is the curated conceptual knowledge for your active Scholar target topic: {target_topic}. "
                        f"Review these invariants before completing your unassisted check."
                    )
                    evidence_sources = ["CURATED_PROTOTYPE_KNOWLEDGE", "SCHOLAR_NEXT_ACTION"]
                    requires_action = (action_val != ScholarAction.CONTINUE_LEARNING.value)
                else:
                    response_text = "I don't have a verified Scholar topic to explain from your current state."
                    knowledge = []
                    evidence_sources = ["SCHOLAR_STUDENT_STATE"]
                    requires_action = False

        elif intent == ScholarIntent.MASTERY_STATUS:
            knowledge = []
            evidence_sources = ["MASTERY_CHECK", "SCHOLAR_STUDENT_STATE"]
            if state and state.mastery.status == "RECORDED":
                dec = state.mastery.decision or "EVALUATED"
                src = state.mastery.conceptual_score_source or "recorded"
                sc = state.mastery.conceptual_score
                response_text = f"Latest recorded mastery check evaluation: decision={dec}, score={sc}, source={src}."
                requires_action = (dec == "NOT_MASTERED")
            else:
                response_text = "Scholar does not have a recorded mastery check for the current state."
                requires_action = (action_val == ScholarAction.COMPLETE_MASTERY_CHECK.value)

        elif intent == ScholarIntent.READINESS_STATUS:
            knowledge = []
            evidence_sources = ["VERIFIED_CAPABILITY_SERVICE", "SCHOLAR_STUDENT_STATE"]
            if state:
                r_status = state.capability.readiness_status
                v_score = state.capability.verified_capability_score
                std_r = state.capability.standard_readiness_score
                mult = state.capability.mastery_confidence_multiplier
                response_text = (
                    f"Current readiness status: {r_status} "
                    f"(verified capability score: {v_score:.1f}, "
                    f"standard readiness: {std_r:.1f}, "
                    f"mastery multiplier: {mult:.2f})."
                )
                requires_action = (r_status in ("NOT_VERIFIED", "NEEDS_INTERVENTION"))
            else:
                response_text = "Readiness state is currently unavailable."
                requires_action = False

        elif intent == ScholarIntent.ROADMAP_STATUS:
            knowledge = []
            evidence_sources = ["ROADMAP_ADAPTATION", "SCHOLAR_STUDENT_STATE"]
            if state:
                rm_action = state.roadmap.action
                rm_topic = state.roadmap.topic
                topic_str = f" for {rm_topic}" if rm_topic else ""
                response_text = (
                    f"Current roadmap adaptation state is {rm_action}{topic_str} "
                    f"(evidence status: {state.roadmap.evidence_status})."
                )
                requires_action = (rm_action in ("PAUSE_ADVANCEMENT", "REMEDIATE_TOPIC"))
            else:
                response_text = "Roadmap adaptation state is currently unavailable."
                requires_action = False

        elif intent == ScholarIntent.FALSE_PROGRESS_STATUS:
            knowledge = []
            evidence_sources = ["FALSE_PROGRESS_DIAGNOSTIC", "SCHOLAR_STUDENT_STATE"]
            if state and state.false_progress.detected:
                sev = state.false_progress.severity
                fpi = state.false_progress.index
                triggers = ", ".join(state.false_progress.triggers)
                response_text = (
                    f"False progress detected with severity {sev} (FPI: {fpi:.1f}). "
                    f"Triggered behavioral signals: [{triggers}]."
                )
                requires_action = True
            else:
                response_text = (
                    "No false-progress intervention is currently active. "
                    "Learning telemetry does not trigger false progress heuristics."
                )
                requires_action = False

        elif intent == ScholarIntent.INTERVENTION_STATUS:
            knowledge = []
            evidence_sources = ["INTERVENTION_SERVICE", "SCHOLAR_STUDENT_STATE"]
            if state and state.intervention.required:
                itype = state.intervention.type
                prio = state.intervention.priority
                topic = ", ".join(state.intervention.target_topics) if state.intervention.target_topics else "Current Topic"
                response_text = f"Active intervention in progress: {itype} (priority: {prio}) targeting {topic}."
                requires_action = True
            else:
                response_text = "No proactive Scholar intervention is currently active for your learning track."
                requires_action = False

        else:  # UNKNOWN
            intent = ScholarIntent.UNKNOWN
            response_text = (
                "I can answer questions about your current Scholar action, mastery evidence, readiness, "
                "roadmap state, interventions, false-progress diagnostics, or the verified topic currently "
                "associated with your Scholar state."
            )
            target_topic = None
            evidence_sources = []
            knowledge = []
            action_val = None
            requires_action = False

        return ScholarConversationResponse(
            student_id=student_id,
            intent=intent.value,
            response=response_text,
            target_topic=target_topic,
            evidence_sources=evidence_sources,
            knowledge=knowledge,
            action=action_val,
            requires_action=requires_action,
        )
