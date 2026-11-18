from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.student import Student
from app.models.problem import CodingTelemetry
from app.models.scholar import MasteryAssessmentRecord
from app.models.roadmap import RoadmapNode, NodeStatus, NodeType
from app.schemas.roadmap import (
    RoadmapNodeCreate,
    RoadmapNodeResponse,
    RoadmapAdaptationDecision,
)
from app.services.roadmap_service import RoadmapService
from app.services.roadmap_adaptation_service import RoadmapAdaptationService

MODULE_LEARNING_OBJECTIVES = {
    "Arrays & Hashing": [
        "In-place array indexing and pointer arithmetic",
        "Hash map key-value lookups with expected O(1) time complexity",
        "Frequency counting and duplicate element detection",
        "Space-time tradeoffs in hash set lookups",
    ],
    "Sliding Window": [
        "Fixed-length window sliding and state tracking",
        "Dynamic window contraction on invariant violations",
        "Substring searching with frequency constraints",
        "Contiguous subarray optimization algorithms",
    ],
    "Recursion": [
        "Call stack management and termination conditions",
        "Combinatorial decision trees and state branching",
        "Backtracking state rollback invariants",
        "Subsets and permutations generation",
    ],
    "Dynamic Programming": [
        "Identification of overlapping subproblems",
        "Optimal substructure decomposition",
        "1D and 2D tabulation state transitions",
        "Space-optimized memoization techniques",
    ],
    "Graph Traversal": [
        "Adjacency list versus adjacency matrix representations",
        "Queue-based Breadth-First Search (BFS) shortest path",
        "Depth-First Search (DFS) recursion and cycle detection",
        "Topological sort on Directed Acyclic Graphs (DAG)",
    ],
}

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


@router.get("/{student_id}/roadmap/{node_id}/details")
def get_roadmap_node_details(student_id: str, node_id: str, db: Session = Depends(get_db)):
    """
    Returns rich curriculum details, learning objectives, required vs current telemetry evidence,
    prerequisite status, and system-derived effective state for a clickable roadmap node.
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
            detail=f"Roadmap node with ID '{node_id}' not found",
        )

    # Check telemetry for this topic
    events = db.query(CodingTelemetry).filter(
        CodingTelemetry.student_id == student_id,
        CodingTelemetry.topic == node.topic,
        CodingTelemetry.successful == True,
    ).all()
    solved_problems = len(set(e.problem_id for e in events))

    required_evidence = 3 if "Sliding Window" in node.topic else 2

    prereq_title = None
    prereq_completed = True
    if node.sequence > 1:
        prev_node = db.query(RoadmapNode).filter(
            RoadmapNode.student_id == student_id,
            RoadmapNode.sequence == node.sequence - 1,
        ).first()
        if prev_node:
            prereq_title = prev_node.title
            prereq_completed = prev_node.status == NodeStatus.COMPLETED.value

    mastery_record = db.query(MasteryAssessmentRecord).filter(
        MasteryAssessmentRecord.student_id == student_id,
        MasteryAssessmentRecord.topic == node.topic,
    ).order_by(MasteryAssessmentRecord.created_at.desc()).first()

    adaptation = RoadmapAdaptationService.determine_adaptation(db, student_id, skip_apply=True)
    is_paused = bool(adaptation and adaptation.action == "PAUSE_ADVANCEMENT" and (adaptation.topic == node.topic or adaptation.topic is None))
    is_remediation = bool(adaptation and (adaptation.action == "REMEDIATE_TOPIC" or node.node_type == NodeType.REMEDIATION.value))

    # Derive system-authoritative effective module state
    if node.status == NodeStatus.COMPLETED.value:
        effective_state = "COMPLETED"
        state_reason = "Module completed based on verified learning evidence."
    elif is_paused:
        effective_state = "MASTERY_CHECK_REQUIRED"
        state_reason = "Scholar AI detected that additional mastery verification is required before advancement."
    elif is_remediation:
        effective_state = "REMEDIATION"
        state_reason = "Your recent evidence suggests this topic needs reinforcement before you continue."
    elif node.is_locked or not prereq_completed:
        effective_state = "LOCKED"
        state_reason = f"Module is locked. Prerequisite module #{node.sequence - 1} ({prereq_title or 'previous'}) must be completed first."
    elif node.status == NodeStatus.PENDING.value:
        effective_state = "AVAILABLE"
        state_reason = "Prerequisites satisfied. Ready to start module."
    elif solved_problems < required_evidence:
        effective_state = "NEEDS_EVIDENCE"
        state_reason = "Scholar AI needs more independent practice evidence before confirming this module."
    else:
        effective_state = "IN_PROGRESS"
        state_reason = "Practice evidence satisfied. Ready for Scholar AI competence verification."

    what_you_learn = MODULE_LEARNING_OBJECTIVES.get(
        node.topic,
        ["Core algorithmic invariants", "Complexity bounds", "Pattern application"]
    )

    can_complete = (
        solved_problems >= required_evidence
        and not node.is_locked
        and prereq_completed
        and not is_paused
        and not is_remediation
    )

    return {
        "id": node.id,
        "title": node.title,
        "topic": node.topic,
        "status": node.status,
        "effective_state": effective_state,
        "state_reason": state_reason,
        "sequence": node.sequence,
        "estimated_minutes": node.estimated_minutes,
        "is_locked": node.is_locked,
        "node_type": node.node_type,
        "what_you_learn": what_you_learn,
        "required_evidence": required_evidence,
        "current_evidence": solved_problems,
        "prerequisite_title": prereq_title,
        "prerequisite_completed": prereq_completed,
        "mastery_status": ("MASTERED" if mastery_record.correct else "NOT_MASTERED") if mastery_record else "NO_RECORD",
        "can_complete": can_complete,
    }


@router.post("/{student_id}/roadmap/{node_id}/verify-completion")
def verify_module_completion(student_id: str, node_id: str, db: Session = Depends(get_db)):
    """
    Evidence-based module completion:
    Evaluates real telemetry evidence, prerequisites, and Scholar AI pauses before allowing completion.
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
            detail=f"Roadmap node with ID '{node_id}' not found",
        )
    if node.is_locked:
        return {
            "allowed": False,
            "status": "LOCKED",
            "message": f"Module #{node.sequence} is locked. Complete prerequisite modules first.",
            "action": "COMPLETE_PREREQUISITE",
        }

    # Evaluate active Scholar AI adaptation
    adaptation = RoadmapAdaptationService.determine_adaptation(db, student_id, skip_apply=True)
    is_paused = adaptation and adaptation.action in ("PAUSE_ADVANCEMENT", "REMEDIATE_TOPIC")
    if is_paused:
        status_label = "REMEDIATION" if adaptation.action == "REMEDIATE_TOPIC" else "MASTERY_CHECK_REQUIRED"
        msg = (
            f"Your recent assessment indicates {node.topic} requires reinforcement before advancement."
            if adaptation.action == "REMEDIATE_TOPIC"
            else f"Scholar AI detected that additional mastery verification is required before advancement on {node.topic}."
        )
        return {
            "allowed": False,
            "status": status_label,
            "message": msg,
            "action": "COMPLETE_MASTERY_CHECK" if adaptation.action == "PAUSE_ADVANCEMENT" else "REMEDIATE",
        }

    # Evaluate telemetry evidence count
    events = db.query(CodingTelemetry).filter(
        CodingTelemetry.student_id == student_id,
        CodingTelemetry.topic == node.topic,
        CodingTelemetry.successful == True,
    ).all()
    solved_count = len(set(e.problem_id for e in events))
    required_count = 3 if "Sliding Window" in node.topic else 2

    if solved_count < required_count:
        return {
            "allowed": False,
            "status": "INSUFFICIENT_EVIDENCE",
            "message": f"Scholar AI needs more independent practice evidence before confirming this module ({solved_count}/{required_count} solved).",
            "current_evidence": solved_count,
            "required_evidence": required_count,
            "action": "PRACTICE",
        }

    # Evidence is satisfied -> complete node
    node.status = NodeStatus.COMPLETED.value
    node.is_locked = False

    nodes = (
        db.query(RoadmapNode)
        .filter(RoadmapNode.student_id == student_id)
        .order_by(RoadmapNode.sequence.asc())
        .all()
    )
    completed_count = sum(1 for n in nodes if n.status == NodeStatus.COMPLETED.value)
    student.roadmap_completion = round((completed_count / max(len(nodes), 1)) * 100.0, 1)

    next_nodes = [
        n for n in nodes
        if n.sequence > node.sequence and n.node_type == NodeType.NORMAL.value and n.status != NodeStatus.COMPLETED.value
    ]
    if next_nodes:
        next_nodes[0].status = NodeStatus.IN_PROGRESS.value
        next_nodes[0].is_locked = False

    db.commit()
    return {
        "allowed": True,
        "status": "COMPLETED",
        "message": f"Verified independent competence on {node.topic}! Module #{node.sequence} marked COMPLETED.",
        "nodes": RoadmapService.get_roadmap_for_student(db, student_id),
    }


@router.post("/{student_id}/roadmap/{node_id}/complete", response_model=List[RoadmapNodeResponse])
def complete_roadmap_node(
    student_id: str,
    node_id: str,
    force: bool = False,
    db: Session = Depends(get_db),
):
    """
    Evidence-Enforced Roadmap Node Completion:
    Bypassing evidence is strictly forbidden unless force=True is explicitly supplied
    for admin fixtures or benchmark setups.
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

    if not force:
        adaptation = RoadmapAdaptationService.determine_adaptation(db, student_id, skip_apply=True)
        is_paused = adaptation and adaptation.action in ("PAUSE_ADVANCEMENT", "REMEDIATE_TOPIC")
        if is_paused:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Advancement is paused by Scholar AI pending mastery verification on {node.topic}.",
            )

        if node.is_locked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete locked module #{node.sequence}. Complete prerequisite modules first.",
            )

        events = db.query(CodingTelemetry).filter(
            CodingTelemetry.student_id == student_id,
            CodingTelemetry.topic == node.topic,
            CodingTelemetry.successful == True,
        ).all()
        solved_count = len(set(e.problem_id for e in events))
        required_count = 3 if "Sliding Window" in node.topic else 2

        if solved_count < required_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete module without evidence: requires at least {required_count} solved problems on {node.topic} (currently {solved_count}).",
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
