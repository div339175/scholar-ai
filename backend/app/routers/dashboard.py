import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.student import Student, ReadinessSnapshot
from app.models.roadmap import RoadmapNode, NodeStatus, NodeType
from app.schemas.student import StudentResponse, StudentCreate, ReadinessResponse, VerifiedCapabilityResponse
from app.services.readiness_service import ReadinessService

router = APIRouter(prefix="/students", tags=["Dashboard & Student"])

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)):
    """
    Onboards and persists a real new student in SQLite with zero benchmark data contamination.
    Initializes a clean, evidence-based personalized roadmap:
    - Node 1: IN_PROGRESS (unlocked)
    - Downstream nodes: PENDING / LOCKED
    - Streak: 0
    - Roadmap completion: 0.0%
    """
    cleaned_name = payload.name.strip() if payload.name else ""
    if not cleaned_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student name cannot be empty.",
        )

    student_id = payload.id.strip() if payload.id and payload.id.strip() else f"student_{uuid.uuid4().hex[:8]}"

    existing = db.query(Student).filter(Student.id == student_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Student with ID '{student_id}' already exists.",
        )

    student = Student(
        id=student_id,
        name=cleaned_name,
        career_goal=payload.career_goal.strip() if payload.career_goal else "Full-Stack Developer",
        weekly_hours=float(payload.weekly_hours) if payload.weekly_hours else 10.0,
        current_streak=0,
        roadmap_completion=0.0,
    )
    db.add(student)

    # Initial Curriculum Roadmap Nodes
    curriculum = [
        ("Foundations of Arrays & Hashing", "Arrays & Hashing", NodeStatus.IN_PROGRESS.value, 1, 120, False),
        ("Two Pointers Technique", "Arrays & Hashing", NodeStatus.PENDING.value, 2, 150, True),
        ("Sliding Window Patterns", "Sliding Window", NodeStatus.PENDING.value, 3, 180, True),
        ("Recursion & Backtracking Foundations", "Recursion", NodeStatus.PENDING.value, 4, 200, True),
        ("Dynamic Programming: 1D Memoization", "Dynamic Programming", NodeStatus.PENDING.value, 5, 240, True),
        ("Dynamic Programming: 2D State Transitions", "Dynamic Programming", NodeStatus.PENDING.value, 6, 260, True),
        ("Breadth-First & Depth-First Search", "Graph Traversal", NodeStatus.PENDING.value, 7, 240, True),
        ("Advanced Topological Sorting & Graphs", "Graph Traversal", NodeStatus.PENDING.value, 8, 300, True),
    ]

    for title, topic, st, seq, est, locked in curriculum:
        node = RoadmapNode(
            id=f"node_{student_id}_{seq:02d}",
            student_id=student_id,
            title=title,
            topic=topic,
            status=st,
            sequence=seq,
            estimated_minutes=est,
            is_locked=locked,
            node_type=NodeType.NORMAL.value,
        )
        db.add(node)

    # Initial Baseline Readiness Snapshot
    snap = ReadinessSnapshot(
        id=f"snap_{uuid.uuid4().hex[:12]}",
        student_id=student_id,
        standard_readiness=0.0,
        mastery_multiplier=1.0,
        verified_capability_score=0.0,
    )
    db.add(snap)

    db.commit()
    db.refresh(student)
    return student

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return student

@router.get("/{student_id}/readiness", response_model=ReadinessResponse)
def get_student_readiness(student_id: str, db: Session = Depends(get_db)):
    result = ReadinessService.get_or_create_readiness(db, student_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return result

@router.get("/{student_id}/verified-capability", response_model=VerifiedCapabilityResponse)
def get_student_verified_capability(student_id: str, db: Session = Depends(get_db)):
    """
    Evidence-Based Verified Capability & Readiness Evaluation (Step 7):
    Calculates verified capability strictly from stored telemetry, false progress diagnostics,
    intervention state, and server-side verified mastery assessments.
    """
    result = ReadinessService.evaluate_verified_capability(db, student_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return result

