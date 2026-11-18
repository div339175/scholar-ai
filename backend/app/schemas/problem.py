from pydantic import BaseModel, ConfigDict
from typing import Optional

class ProblemResponse(BaseModel):
    id: str
    title: str
    topic: str
    difficulty: str
    description: Optional[str] = None
    solved: Optional[bool] = False
    attempts: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
