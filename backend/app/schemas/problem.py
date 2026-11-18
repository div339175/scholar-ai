from pydantic import BaseModel, ConfigDict
from typing import Optional

class ProblemResponse(BaseModel):
    id: str
    title: str
    topic: str
    difficulty: str

    model_config = ConfigDict(from_attributes=True)
