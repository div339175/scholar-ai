from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class TelemetryCreate(BaseModel):
    problem_id: Optional[str] = None
    topic: str
    difficulty: str = "Medium"
    submission_count: int = 1
    successful: bool = True
    first_attempt_pass: bool = False
    hints_requested: int = 0
    active_coding_duration_seconds: int = 0
    timestamp: Optional[datetime] = None

class TelemetryResponse(BaseModel):
    id: str
    student_id: str
    problem_id: Optional[str] = None
    topic: str
    difficulty: str
    submission_count: int
    successful: bool
    first_attempt_pass: bool
    hints_requested: int
    active_coding_duration_seconds: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
