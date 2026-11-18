from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.student import Student
from app.schemas.student import StudentResponse, ReadinessResponse, VerifiedCapabilityResponse
from app.services.readiness_service import ReadinessService

router = APIRouter(prefix="/students", tags=["Dashboard & Student"])

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return student

@router.get("/{student_id}/readiness", response_model=ReadinessResponse)
def get_student_readiness(student_id: str, db: Session = Depends(get_db)):
    result = ReadinessService.get_or_create_readiness(db, student_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return result

@router.get("/{student_id}/verified-capability", response_model=VerifiedCapabilityResponse)
def get_student_verified_capability(student_id: str, db: Session = Depends(get_db)):
    """
    Evidence-Based Verified Capability & Readiness Evaluation (Step 7):
    Calculates verified capability strictly from stored telemetry, false progress diagnostics,
    intervention state, and server-side verified mastery assessments.
    """
    result = ReadinessService.evaluate_verified_capability(db, student_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return result

