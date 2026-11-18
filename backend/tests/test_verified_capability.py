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
from app.services.readiness_service import ReadinessService
from app.schemas.student import ReadinessStatus
from app.schemas.scholar import MasteryCheckRequest

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

def test_standard_readiness_not_automatically_verified_capability(db_session):
    """Test 1: Standard readiness is not automatically treated as verified capability."""
    resp = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    assert resp is not None
    # For Alex (false progress, unverified), verified capability is significantly lower than standard readiness
    assert resp.standard_readiness_score > resp.verified_capability_score
    assert resp.mastery_confidence_multiplier < 1.0

def test_false_progress_evidence_affects_verified_capability(db_session):
    """Test 2: False-progress evidence affects verified capability via the 0.5 multiplier penalty."""
    resp = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    assert resp.false_progress_detected is True
    assert "Sliding Window" in resp.unverified_topics
    assert resp.mastery_coverage == 0.0
    assert resp.mastery_confidence_multiplier == 0.5
    assert resp.readiness_status == ReadinessStatus.NOT_VERIFIED.value

def test_mastered_with_verified_assessment_counts_as_verified_evidence(client, db_session):
    """Test 3: MASTERED + VERIFIED_ASSESSMENT_SERVICE counts as verified evidence, lifting multiplier to 1.0."""
    # Step A: Take assessment and score 100 on Sliding Window
    client.post(
        "/api/students/student_alex/mastery-assessment/submit",
        json={"topic": "Sliding Window", "question_id": "sw_q01", "answer": "B"},
    )

    # Step B: Submit independent coding check (1 attempt, 0 hints, solved=true)
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

    # Step C: Evaluate verified capability
    resp = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    assert resp is not None
    assert "Sliding Window" in resp.verified_topics
    assert "Sliding Window" not in resp.unverified_topics
    assert resp.mastery_coverage == 1.0
    assert resp.mastery_confidence_multiplier == 1.0
    assert resp.verified_capability_score == resp.standard_readiness_score
    assert resp.readiness_status == ReadinessStatus.PARTIALLY_VERIFIED.value

def test_not_mastered_does_not_count_as_verified_evidence(client, db_session):
    """Test 4: NOT_MASTERED check does not count as verified evidence."""
    # Student attempts check with hints, resulting in NOT_MASTERED
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

    resp = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    assert "Sliding Window" in resp.unverified_topics
    assert "Sliding Window" not in resp.verified_topics
    assert resp.mastery_coverage == 0.0
    assert resp.mastery_confidence_multiplier == 0.5
    assert resp.readiness_status == ReadinessStatus.NOT_VERIFIED.value

def test_missing_mastery_evidence_does_not_become_zero_automatically(db_session):
    """Test 5: Missing telemetry is reported as INSUFFICIENT_EVIDENCE, not fabricated failure."""
    temp_id = f"sparse_test_{uuid.uuid4().hex[:6]}"
    student = Student(
        id=temp_id,
        name="Sparse Student",
        career_goal="Full-Stack",
        weekly_hours=10,
        current_streak=1,
        roadmap_completion=10.0,
    )
    db_session.add(student)

    # Add only 2 problems (< 5 threshold)
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

    resp = ReadinessService.evaluate_verified_capability(db_session, temp_id)
    assert resp is not None
    assert resp.readiness_status == ReadinessStatus.INSUFFICIENT_EVIDENCE.value
    assert resp.evidence_status == "INSUFFICIENT_EVIDENCE"
    metrics = {e.metric for e in resp.evidence}
    assert "telemetry_count" in metrics

def test_client_provided_conceptual_score_cannot_fabricate_readiness(db_session):
    """Test 6: Client-provided conceptual score cannot fabricate verified capability without assessment evidence."""
    # Ensure no verified assessment is in the assessment service ledger
    MasteryAssessmentService.clear_verified_scores()

    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=True,
        hints_used=0,
        attempts=1,
        conceptual_score=95.0,  # Fabricated client-provided score
    )
    MasteryService.evaluate_mastery(db_session, req)

    resp = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    # Even though check passed in direct mode, verified capability rejects client-supplied score!
    assert "Sliding Window" in resp.unverified_topics
    assert resp.mastery_coverage == 0.0
    assert resp.mastery_confidence_multiplier == 0.5

def test_mastery_coverage_is_deterministic(db_session):
    """Test 7: Mastery coverage strictly reflects verified_topics / required_topics."""
    resp = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    expected_coverage = len(resp.verified_topics) / (len(resp.verified_topics) + len(resp.unverified_topics))
    assert resp.mastery_coverage == round(expected_coverage, 3)

def test_confidence_multiplier_follows_formula(db_session):
    """Test 8: Confidence multiplier strictly follows 0.5 + (0.5 * mastery_coverage)."""
    resp = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    expected_multiplier = round(0.5 + (0.5 * resp.mastery_coverage), 3)
    assert resp.mastery_confidence_multiplier == expected_multiplier

def test_same_evidence_produces_same_score(db_session):
    """Test 9: Deterministic evaluation repeatability on identical state."""
    resp1 = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    resp2 = ReadinessService.evaluate_verified_capability(db_session, "student_alex")

    assert resp1.standard_readiness_score == resp2.standard_readiness_score
    assert resp1.verified_capability_score == resp2.verified_capability_score
    assert resp1.mastery_coverage == resp2.mastery_coverage
    assert resp1.mastery_confidence_multiplier == resp2.mastery_confidence_multiplier
    assert resp1.readiness_status == resp2.readiness_status

def test_alex_result_traceable_to_backend_evidence(client):
    """Test 10: Alex's verified capability response is traceable to backend evidence via API."""
    resp = client.get("/api/students/student_alex/verified-capability")
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == "student_alex"
    assert data["false_progress_detected"] is True
    assert "Sliding Window" in data["unverified_topics"]
    assert data["readiness_status"] == ReadinessStatus.NOT_VERIFIED.value
    assert len(data["limitations"]) > 0

def test_priya_result_traceable_to_backend_evidence(client):
    """Test 11: Priya's verified capability reflects genuine mastery without false inflation."""
    resp = client.get("/api/students/student_priya/verified-capability")
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == "student_priya"
    assert data["false_progress_detected"] is False
    assert len(data["unverified_topics"]) == 0
    assert data["mastery_coverage"] == 1.0
    assert data["mastery_confidence_multiplier"] == 1.0
    # Priya has verified capability score equal to standard readiness
    assert data["verified_capability_score"] == data["standard_readiness_score"]
    # But because 34.9 < 80.0, she is PARTIALLY_VERIFIED rather than prematurely labelled job ready
    assert data["readiness_status"] == ReadinessStatus.PARTIALLY_VERIFIED.value

def test_unknown_student_returns_404(client):
    """Test 12: Unknown student returns 404."""
    resp = client.get("/api/students/unknown_student/verified-capability")
    assert resp.status_code == 404

def test_no_answer_key_or_explanation_leaks(client):
    """Test 13: Security check - ensure no assessment answer keys leak in verified capability."""
    resp = client.get("/api/students/student_alex/verified-capability")
    assert resp.status_code == 200
    text_content = resp.text
    assert "correct_answer" not in text_content
    assert "expected_concept" not in text_content
    assert "answer_key" not in text_content
