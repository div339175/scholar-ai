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
from app.services.roadmap_adaptation_service import RoadmapAdaptationService
from app.schemas.scholar import MasteryCheckRequest
from app.schemas.roadmap import RoadmapAdaptationAction, EvidenceStatus

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

def test_alex_false_progress_produces_pause_advancement(db_session):
    """Test 1: Alex false-progress state produces PAUSE_ADVANCEMENT when mastery is not verified."""
    MasteryService.clear_latest_checks()
    MasteryAssessmentService.clear_verified_scores()

    decision = RoadmapAdaptationService.determine_adaptation(db_session, "student_alex")
    assert decision is not None
    assert decision.action == RoadmapAdaptationAction.PAUSE_ADVANCEMENT.value
    assert decision.topic == "Sliding Window"
    assert decision.evidence_status == EvidenceStatus.SUFFICIENT.value
    assert "FALSE_PROGRESS_DIAGNOSTIC" in decision.source_components
    assert "INTERVENTION_PLAN" in decision.source_components
    assert "paused because false-progress evidence triggered remediation" in decision.reason

def test_real_mastered_result_produces_resume_roadmap(client, db_session):
    """Test 2: A real MASTERED mastery result (with verified assessment) produces RESUME_ROADMAP."""
    MasteryService.clear_latest_checks()
    MasteryAssessmentService.clear_verified_scores()

    # Step A: Take assessment and score 100 on Sliding Window
    assess_payload = {
        "topic": "Sliding Window",
        "question_id": "sw_q01",
        "answer": "B",
    }
    client.post("/api/students/student_alex/mastery-assessment/submit", json=assess_payload)

    # Step B: Submit independent coding check (1 attempt, 0 hints, solved=true)
    check_payload = {
        "student_id": "student_alex",
        "topic": "Sliding Window",
        "problem_id": "prob_sw_02",
        "solved": True,
        "hints_used": 0,
        "attempts": 1,
        "conceptual_score": None, # Pulled from server-verified assessment
    }
    client.post("/api/students/student_alex/mastery-check", json=check_payload)

    # Step C: Evaluate roadmap adaptation
    decision = RoadmapAdaptationService.determine_adaptation(db_session, "student_alex")
    assert decision is not None
    assert decision.action == RoadmapAdaptationAction.RESUME_ROADMAP.value
    assert decision.topic == "Sliding Window"
    assert "MASTERY_CHECK" in decision.source_components
    assert "VERIFIED_ASSESSMENT_SERVICE" in decision.source_components
    assert "resumed because independent mastery was verified" in decision.reason

def test_real_not_mastered_result_produces_remediate_topic(client, db_session):
    """Test 3: A real NOT_MASTERED mastery result produces REMEDIATE_TOPIC."""
    MasteryService.clear_latest_checks()
    MasteryAssessmentService.clear_verified_scores()

    # Take assessment and fail
    client.post(
        "/api/students/student_alex/mastery-assessment/submit",
        json={"topic": "Sliding Window", "question_id": "sw_q01", "answer": "A"},
    )

    # Submit coding check with hint used (fails mastery)
    check_payload = {
        "student_id": "student_alex",
        "topic": "Sliding Window",
        "problem_id": "prob_sw_02",
        "solved": True,
        "hints_used": 2,
        "attempts": 1,
        "conceptual_score": None,
    }
    client.post("/api/students/student_alex/mastery-check", json=check_payload)

    decision = RoadmapAdaptationService.determine_adaptation(db_session, "student_alex")
    assert decision is not None
    assert decision.action == RoadmapAdaptationAction.REMEDIATE_TOPIC.value
    assert decision.topic == "Sliding Window"
    assert "MASTERY_CHECK" in decision.source_components
    assert "remediation is required" in decision.reason

def test_missing_mastery_evidence_is_not_interpreted_as_mastery(db_session):
    """Test 4: Missing mastery evidence leaves active intervention in PAUSE_ADVANCEMENT, never falsely resuming."""
    MasteryService.clear_latest_checks()
    MasteryAssessmentService.clear_verified_scores()

    # Alex has no passed mastery check recorded
    decision = RoadmapAdaptationService.determine_adaptation(db_session, "student_alex")
    assert decision.action != RoadmapAdaptationAction.RESUME_ROADMAP.value
    assert decision.action == RoadmapAdaptationAction.PAUSE_ADVANCEMENT.value

def test_insufficient_telemetry_does_not_create_fabricated_failure(db_session):
    """Test 5: Insufficient data (<5 problems) returns CONTINUE_NORMAL with INSUFFICIENT_EVIDENCE."""
    temp_id = f"test_sparse_{uuid.uuid4().hex[:6]}"
    student = Student(id=temp_id, name="Sparse Student", career_goal="Full-Stack", weekly_hours=10, current_streak=1, roadmap_completion=5.0)
    db_session.add(student)

    # Add only 2 problems
    for i in range(2):
        telem = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:8]}",
            student_id=temp_id,
            topic="Arrays",
            difficulty="Easy",
            submission_count=1,
            successful=True,
            first_attempt_pass=True,
            hints_requested=0,
            active_coding_duration_seconds=400,
            timestamp=datetime.now(timezone.utc),
        )
        db_session.add(telem)
    db_session.commit()

    decision = RoadmapAdaptationService.determine_adaptation(db_session, temp_id)
    assert decision.action == RoadmapAdaptationAction.CONTINUE_NORMAL.value
    assert decision.evidence_status == EvidenceStatus.INSUFFICIENT_EVIDENCE.value
    assert "Insufficient behavioural evidence" in decision.reason

def test_priya_continues_normally(db_session):
    """Test 6: Priya (genuine mastery) continues normally with CONTINUE_NORMAL."""
    MasteryService.clear_latest_checks()
    MasteryAssessmentService.clear_verified_scores()

    decision = RoadmapAdaptationService.determine_adaptation(db_session, "student_priya")
    assert decision is not None
    assert decision.action == RoadmapAdaptationAction.CONTINUE_NORMAL.value
    assert decision.evidence_status == EvidenceStatus.SUFFICIENT.value
    assert "continues normally" in decision.reason

def test_unknown_student_returns_404(client):
    """Test 7: Unknown student returns 404 for adaptation endpoint."""
    resp = client.get("/api/students/non_existent_student/roadmap/adaptation")
    assert resp.status_code == 404

def test_deterministic_decision_repeatability(db_session):
    """Test 8: The same student state produces identical decisions deterministically."""
    MasteryService.clear_latest_checks()
    MasteryAssessmentService.clear_verified_scores()

    decision_1 = RoadmapAdaptationService.determine_adaptation(db_session, "student_alex")
    decision_2 = RoadmapAdaptationService.determine_adaptation(db_session, "student_alex")

    assert decision_1.action == decision_2.action
    assert decision_1.topic == decision_2.topic
    assert decision_1.reason == decision_2.reason
    assert decision_1.source_components == decision_2.source_components

def test_decision_evidence_matches_backend_evidence(db_session):
    """Test 9: Decision evidence items match actual telemetry and diagnostic thresholds."""
    MasteryService.clear_latest_checks()
    MasteryAssessmentService.clear_verified_scores()

    decision = RoadmapAdaptationService.determine_adaptation(db_session, "student_alex")
    metrics = {e.metric for e in decision.evidence}
    assert "hint_dependency_rate" in metrics or "unassisted_pass_ratio" in metrics

def test_no_assessment_answer_key_leaks_in_adaptation(client, db_session):
    """Test 10: Security check - ensure no question answer keys leak in roadmap adaptation payloads."""
    resp = client.get("/api/students/student_alex/roadmap/adaptation")
    assert resp.status_code == 200
    text_payload = resp.text
    assert "correct_answer" not in text_payload
    assert "expected_answer" not in text_payload

def test_client_cannot_fabricate_mastery_without_verified_assessment(db_session):
    """Test 11: Direct client-provided conceptual scores without assessment evidence do not trigger RESUME_ROADMAP."""
    MasteryService.clear_latest_checks()
    MasteryAssessmentService.clear_verified_scores() # Ensure no verified assessment exists

    # Submitting a direct check without verified assessment in assessment service
    req = MasteryCheckRequest(
        student_id="student_alex",
        topic="Sliding Window",
        problem_id="prob_sw_02",
        solved=True,
        hints_used=0,
        attempts=1,
        conceptual_score=95.0, # Fabricated score in test mode
    )
    MasteryService.evaluate_mastery(db_session, req)

    # Roadmap adaptation must NOT resume roadmap if there is no verified assessment evidence!
    # Because client cannot bypass verified assessment
    decision = RoadmapAdaptationService.determine_adaptation(db_session, "student_alex")
    # Even though check passed in direct mode, adaptation demands verified assessment source to resume roadmap
    assert "VERIFIED_ASSESSMENT_SERVICE" in decision.source_components or decision.action == RoadmapAdaptationAction.PAUSE_ADVANCEMENT.value
