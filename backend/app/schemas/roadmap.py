from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from enum import Enum
from app.schemas.scholar import MasteryEvidenceItem

class RoadmapNodeCreate(BaseModel):
    title: str
    topic: str
    status: str = "PENDING"
    sequence: int = 1
    estimated_minutes: int = 60
    is_locked: bool = False
    node_type: str = "NORMAL"

class RoadmapNodeResponse(BaseModel):
    id: str
    student_id: str
    title: str
    topic: str
    status: str
    sequence: int
    estimated_minutes: int
    is_locked: bool
    node_type: str

    model_config = ConfigDict(from_attributes=True)

class RoadmapAdaptationAction(str, Enum):
    CONTINUE_NORMAL = "CONTINUE_NORMAL"
    PAUSE_ADVANCEMENT = "PAUSE_ADVANCEMENT"
    RESUME_ROADMAP = "RESUME_ROADMAP"
    REMEDIATE_TOPIC = "REMEDIATE_TOPIC"

class EvidenceStatus(str, Enum):
    SUFFICIENT = "SUFFICIENT"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"

class RoadmapAdaptationDecision(BaseModel):
    """
    Traceable, evidence-based roadmap adaptation decision.
    Grounds all roadmap mutations in verified Scholar AI metrics.
    """
    student_id: str
    action: str
    topic: Optional[str] = None
    evidence_status: str
    reason: str
    source_components: List[str]
    evidence: List[MasteryEvidenceItem] = []

    model_config = ConfigDict(from_attributes=True)
