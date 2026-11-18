from datetime import datetime, timezone
import uuid
import enum
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class InterventionTriggerType(str, enum.Enum):
    FALSE_PROGRESS_HINT_DEPENDENCY = "FALSE_PROGRESS_HINT_DEPENDENCY"
    REPEATED_CONCEPT_FAILURE = "REPEATED_CONCEPT_FAILURE"
    UNUSUALLY_LONG_DURATION = "UNUSUALLY_LONG_DURATION"
    LOW_INDEPENDENT_SOLVING = "LOW_INDEPENDENT_SOLVING"
    MULTI_ATTEMPT_STRUGGLE = "MULTI_ATTEMPT_STRUGGLE"

class InterventionStatus(str, enum.Enum):
    PENDING = "PENDING"
    TRIGGERED = "TRIGGERED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"

class ScholarIntervention(Base):
    __tablename__ = "scholar_interventions"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False, index=True)
    trigger_type = Column(String(64), nullable=False)
    topic = Column(String(128), nullable=False)
    severity = Column(String(32), default="MEDIUM", nullable=False)
    reason = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    status = Column(String(32), default=InterventionStatus.TRIGGERED.value, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    student = relationship("Student", back_populates="interventions")
    mastery_checks = relationship("MasteryCheck", back_populates="intervention", cascade="all, delete-orphan")

class MasteryCheck(Base):
    __tablename__ = "mastery_checks"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    intervention_id = Column(String(64), ForeignKey("scholar_interventions.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    expected_concept = Column(Text, nullable=False)
    student_answer = Column(Text, nullable=True)
    passed = Column(Boolean, nullable=True)
    score = Column(Float, nullable=True)

    intervention = relationship("ScholarIntervention", back_populates="mastery_checks")

class MasteryAssessmentRecord(Base):
    """
    Persistent Database-Backed Mastery Assessment Ledger.
    Captures verified conceptual assessment submissions evaluated on the server.
    Authoritative state survives process reloads and restarts.
    """
    __tablename__ = "mastery_assessment_records"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False, index=True)
    topic = Column(String(128), nullable=False, index=True)
    question_id = Column(String(64), nullable=True, index=True)
    score = Column(Float, nullable=False, default=0.0)
    correct = Column(Boolean, nullable=False, default=False)
    assessment_source = Column(String(64), nullable=False, default="server_evaluated")
    attempt_answer = Column(String(128), nullable=True)
    verification_status = Column(String(32), nullable=False, default="VERIFIED")
    created_at = Column(DateTime, default=utc_now, nullable=False)

    student = relationship("Student", back_populates="mastery_assessments")
