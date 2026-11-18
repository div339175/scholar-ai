from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.problem import Problem
from app.schemas.problem import ProblemResponse

router = APIRouter(prefix="/problems", tags=["Problems Catalog"])

@router.get("", response_model=List[ProblemResponse])
def get_problems(topic: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Returns available catalog problems, optionally filtered by topic.
    """
    query = db.query(Problem)
    if topic:
        query = query.filter(Problem.topic == topic)
    return query.all()
