import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal
from app.schemas.scholar import (
    MasteryCheckRequest,
    MasteryDecision,
    RoadmapAction,
)
from app.services.mastery_service import MasteryService

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

def test_successful_independent_first_attempt_solve_passes(db_session):
    """Test 1: Solved + 0 hints + 1 attempt + conceptual_score >= 80 passes."""
    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=True,
        hints_used=0,
        attempts=1,
        conceptual_score=90.0,
    )
    result = MasteryService.evaluate_mastery(db_session, req)
    assert result.passed is True
    assert result.decision == MasteryDecision.MASTERED.value
    assert result.independent is True

def test_hint_usage_fails_mastery(db_session):
    """Test 2: Any hint usage fails mastery."""
    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=True,
        hints_used=1,
        attempts=1,
        conceptual_score=90.0,
    )
    result = MasteryService.evaluate_mastery(db_session, req)
    assert result.passed is False
    assert result.decision == MasteryDecision.NOT_MASTERED.value
    assert result.independent is False

def test_multiple_attempts_fail_mastery(db_session):
    """Test 3: Multiple attempts (>1) fail mastery."""
    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=True,
        hints_used=0,
        attempts=2,
        conceptual_score=90.0,
    )
    result = MasteryService.evaluate_mastery(db_session, req)
    assert result.passed is False
    assert result.decision == MasteryDecision.NOT_MASTERED.value
    assert result.independent is False

def test_conceptual_score_below_80_fails_mastery(db_session):
    """Test 4: Conceptual score < 80 fails mastery even if coding problem was solved independently."""
    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=True,
        hints_used=0,
        attempts=1,
        conceptual_score=75.0,
    )
    result = MasteryService.evaluate_mastery(db_session, req)
    assert result.passed is False
    assert result.decision == MasteryDecision.NOT_MASTERED.value
    assert result.independent is True  # problem solved independently, but concept below threshold

def test_missing_conceptual_score_returns_insufficient_evidence(db_session):
    """Test 5: Missing conceptual_score returns INSUFFICIENT_EVIDENCE."""
    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=True,
        hints_used=0,
        attempts=1,
        conceptual_score=None,
    )
    result = MasteryService.evaluate_mastery(db_session, req)
    assert result.passed is False
    assert result.decision == MasteryDecision.INSUFFICIENT_EVIDENCE.value
    assert result.next_action == RoadmapAction.COLLECT_MORE_EVIDENCE.value
    assert result.mastery_score is None

def test_missing_hint_data_returns_insufficient_evidence(db_session):
    """Test 6: Missing hint data returns INSUFFICIENT_EVIDENCE."""
    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=True,
        hints_used=None,
        attempts=1,
        conceptual_score=85.0,
    )
    result = MasteryService.evaluate_mastery(db_session, req)
    assert result.passed is False
    assert result.decision == MasteryDecision.INSUFFICIENT_EVIDENCE.value
    assert result.next_action == RoadmapAction.COLLECT_MORE_EVIDENCE.value

def test_missing_attempt_data_returns_insufficient_evidence(db_session):
    """Test 7: Missing attempt data returns INSUFFICIENT_EVIDENCE."""
    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=True,
        hints_used=0,
        attempts=None,
        conceptual_score=85.0,
    )
    result = MasteryService.evaluate_mastery(db_session, req)
    assert result.passed is False
    assert result.decision == MasteryDecision.INSUFFICIENT_EVIDENCE.value
    assert result.next_action == RoadmapAction.COLLECT_MORE_EVIDENCE.value

def test_mastery_score_calculation(db_session):
    """Test 8: Verify exact mastery formula: 0.6 * independent_success + 0.4 * conceptual_score."""
    # Independent pass: 0.6 * 100 + 0.4 * 90 = 96.0
    req_pass = MasteryCheckRequest(
        student_id="student_priya",
        topic="Dynamic Programming",
        problem_id="prob_dp_03",
        solved=True,
        hints_used=0,
        attempts=1,
        conceptual_score=90.0,
    )
    res_pass = MasteryService.evaluate_mastery(db_session, req_pass)
    assert res_pass.mastery_score == 96.0

    # Non-independent (hints used): 0.6 * 0 + 0.4 * 90 = 36.0
    req_hint = MasteryCheckRequest(
        student_id="student_alex",
        topic="Dynamic Programming",
        problem_id="prob_dp_03",
        solved=True,
        hints_used=1,
        attempts=1,
        conceptual_score=90.0,
    )
    res_hint = MasteryService.evaluate_mastery(db_session, req_hint)
    assert res_hint.mastery_score == 36.0

def test_pass_returns_resume_roadmap(db_session):
    """Test 9: Passing mastery check returns next_action=RESUME_ROADMAP."""
    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=True,
        hints_used=0,
        attempts=1,
        conceptual_score=85.0,
    )
    result = MasteryService.evaluate_mastery(db_session, req)
    assert result.next_action == RoadmapAction.RESUME_ROADMAP.value

def test_fail_returns_continue_remediation(db_session):
    """Test 10: Failing mastery check returns next_action=CONTINUE_REMEDIATION."""
    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=False,
        hints_used=2,
        attempts=3,
        conceptual_score=50.0,
    )
    result = MasteryService.evaluate_mastery(db_session, req)
    assert result.next_action == RoadmapAction.CONTINUE_REMEDIATION.value

def test_api_mastery_check_post_and_get_status(client):
    """Test 11: Verify API endpoint POST /api/students/{id}/mastery-check and GET status."""
    payload = {
        "student_id": "student_alex",
        "topic": "Sliding Window",
        "problem_id": "prob_sw_02",
        "solved": True,
        "hints_used": 0,
        "attempts": 1,
        "conceptual_score": 92.0,
    }
    resp = client.post("/api/students/student_alex/mastery-check", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == "student_alex"
    assert data["passed"] is True
    assert data["decision"] == "MASTERED"
    assert data["next_action"] == "RESUME_ROADMAP"
    assert data["mastery_score"] == 96.8
    assert len(data["evidence"]) >= 4

    # Now verify GET status retrieves latest check
    status_resp = client.get("/api/students/student_alex/mastery-check/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "RECORDED"
    assert status_data["latest_result"]["decision"] == "MASTERED"

def test_unknown_student_returns_404(client):
    """Test 12: Verify unknown student returns 404 for both mastery endpoints."""
    payload = {
        "student_id": "unknown_student",
        "topic": "Sliding Window",
        "problem_id": "prob_sw_02",
        "solved": True,
        "hints_used": 0,
        "attempts": 1,
        "conceptual_score": 90.0,
    }
    resp_post = client.post("/api/students/unknown_student/mastery-check", json=payload)
    assert resp_post.status_code == 404

    resp_get = client.get("/api/students/unknown_student/mastery-check/status")
    assert resp_get.status_code == 404
