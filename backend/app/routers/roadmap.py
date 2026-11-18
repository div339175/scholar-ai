from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.student import Student
from app.models.roadmap import RoadmapNode, NodeStatus, NodeType
from app.schemas.roadmap import (
    RoadmapNodeCreate,
    RoadmapNodeResponse,
    RoadmapAdaptationDecision,
)
from app.services.roadmap_service import RoadmapService
from app.services.roadmap_adaptation_service import RoadmapAdaptationService

router = APIRouter(prefix="/students", tags=["Roadmap"])

@router.get("/{student_id}/roadmap", response_model=List[RoadmapNodeResponse])
def get_student_roadmap(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return RoadmapService.get_roadmap_for_student(db, student_id)

@router.post("/{student_id}/roadmap", response_model=RoadmapNodeResponse, status_code=status.HTTP_201_CREATED)
def add_roadmap_node(student_id: str, payload: RoadmapNodeCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return RoadmapService.add_node(db, student_id, payload)

@router.post("/{student_id}/roadmap/{node_id}/start", response_model=List[RoadmapNodeResponse])
def start_roadmap_node(student_id: str, node_id: str, db: Session = Depends(get_db)):
    """
    Sets an unlocked pending roadmap node to IN_PROGRESS.
    Fails if the node is locked or if advancement is paused by Scholar AI.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )

    node = db.query(RoadmapNode).filter(
        RoadmapNode.id == node_id,
        RoadmapNode.student_id == student_id,
    ).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap node with ID '{node_id}' not found for student '{student_id}'",
        )

    if node.is_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start locked module. Complete prerequisite modules first.",
        )

    adaptation = RoadmapAdaptationService.determine_adaptation(db, student_id, skip_apply=True)
    is_paused = adaptation and adaptation.action in ("PAUSE_ADVANCEMENT", "REMEDIATE_TOPIC")
    if is_paused:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Advancement is paused by Scholar AI pending mastery verification.",
        )

    node.status = NodeStatus.IN_PROGRESS.value
    db.commit()
    return RoadmapService.get_roadmap_for_student(db, student_id)


@router.post("/{student_id}/roadmap/{node_id}/complete", response_model=List[RoadmapNodeResponse])
def complete_roadmap_node(student_id: str, node_id: str, db: Session = Depends(get_db)):
    """
    Persistently completes a roadmap node in SQLite:
    - Sets node status to COMPLETED and unlocks it.
    - Updates student.roadmap_completion based on completed / total nodes.
    - If advancement is not paused by Scholar AI, unlocks the next sequential normal node.
    - Returns the updated roadmap node list.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )

    node = db.query(RoadmapNode).filter(
        RoadmapNode.id == node_id,
        RoadmapNode.student_id == student_id,
    ).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap node with ID '{node_id}' not found for student '{student_id}'",
        )

    # Mark node completed
    node.status = NodeStatus.COMPLETED.value
    node.is_locked = False

    # Fetch all nodes to recompute completion and unlock next
    nodes = (
        db.query(RoadmapNode)
        .filter(RoadmapNode.student_id == student_id)
        .order_by(RoadmapNode.sequence.asc())
        .all()
    )

    completed_count = sum(1 for n in nodes if n.status == NodeStatus.COMPLETED.value)
    student.roadmap_completion = round((completed_count / max(len(nodes), 1)) * 100.0, 1)

    # Check if active Scholar AI adaptation dictates pause
    adaptation = RoadmapAdaptationService.determine_adaptation(db, student_id, skip_apply=True)
    is_paused = adaptation and adaptation.action in ("PAUSE_ADVANCEMENT", "REMEDIATE_TOPIC")

    if not is_paused:
        # Unlock the next normal node in sequence
        next_nodes = [
            n for n in nodes
            if n.sequence > node.sequence and n.node_type == NodeType.NORMAL.value and n.status != NodeStatus.COMPLETED.value
        ]
        if next_nodes:
            next_nodes[0].status = NodeStatus.IN_PROGRESS.value
            next_nodes[0].is_locked = False

    db.commit()
    return RoadmapService.get_roadmap_for_student(db, student_id)

@router.get("/{student_id}/roadmap/adaptation", response_model=RoadmapAdaptationDecision)
def get_roadmap_adaptation(student_id: str, db: Session = Depends(get_db)):
    """
    Evidence-Based Roadmap Adaptation Engine:
    Translates verified Scholar AI evidence (telemetry, diagnostic, intervention, mastery check)
    into deterministic roadmap mutations without LLMs or hallucinated student progress.
    """
    decision = RoadmapAdaptationService.determine_adaptation(db, student_id)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with ID '{student_id}' not found",
        )
    return decision
