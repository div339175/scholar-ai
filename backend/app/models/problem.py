from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Problem(Base):
    __tablename__ = "problems"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    topic = Column(String(128), nullable=False, index=True)
    difficulty = Column(String(32), nullable=False)

    telemetry_events = relationship("CodingTelemetry", back_populates="problem")

class CodingTelemetry(Base):
    """
    Also known as LearningEvent: captures granular coding behavioral telemetry
    for determining independent mastery vs false progress.
    """
    __tablename__ = "coding_telemetry"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False, index=True)
    problem_id = Column(String(64), ForeignKey("problems.id"), nullable=True, index=True)
    topic = Column(String(128), nullable=False, index=True)
    difficulty = Column(String(32), nullable=False)
    submission_count = Column(Integer, default=1, nullable=False)
    successful = Column(Boolean, default=True, nullable=False)
    first_attempt_pass = Column(Boolean, default=False, nullable=False)
    hints_requested = Column(Integer, default=0, nullable=False)
    active_coding_duration_seconds = Column(Integer, default=0, nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False)

    student = relationship("Student", back_populates="telemetry_events")
    problem = relationship("Problem", back_populates="telemetry_events")

# Alias for backward compatibility / explicit specification
LearningEvent = CodingTelemetry
