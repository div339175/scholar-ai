from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.student import Student
from app.schemas.telemetry import TelemetryCreate, TelemetryResponse
from app.services.telemetry_service import TelemetryService

router = APIRouter(prefix="/students", tags=["Telemetry & Learning Events"])

@router.get("/{student_id}/telemetry", response_model=List[TelemetryResponse])
def get_student_telemetry(student_id: str, limit: int = 100, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return TelemetryService.get_student_telemetry(db, student_id, limit=limit)

@router.post("/{student_id}/telemetry", response_model=TelemetryResponse, status_code=status.HTTP_201_CREATED)
def record_student_telemetry(student_id: str, payload: TelemetryCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return TelemetryService.log_telemetry(db, student_id, payload)
