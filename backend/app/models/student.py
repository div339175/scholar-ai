from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Student(Base):
    __tablename__ = "students"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    career_goal = Column(String(256), nullable=False)
    weekly_hours = Column(Float, default=10.0)
    current_streak = Column(Integer, default=0)
    roadmap_completion = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    telemetry_events = relationship("CodingTelemetry", back_populates="student", cascade="all, delete-orphan")
    roadmap_nodes = relationship("RoadmapNode", back_populates="student", cascade="all, delete-orphan", order_by="RoadmapNode.sequence")
    readiness_snapshots = relationship("ReadinessSnapshot", back_populates="student", cascade="all, delete-orphan", order_by="desc(ReadinessSnapshot.created_at)")
    interventions = relationship("ScholarIntervention", back_populates="student", cascade="all, delete-orphan", order_by="desc(ScholarIntervention.created_at)")
    mastery_assessments = relationship("MasteryAssessmentRecord", back_populates="student", cascade="all, delete-orphan", order_by="desc(MasteryAssessmentRecord.created_at)")

class ReadinessSnapshot(Base):
    __tablename__ = "readiness_snapshots"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False, index=True)
    standard_readiness = Column(Float, nullable=False)
    mastery_multiplier = Column(Float, nullable=False, default=1.0)
    verified_capability_score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    student = relationship("Student", back_populates="readiness_snapshots")
