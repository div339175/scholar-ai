from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any
import enum

class StudentBase(BaseModel):
    name: str
    career_goal: str
    weekly_hours: float = 10.0
    current_streak: int = 0
    roadmap_completion: float = 0.0

class StudentCreate(StudentBase):
    id: Optional[str] = None
    baseline_level: Optional[str] = "Intermediate"

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    career_goal: Optional[str] = None
    weekly_hours: Optional[float] = None
    baseline_level: Optional[str] = None

class StudentResponse(StudentBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReadinessResponse(BaseModel):
    student_id: str
    standard_readiness: float
    mastery_multiplier: float
    verified_capability_score: float
    breakdown: Optional[dict] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ReadinessStatus(str, enum.Enum):
    VERIFIED_READY = "VERIFIED_READY"
    PARTIALLY_VERIFIED = "PARTIALLY_VERIFIED"
    NOT_VERIFIED = "NOT_VERIFIED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"

class ReadinessEvidenceItem(BaseModel):
    metric: str
    observed_value: Any
    requirement: str
    status: str

class VerifiedCapabilityResponse(BaseModel):
    student_id: str
    standard_readiness_score: float
    verified_capability_score: float
    mastery_coverage: float
    mastery_confidence_multiplier: float
    readiness_status: str
    evidence_status: str
    verified_topics: List[str]
    unverified_topics: List[str]
    false_progress_detected: bool
    evidence: List[ReadinessEvidenceItem]
    limitations: List[str]

    model_config = ConfigDict(from_attributes=True)

