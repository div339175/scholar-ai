from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.student import Student
from app.schemas.roadmap import (
    RoadmapNodeCreate,
    RoadmapNodeResponse,
    RoadmapAdaptationDecision,
)
from app.services.roadmap_service import RoadmapService
from app.services.roadmap_adaptation_service import RoadmapAdaptationService

router = APIRouter(prefix="/students", tags=["Roadmap"])

@router.get("/{student_id}/roadmap", response_model=List[RoadmapNodeResponse])
def get_student_roadmap(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return RoadmapService.get_roadmap_for_student(db, student_id)

@router.post("/{student_id}/roadmap", response_model=RoadmapNodeResponse, status_code=status.HTTP_201_CREATED)
def add_roadmap_node(student_id: str, payload: RoadmapNodeCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return RoadmapService.add_node(db, student_id, payload)

@router.get("/{student_id}/roadmap/adaptation", response_model=RoadmapAdaptationDecision)
def get_roadmap_adaptation(student_id: str, db: Session = Depends(get_db)):
    """
    Evidence-Based Roadmap Adaptation Engine:
    Translates verified Scholar AI evidence (telemetry, diagnostic, intervention, mastery check)
    into deterministic roadmap mutations without LLMs or hallucinated student progress.
    """
    decision = RoadmapAdaptationService.determine_adaptation(db, student_id)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return decision
