from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.student import Student
from app.models.problem import CodingTelemetry
from app.models.roadmap import RoadmapNode
from app.models.scholar import ScholarIntervention
from app.schemas.scholar import (
    ScholarInterventionResponse,
    FalseProgressDiagnosticResponse,
    InterventionPlan,
    MasteryCheckRequest,
    MasteryCheckResult,
    MasteryCheckStatusResponse,
    MasteryAssessmentQuestion,
    MasteryAssessmentSubmission,
    MasteryAssessmentResult,
    ScholarStudentState,
    ScholarNextAction,
    ScholarKnowledgeItem,
    ScholarKnowledgeRetrieval,
    ScholarGroundedContext,
    ScholarResponse,
    ScholarConversationRequest,
    ScholarConversationResponse,
)
from app.services.false_progress_detector import FalseProgressDetector
from app.services.intervention_service import InterventionService
from app.services.mastery_service import MasteryService
from app.services.mastery_assessment_service import MasteryAssessmentService
from app.services.scholar_orchestrator_service import ScholarOrchestratorService
from app.services.scholar_knowledge_service import ScholarKnowledgeService
from app.services.scholar_response_service import ScholarResponseService
from app.services.scholar_conversation_service import ScholarConversationService

router = APIRouter(prefix="/students", tags=["Scholar AI"])

@router.get("/{student_id}/false-progress", response_model=FalseProgressDiagnosticResponse)
def get_false_progress_diagnostic(student_id: str, db: Session = Depends(get_db)):
    """
    Evaluates learning telemetry against objective behavioral heuristics to diagnose
    False Progress ('Student activity is not the same as student competence').
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return FalseProgressDetector.analyze_student(db, student_id)

@router.get("/{student_id}/intervention", response_model=InterventionPlan)
def get_student_intervention_plan(student_id: str, db: Session = Depends(get_db)):
    """
    Scholar AI Intervention Engine:
    Consumes the objective FPDE diagnostic to formulate a proactive, explainable
    intervention plan with concrete remediation steps.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )

    telemetry = (
        db.query(CodingTelemetry)
        .filter(CodingTelemetry.student_id == student_id)
        .order_by(CodingTelemetry.timestamp.asc())
        .all()
    )
    roadmap = (
        db.query(RoadmapNode)
        .filter(RoadmapNode.student_id == student_id)
        .order_by(RoadmapNode.sequence.asc())
        .all()
    )

    diagnostic = FalseProgressDetector.analyze_student(db, student_id)
    return InterventionService.generate_intervention(student, diagnostic, telemetry, roadmap)

@router.get("/{student_id}/mastery-assessment/{topic}", response_model=MasteryAssessmentQuestion)
def get_mastery_assessment_question(student_id: str, topic: str, db: Session = Depends(get_db)):
    """
    Retrieves a curated prototype assessment question for a topic.
    STRICT SECURITY: Excludes correct_answer and internal answer key to prevent leakage.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )

    question = MasteryAssessmentService.get_question(topic)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No assessment questions available for topic '{topic}'",
        )
    return question

@router.post("/{student_id}/mastery-assessment/submit", response_model=MasteryAssessmentResult)
def submit_mastery_assessment(
    student_id: str,
    payload: MasteryAssessmentSubmission,
    db: Session = Depends(get_db),
):
    """
    Deterministically evaluates student's conceptual answer against stored key.
    Calculates server-side conceptual score (100 or 0) and records verified score.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )

    result = MasteryAssessmentService.evaluate_answer(
        student_id=student_id,
        topic=payload.topic,
        question_id=payload.question_id,
        answer=payload.answer,
        db=db,
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID '{payload.question_id}' not found in assessment catalog",
        )
    return result

@router.post("/{student_id}/mastery-check", response_model=MasteryCheckResult)
def submit_mastery_check(student_id: str, payload: MasteryCheckRequest, db: Session = Depends(get_db)):
    """
    Evidence-Based Mastery Check Evaluation:
    Deterministically evaluates whether the student solved the check independently
    (1 attempt, 0 hints, solved=true) with verified conceptual_score >= 80.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )

    payload.student_id = student_id
    return MasteryService.evaluate_mastery(db, payload)

@router.get("/{student_id}/mastery-check/status", response_model=MasteryCheckStatusResponse)
def get_mastery_check_status(student_id: str, db: Session = Depends(get_db)):
    """
    Retrieves the latest recorded mastery check evaluation for the student.
    Does not fake historical results if none exist.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return MasteryService.get_latest_status(db, student_id)

@router.get("/{student_id}/interventions", response_model=List[ScholarInterventionResponse])
def get_student_interventions(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return (
        db.query(ScholarIntervention)
        .filter(ScholarIntervention.student_id == student_id)
        .order_by(ScholarIntervention.created_at.desc())
        .all()
    )

@router.get("/{student_id}/scholar/state", response_model=ScholarStudentState)
def get_scholar_student_state(student_id: str, db: Session = Depends(get_db)):
    """
    Scholar AI Student State Orchestration:
    Assembles student's complete, explainable evidence state across
    FPDE diagnostic, intervention plan, mastery checks, roadmap adaptation,
    and verified capability.
    """
    state = ScholarOrchestratorService.get_student_state(db, student_id)
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return state

@router.get("/{student_id}/scholar/next-action", response_model=ScholarNextAction)
def get_scholar_next_action(student_id: str, db: Session = Depends(get_db)):
    """
    Scholar AI Next Action Evaluation:
    Selects ONE primary deterministic action grounded strictly in
    empirical backend evidence and explainable precedence rules.
    """
    action = ScholarOrchestratorService.get_next_action(db, student_id)
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return action

@router.get("/{student_id}/scholar/context", response_model=ScholarGroundedContext)
def get_scholar_grounded_context(student_id: str, db: Session = Depends(get_db)):
    """
    Scholar AI Grounded Context:
    Combines student evidence state + verified action + curated conceptual knowledge.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    action = ScholarOrchestratorService.get_next_action(db, student_id)
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return ScholarKnowledgeService.get_context_for_action(
        student_id=student_id,
        action=action.action,
        target_topic=action.target_topic,
    )

@router.get("/{student_id}/scholar/knowledge/topic/{topic}", response_model=List[ScholarKnowledgeRetrieval])
def get_scholar_knowledge_by_topic(student_id: str, topic: str, db: Session = Depends(get_db)):
    """
    Deterministic conceptual knowledge retrieval for a specific topic.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return ScholarKnowledgeService.get_by_topic(topic)

@router.get("/{student_id}/scholar/knowledge/item/{knowledge_id}", response_model=ScholarKnowledgeItem)
def get_scholar_knowledge_by_id(student_id: str, knowledge_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a specific knowledge item by knowledge_id.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    item = ScholarKnowledgeService.get_by_id(knowledge_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Knowledge item with ID '{knowledge_id}' not found",
        )
    return item


@router.get("/{student_id}/scholar/response", response_model=ScholarResponse)
def get_scholar_response(student_id: str, db: Session = Depends(get_db)):
    """
    Scholar AI Grounded Response Generator:
    Produces a deterministic, explainable, read-only response strictly grounded
    in verified engine evidence and curated knowledge.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    response = ScholarResponseService.generate_response(db, student_id)
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return response


@router.post("/{student_id}/scholar/chat", response_model=ScholarConversationResponse)
def scholar_chat(student_id: str, payload: ScholarConversationRequest, db: Session = Depends(get_db)):
    """
    Scholar AI Deterministic Conversational Interface:
    Routes user conversational query through deterministic intent classification and
    strict evidence boundaries. Never treats conversational input as evidence.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    response = ScholarConversationService.handle_message(db, student_id, payload.message)
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return response




