import sys
import os
import pytest
from datetime import datetime, timezone
import uuid
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal
from app.models.student import Student
from app.models.problem import CodingTelemetry
from app.models.scholar import MasteryCheck, ScholarIntervention
from app.services.mastery_service import MasteryService
from app.services.mastery_assessment_service import MasteryAssessmentService
from app.services.scholar_orchestrator_service import ScholarOrchestratorService
from app.schemas.scholar import ScholarAction

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

@pytest.fixture(autouse=True)
def clean_mastery_state(db_session):
    MasteryService.clear_latest_checks()
    MasteryAssessmentService.clear_verified_scores()
    checks = (
        db_session.query(MasteryCheck)
        .join(ScholarIntervention)
        .filter(ScholarIntervention.student_id == "student_alex")
        .all()
    )
    for c in checks:
        c.passed = None
        c.score = None
        c.student_answer = None
    db_session.commit()
    yield
    MasteryService.clear_latest_checks()
    MasteryAssessmentService.clear_verified_scores()
    checks = (
        db_session.query(MasteryCheck)
        .join(ScholarIntervention)
        .filter(ScholarIntervention.student_id == "student_alex")
        .all()
    )
    for c in checks:
        c.passed = None
        c.score = None
        c.student_answer = None
    db_session.commit()

def test_alex_state_correctly_exposes_false_progress(db_session):
    """Test 1: Alex's state accurately surfaces false-progress diagnostic and unverified capability."""
    state = ScholarOrchestratorService.get_student_state(db_session, "student_alex")
    assert state is not None
    assert state.student_id == "student_alex"
    assert state.false_progress.detected is True
    assert state.false_progress.severity == "CRITICAL"
    assert state.false_progress.index >= 75.0
    assert "FP_HINT_CRUTCH" in state.false_progress.triggers
    assert state.intervention.required is True
    assert "Sliding Window" in state.intervention.target_topics
    assert state.capability.readiness_status == "NOT_VERIFIED"
    assert len(state.evidence_chain) >= 5

def test_alex_unverified_mastery_produces_complete_mastery_check(db_session):
    """Test 2: Alex with unverified mastery produces COMPLETE_MASTERY_CHECK."""
    action = ScholarOrchestratorService.get_next_action(db_session, "student_alex")
    assert action is not None
    assert action.action == ScholarAction.COMPLETE_MASTERY_CHECK.value
    assert action.target_topic == "Sliding Window"
    assert "FALSE_PROGRESS_DIAGNOSTIC" in action.source_components
    assert "ROADMAP_ADAPTATION" in action.source_components

def test_alex_real_mastered_result_produces_resume_roadmap(client, db_session):
    """Test 3: Alex with a real verified MASTERED check produces RESUME_ROADMAP."""
    # Step A: Pass verified assessment
    client.post(
        "/api/students/student_alex/mastery-assessment/submit",
        json={"topic": "Sliding Window", "question_id": "sw_q01", "answer": "B"},
    )
    # Step B: Pass independent problem check
    client.post(
        "/api/students/student_alex/mastery-check",
        json={
            "student_id": "student_alex",
            "topic": "Sliding Window",
            "problem_id": "prob_sw_02",
            "solved": True,
            "hints_used": 0,
            "attempts": 1,
            "conceptual_score": None,
        },
    )

    action = ScholarOrchestratorService.get_next_action(db_session, "student_alex")
    assert action is not None
    assert action.action == ScholarAction.RESUME_ROADMAP.value
    assert action.target_topic == "Sliding Window"
    assert "VERIFIED_ASSESSMENT_SERVICE" in action.source_components
    assert "MASTERY_CHECK" in action.source_components

def test_not_mastered_produces_complete_remediation(client, db_session):
    """Test 4: NOT_MASTERED check produces COMPLETE_REMEDIATION."""
    # Step A: Submit wrong answer on assessment
    client.post(
        "/api/students/student_alex/mastery-assessment/submit",
        json={"topic": "Sliding Window", "question_id": "sw_q01", "answer": "A"},
    )

    # Step B: Attempt check with multiple attempts and hints
    client.post(
        "/api/students/student_alex/mastery-check",
        json={
            "student_id": "student_alex",
            "topic": "Sliding Window",
            "problem_id": "prob_sw_02",
            "solved": True,
            "hints_used": 2,
            "attempts": 2,
            "conceptual_score": None,
        },
    )

    action = ScholarOrchestratorService.get_next_action(db_session, "student_alex")
    assert action is not None
    assert action.action == ScholarAction.COMPLETE_REMEDIATION.value
    assert action.target_topic == "Sliding Window"
    assert "remediation is required" in action.reason.lower()

def test_priya_produces_continue_learning(db_session):
    """Test 5: Priya (genuine mastery archetype) produces CONTINUE_LEARNING."""
    action = ScholarOrchestratorService.get_next_action(db_session, "student_priya")
    assert action is not None
    assert action.action == ScholarAction.CONTINUE_LEARNING.value
    assert action.target_topic is None
    assert "genuine independent problem solving" in action.reason

def test_insufficient_telemetry_produces_collect_more_evidence(db_session):
    """Test 6: Insufficient telemetry (< 5 problems) produces COLLECT_MORE_EVIDENCE."""
    temp_id = f"orch_sparse_{uuid.uuid4().hex[:6]}"
    student = Student(
        id=temp_id,
        name="Sparse Student",
        career_goal="Backend",
        weekly_hours=10,
        current_streak=1,
        roadmap_completion=5.0,
    )
    db_session.add(student)

    # Ingest only 2 problem events
    for _ in range(2):
        telem = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:8]}",
            student_id=temp_id,
            topic="Arrays",
            difficulty="Easy",
            submission_count=1,
            successful=True,
            first_attempt_pass=True,
            hints_requested=0,
            active_coding_duration_seconds=300,
            timestamp=datetime.now(timezone.utc),
        )
        db_session.add(telem)
    db_session.commit()

    action = ScholarOrchestratorService.get_next_action(db_session, temp_id)
    assert action is not None
    assert action.action == ScholarAction.COLLECT_MORE_EVIDENCE.value
    assert "minimum 5 problem submissions required" in action.reason

def test_missing_mastery_does_not_become_zero(db_session):
    """Test 7: Missing mastery check remains NO_RECORDED_CHECK and conceptual_score is null, not 0.0."""
    state = ScholarOrchestratorService.get_student_state(db_session, "student_alex")
    assert state.mastery.status == "NO_RECORDED_CHECK"
    assert state.mastery.conceptual_score is None
    assert state.mastery.decision is None

def test_action_reason_matches_actual_evidence(db_session):
    """Test 8: Action reason contains strictly grounded terms, without emotional or unverified language."""
    action = ScholarOrchestratorService.get_next_action(db_session, "student_alex")
    assert "Sliding Window" in action.reason
    assert "mastery verification" in action.reason
    forbidden_words = ["frustrated", "struggling lately", "job-ready", "forgot", "probably"]
    for word in forbidden_words:
        assert word not in action.reason.lower()

def test_target_topic_comes_from_actual_evidence(db_session):
    """Test 9: Target topic is strictly derived from intervention or diagnostic evidence."""
    alex_action = ScholarOrchestratorService.get_next_action(db_session, "student_alex")
    assert alex_action.target_topic == "Sliding Window"

    priya_action = ScholarOrchestratorService.get_next_action(db_session, "student_priya")
    assert priya_action.target_topic is None

def test_unknown_student_returns_404(client):
    """Test 10: Unknown student returns 404 for state and next-action endpoints."""
    resp1 = client.get("/api/students/non_existent_student/scholar/state")
    assert resp1.status_code == 404

    resp2 = client.get("/api/students/non_existent_student/scholar/next-action")
    assert resp2.status_code == 404

def test_client_cannot_inject_state_or_action_values(client):
    """Test 11: Endpoints are strictly read-only GET endpoints; POST/PUT attempts fail."""
    resp_post = client.post("/api/students/student_alex/scholar/state", json={"fake_status": "READY"})
    assert resp_post.status_code in (404, 405)

    resp_put = client.put("/api/students/student_alex/scholar/next-action", json={"action": "HIRED"})
    assert resp_put.status_code in (404, 405)

def test_no_assessment_answer_key_or_explanation_leaks(client):
    """Test 12: Security check - ensure no answer keys or internal concept notes leak in orchestrator payloads."""
    state_resp = client.get("/api/students/student_alex/scholar/state")
    assert state_resp.status_code == 200
    assert "correct_answer" not in state_resp.text
    assert "expected_concept" not in state_resp.text

    action_resp = client.get("/api/students/student_alex/scholar/next-action")
    assert action_resp.status_code == 200
    assert "correct_answer" not in action_resp.text
    assert "expected_concept" not in action_resp.text

def test_deterministic_action_repeatability(db_session):
    """Test 13: Identical backend evidence produces identically reproducible action payloads."""
    action_1 = ScholarOrchestratorService.get_next_action(db_session, "student_alex")
    action_2 = ScholarOrchestratorService.get_next_action(db_session, "student_alex")

    assert action_1.action == action_2.action
    assert action_1.target_topic == action_2.target_topic
    assert action_1.reason == action_2.reason
    assert action_1.source_components == action_2.source_components
