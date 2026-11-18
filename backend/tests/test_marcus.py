import sys
import os
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal
from app.models.student import Student
from app.models.problem import CodingTelemetry
from app.models.roadmap import RoadmapNode, NodeType, NodeStatus
from app.models.scholar import MasteryAssessmentRecord
from app.services.false_progress_detector import FalseProgressDetector
from app.services.readiness_service import ReadinessService
from app.services.roadmap_adaptation_service import RoadmapAdaptationService
from app.services.roadmap_service import RoadmapService
from app.services.scholar_orchestrator_service import ScholarOrchestratorService
from app.services.scholar_conversation_service import ScholarConversationService
from app.services.mastery_assessment_service import MasteryAssessmentService
from app.schemas.scholar import (
    ScholarAction,
    MasteryAssessmentSubmission,
)
from app.schemas.roadmap import (
    RoadmapAdaptationDecision,
    RoadmapAdaptationAction,
)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_marcus_exists_and_has_sparse_telemetry(db_session):
    """Test 1: Marcus exists in DB and has sparse telemetry (< 5 submissions)."""
    marcus = db_session.query(Student).filter(Student.id == "student_marcus").first()
    assert marcus is not None
    assert marcus.name == "Marcus Vance"
    assert marcus.career_goal == "Full-Stack Developer"

    telemetry = (
        db_session.query(CodingTelemetry)
        .filter(CodingTelemetry.student_id == "student_marcus")
        .all()
    )
    assert len(telemetry) < 5
    assert len(telemetry) == 2

def test_marcus_fpde_clean(db_session):
    """Test 2: Marcus has no false progress due to sparse telemetry (< 5 threshold)."""
    diag = FalseProgressDetector.analyze_student(db_session, "student_marcus")
    assert diag.student_id == "student_marcus"
    assert diag.is_false_progress is False
    assert diag.false_progress_index == 0.0
    assert diag.trigger_codes == []
    assert diag.affected_topics == []
    assert "insufficient" in diag.diagnosis.lower()

def test_marcus_readiness_insufficient_evidence(db_session):
    """Test 3: Marcus capability evaluation returns INSUFFICIENT_EVIDENCE."""
    cap = ReadinessService.evaluate_verified_capability(db_session, "student_marcus")
    assert cap.student_id == "student_marcus"
    assert cap.readiness_status == "INSUFFICIENT_EVIDENCE"
    assert cap.evidence_status == "INSUFFICIENT_EVIDENCE"
    assert cap.mastery_coverage == 0.0

def test_marcus_roadmap_insufficient_evidence(db_session):
    """Test 4: Marcus roadmap adaptation reports CONTINUE_NORMAL with INSUFFICIENT_EVIDENCE."""
    adaptation = RoadmapAdaptationService.determine_adaptation(db_session, "student_marcus")
    assert adaptation.student_id == "student_marcus"
    assert adaptation.action == "CONTINUE_NORMAL"
    assert adaptation.evidence_status == "INSUFFICIENT_EVIDENCE"
    assert "insufficient" in adaptation.reason.lower()

def test_marcus_scholar_next_action_collect_more_evidence(db_session):
    """Test 5: Marcus Scholar next action is COLLECT_MORE_EVIDENCE with target_topic=None."""
    action = ScholarOrchestratorService.get_next_action(db_session, "student_marcus")
    assert action is not None
    assert action.student_id == "student_marcus"
    assert action.action == ScholarAction.COLLECT_MORE_EVIDENCE.value
    assert action.target_topic is None
    assert "minimum 5 problem submissions" in action.reason

def test_marcus_scholar_response_and_chat_endpoints(client):
    """Test 6: Marcus API endpoints return honest COLLECT_MORE_EVIDENCE without fabricated claims."""
    # State endpoint
    state_res = client.get("/api/students/student_marcus/scholar/state")
    assert state_res.status_code == 200
    state = state_res.json()
    assert state["roadmap"]["evidence_status"] == "INSUFFICIENT_EVIDENCE"
    assert state["capability"]["readiness_status"] == "INSUFFICIENT_EVIDENCE"

    # Next action endpoint
    action_res = client.get("/api/students/student_marcus/scholar/next-action")
    assert action_res.status_code == 200
    action = action_res.json()
    assert action["action"] == "COLLECT_MORE_EVIDENCE"
    assert action["target_topic"] is None

    # Scholar response endpoint
    resp_res = client.get("/api/students/student_marcus/scholar/response")
    assert resp_res.status_code == 200
    resp_data = resp_res.json()
    assert resp_data["action"] == "COLLECT_MORE_EVIDENCE"
    assert resp_data["target_topic"] is None
    resp_str = str(resp_data).lower()
    assert "genuine mastery" not in resp_str
    assert "mastery verified" not in resp_str

    # Chat endpoint
    chat_res = client.post(
        "/api/students/student_marcus/scholar/chat",
        json={"student_id": "student_marcus", "message": "What should I do next?"},
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["action"] == "COLLECT_MORE_EVIDENCE"
    assert "telemetry" in chat_data["response"].lower() or "practice" in chat_data["response"].lower() or "evidence" in chat_data["response"].lower()

def test_mastery_assessment_persists_across_cache_clear(db_session):
    """Test 7: Verified conceptual assessment scores persist to SQLite and survive in-memory cache clearing."""
    eval_result = MasteryAssessmentService.evaluate_answer(
        student_id="student_marcus",
        topic="Sliding Window",
        question_id="sw_q01",
        answer="B",
        db=db_session,
    )
    assert eval_result is not None
    assert eval_result.correct is True
    assert eval_result.score == 100.0

    # Verify SQLite record directly
    db_record = (
        db_session.query(MasteryAssessmentRecord)
        .filter(
            MasteryAssessmentRecord.student_id == "student_marcus",
            MasteryAssessmentRecord.topic == "Sliding Window",
        )
        .first()
    )
    assert db_record is not None
    assert db_record.score == 100.0
    assert db_record.correct is True

    # Clear in-memory cache completely
    from app.services.mastery_assessment_service import _VERIFIED_ASSESSMENT_SCORES
    _VERIFIED_ASSESSMENT_SCORES.clear()
    assert ("student_marcus", "Sliding Window") not in _VERIFIED_ASSESSMENT_SCORES

    # Query get_verified_score - MUST read from SQLite database
    persisted_score = MasteryAssessmentService.get_verified_score(
        "student_marcus", "Sliding Window", db=db_session
    )
    assert persisted_score == 100.0

    # Cleanup marcus assessment record from DB
    db_session.delete(db_record)
    db_session.commit()
    MasteryAssessmentService.clear_verified_scores(db_session)

def test_roadmap_adaptation_database_node_mutations(db_session):
    """Test 8: Database node mutations persist for PAUSE_ADVANCEMENT, REMEDIATE_TOPIC, and RESUME_ROADMAP."""
    # Test PAUSE_ADVANCEMENT
    pause_decision = RoadmapAdaptationDecision(
        student_id="student_marcus",
        action=RoadmapAdaptationAction.PAUSE_ADVANCEMENT.value,
        topic="Arrays & Hashing",
        reason="Test pause",
        evidence_status="SUFFICIENT",
        source_components=["TEST"],
    )
    RoadmapAdaptationService.apply_adaptation_to_nodes(db_session, "student_marcus", pause_decision)

    # In-progress uncompleted nodes should be locked
    marcus_nodes = (
        db_session.query(RoadmapNode)
        .filter(RoadmapNode.student_id == "student_marcus")
        .order_by(RoadmapNode.sequence)
        .all()
    )
    downstream = [n for n in marcus_nodes if n.sequence > 1]
    assert all(n.is_locked is True for n in downstream)

    # Test REMEDIATE_TOPIC
    remediate_decision = RoadmapAdaptationDecision(
        student_id="student_marcus",
        action=RoadmapAdaptationAction.REMEDIATE_TOPIC.value,
        topic="Arrays & Hashing",
        reason="Test remediation",
        evidence_status="SUFFICIENT",
        source_components=["TEST"],
    )
    RoadmapAdaptationService.apply_adaptation_to_nodes(db_session, "student_marcus", remediate_decision)

    remed_node = (
        db_session.query(RoadmapNode)
        .filter(
            RoadmapNode.student_id == "student_marcus",
            RoadmapNode.node_type == NodeType.REMEDIATION.value,
        )
        .first()
    )
    assert remed_node is not None
    assert remed_node.status == NodeStatus.IN_PROGRESS.value
    assert remed_node.is_locked is False

    # Test RESUME_ROADMAP
    resume_decision = RoadmapAdaptationDecision(
        student_id="student_marcus",
        action=RoadmapAdaptationAction.RESUME_ROADMAP.value,
        topic="Arrays & Hashing",
        reason="Test resume",
        evidence_status="SUFFICIENT",
        source_components=["TEST"],
    )
    RoadmapAdaptationService.apply_adaptation_to_nodes(db_session, "student_marcus", resume_decision)

    # Remediation node should now be COMPLETED
    db_session.refresh(remed_node)
    assert remed_node.status == NodeStatus.COMPLETED.value

    # Next normal node should be unlocked and IN_PROGRESS
    next_normal = (
        db_session.query(RoadmapNode)
        .filter(
            RoadmapNode.student_id == "student_marcus",
            RoadmapNode.node_type == NodeType.NORMAL.value,
            RoadmapNode.sequence == 2,
        )
        .first()
    )
    assert next_normal.is_locked is False
    assert next_normal.status == NodeStatus.IN_PROGRESS.value

    # Clean up remediation node to leave Marcus clean
    db_session.delete(remed_node)
    # Reset node 2 to locked/pending
    next_normal.is_locked = True
    next_normal.status = NodeStatus.PENDING.value
    db_session.commit()
