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
from app.services.scholar_response_service import ScholarResponseService
from app.services.readiness_service import ReadinessService
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

# 1. Alex response produces COMPLETE_MASTERY_CHECK, target_topic == Sliding Window, non-empty knowledge
def test_alex_response_complete_mastery_check(client):
    res = client.get("/api/students/student_alex/scholar/response")
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == "student_alex"
    assert data["action"] == ScholarAction.COMPLETE_MASTERY_CHECK.value
    assert data["target_topic"] == "Sliding Window"
    assert len(data["knowledge"]) > 0
    assert data["confidence"] in ("HIGH", "MEDIUM")
    assert "Sliding Window" in data["headline"]

# 2. Priya response produces CONTINUE_LEARNING, target_topic is None, empty knowledge list
def test_priya_response_continue_learning(client):
    res = client.get("/api/students/student_priya/scholar/response")
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == "student_priya"
    assert data["action"] == ScholarAction.CONTINUE_LEARNING.value
    assert data["target_topic"] is None
    assert data["knowledge"] == []
    assert data["confidence"] == "HIGH"
    assert "Progression on Track" in data["headline"]

# 3. Unknown student returns 404
def test_unknown_student_response_404(client):
    res = client.get("/api/students/unknown_student_xyz/scholar/response")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

# 4. COMPLETE_MASTERY_CHECK rule fields and text
def test_complete_mastery_check_rule_text(client):
    res = client.get("/api/students/student_alex/scholar/response")
    assert res.status_code == 200
    data = res.json()
    assert "Mastery Verification Required: Sliding Window" in data["headline"]
    assert "Sliding Window" in data["message"]
    assert "False-progress evidence requires independent mastery verification" in data["why_this_action"]
    assert "unassisted mastery check" in data["next_step"]

# 5. COMPLETE_REMEDIATION rule (after failed assessment/check)
def test_complete_remediation_rule(client):
    # Step A: Alex fails assessment
    sub_res = client.post(
        "/api/students/student_alex/mastery-assessment/submit",
        json={"topic": "Sliding Window", "question_id": "sw_q01", "answer": "A"},  # Wrong answer
    )
    assert sub_res.status_code == 200

    # Step B: Record mastery check with non-mastered performance
    mc_res = client.post(
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
    assert mc_res.status_code == 200

    # Step C: Query scholar response
    res = client.get("/api/students/student_alex/scholar/response")
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == ScholarAction.COMPLETE_REMEDIATION.value
    assert "Targeted Remediation Required: Sliding Window" in data["headline"]
    assert "NOT_MASTERED" in data["message"]
    assert "independent solving criteria were not met" in data["why_this_action"]

# 6. RESUME_ROADMAP rule (after passed assessment/check)
def test_resume_roadmap_rule(client):
    # Step A: Alex passes assessment
    sub_res = client.post(
        "/api/students/student_alex/mastery-assessment/submit",
        json={"topic": "Sliding Window", "question_id": "sw_q01", "answer": "B"},  # Correct answer
    )
    assert sub_res.status_code == 200

    # Step B: Record passing mastery check
    mc_res = client.post(
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
    assert mc_res.status_code == 200

    # Step C: Query scholar response
    res = client.get("/api/students/student_alex/scholar/response")
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == ScholarAction.RESUME_ROADMAP.value
    assert "Roadmap Advancement Resumed" in data["headline"]
    assert "satisfies the verification requirement" in data["message"]
    assert "Proceed to the next unlocked node" in data["next_step"]

# 7. CONTINUE_LEARNING rule verification with safe evidence wording
def test_continue_learning_rule_details(client):
    res = client.get("/api/students/student_priya/scholar/response")
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == ScholarAction.CONTINUE_LEARNING.value
    assert data["headline"] == "Roadmap Progression on Track"
    assert "Your current Scholar state supports continuing your roadmap normally." in data["message"]
    assert "Scholar has no active false-progress intervention requiring a roadmap pause." in data["why_this_action"]
    assert "Continue solving upcoming problems" in data["next_step"]

# 8. COLLECT_MORE_EVIDENCE rule (student with sparse telemetry < 5 problems)
def test_collect_more_evidence_rule(client, db_session):
    sparse_id = f"student_sparse_{uuid.uuid4().hex[:6]}"
    sparse_student = Student(
        id=sparse_id,
        name="Sparse Student",
        career_goal="Software Engineer",
        current_streak=1,
    )
    db_session.add(sparse_student)
    db_session.flush()

    for _ in range(2):
        t = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:8]}",
            student_id=sparse_id,
            topic="Arrays",
            difficulty="Easy",
            submission_count=1,
            successful=True,
            first_attempt_pass=True,
            hints_requested=0,
            active_coding_duration_seconds=300,
            timestamp=datetime.now(timezone.utc),
        )
        db_session.add(t)
    db_session.commit()

    res = client.get(f"/api/students/{sparse_id}/scholar/response")
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == ScholarAction.COLLECT_MORE_EVIDENCE.value
    assert data["confidence"] == "INSUFFICIENT"
    assert data["target_topic"] is None
    assert data["knowledge"] == []
    assert "Additional Telemetry Required" in data["headline"]
    assert "minimum of 5 problem submissions" in data["why_this_action"]

# 9. Target topic preserved from next_action
def test_target_topic_preserved_from_next_action(client):
    alex_res = client.get("/api/students/student_alex/scholar/response")
    assert alex_res.json()["target_topic"] == "Sliding Window"
    priya_res = client.get("/api/students/student_priya/scholar/response")
    assert priya_res.json()["target_topic"] is None

# 10. No invented topic when target_topic is None
def test_no_invented_topic_when_none(client):
    priya_res = client.get("/api/students/student_priya/scholar/response")
    data = priya_res.json()
    assert data["target_topic"] is None
    assert "None" not in data["headline"]
    assert "None" not in data["message"]
    assert "None" not in data["why_this_action"]

# 11. No invented evidence: all evidence items match actual facts from state
def test_evidence_items_match_state(client):
    res = client.get("/api/students/student_alex/scholar/response")
    assert res.status_code == 200
    data = res.json()
    evidence = data["evidence"]
    assert len(evidence) >= 4
    sources = [e["source"] for e in evidence]
    assert "SCHOLAR_NEXT_ACTION" in sources
    assert "FALSE_PROGRESS_DIAGNOSTIC" in sources
    assert "ROADMAP_ADAPTATION" in sources
    assert "VERIFIED_CAPABILITY_SERVICE" in sources

    # Check detail content reflects Alex's actual severity
    fp_evidence = next(e for e in evidence if e["source"] == "FALSE_PROGRESS_DIAGNOSTIC")
    assert "CRITICAL" in fp_evidence["detail"]

# 12. Knowledge is deterministic
def test_knowledge_is_deterministic(client):
    res1 = client.get("/api/students/student_alex/scholar/response").json()
    res2 = client.get("/api/students/student_alex/scholar/response").json()
    k1 = [k["knowledge_id"] for k in res1["knowledge"]]
    k2 = [k["knowledge_id"] for k in res2["knowledge"]]
    assert k1 == k2
    assert len(k1) > 0

# 13. Knowledge remains curated (source_type == CURATED_PROTOTYPE)
def test_knowledge_remains_curated(client):
    res = client.get("/api/students/student_alex/scholar/response")
    data = res.json()
    for k in data["knowledge"]:
        assert k["source_type"] == "CURATED_PROTOTYPE"

# 14. Answer key isolation: response schema does NOT expose correct_answer or options
def test_answer_key_isolation(client):
    res = client.get("/api/students/student_alex/scholar/response")
    data = res.json()
    data_str = str(data)
    assert "correct_answer" not in data_str
    assert "expected_concept" not in data_str
    # Check that knowledge items do not leak question answer keys
    for k in data["knowledge"]:
        assert "correct_answer" not in k
        assert "options" not in k

# 15. Response endpoint is read-only (state & capability unchanged)
def test_response_endpoint_is_read_only(client, db_session):
    # Check capability before
    before_cap = ReadinessService.evaluate_verified_capability(db_session, "student_alex")

    # Call response endpoint multiple times
    for _ in range(3):
        res = client.get("/api/students/student_alex/scholar/response")
        assert res.status_code == 200

    # Check capability after
    after_cap = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    assert before_cap.verified_capability_score == after_cap.verified_capability_score
    assert before_cap.readiness_status == after_cap.readiness_status

# 16. Repeated calls return identical result (idempotent)
def test_repeated_calls_return_identical_result(client):
    res1 = client.get("/api/students/student_alex/scholar/response").json()
    res2 = client.get("/api/students/student_alex/scholar/response").json()
    assert res1 == res2

# 17. Missing evidence does not cause fabricated claims
def test_missing_evidence_does_not_cause_fabricated_claims(client, db_session):
    sparse_id = f"student_sparse_{uuid.uuid4().hex[:6]}"
    sparse_student = Student(
        id=sparse_id,
        name="Sparse Claims Student",
        career_goal="Software Engineer",
        current_streak=1,
    )
    db_session.add(sparse_student)
    db_session.commit()

    res = client.get(f"/api/students/{sparse_id}/scholar/response")
    assert res.status_code == 200
    data = res.json()
    assert data["confidence"] == "INSUFFICIENT"
    assert data["target_topic"] is None
    assert data["knowledge"] == []
    assert data["action"] == ScholarAction.COLLECT_MORE_EVIDENCE.value

# 18. Service-level call handles non-existent student cleanly
def test_service_level_none_for_missing_student(db_session):
    res = ScholarResponseService.generate_response(db_session, "totally_nonexistent_student")
    assert res is None

# --- Step 10.1 Evidence Language Hardening Regression Tests ---

def test_priya_response_contains_no_unsupported_mastery_claims(client):
    """
    Step 10.1: Ensure Priya's response does NOT equate absence of false progress
    with verified mastery. Wording must remain evidence-safe.
    """
    res = client.get("/api/students/student_priya/scholar/response")
    assert res.status_code == 200
    data = res.json()
    full_text = str(data).lower()

    # Prohibited unsupported claims
    assert "genuine mastery" not in full_text
    assert "mastery verified" not in full_text
    assert "fully mastered" not in full_text
    assert "demonstrates genuine mastery" not in full_text
    assert "verified competence" not in full_text
    assert "fully competent" not in full_text

    # Preserved invariants
    assert data["target_topic"] is None
    assert data["knowledge"] == []
    assert data["action"] == ScholarAction.CONTINUE_LEARNING.value
    assert data["confidence"] == "HIGH"

def test_evidence_detail_safe_wording_when_false_progress_false(client):
    """
    Step 10.1: Ensure evidence detail only states what the diagnostic establishes:
    'No false-progress intervention is currently active'.
    """
    res = client.get("/api/students/student_priya/scholar/response")
    assert res.status_code == 200
    data = res.json()
    fp_evidence = next(e for e in data["evidence"] if e["source"] == "FALSE_PROGRESS_DIAGNOSTIC")
    assert fp_evidence["detail"] == "No false-progress intervention is currently active"

def test_alex_preserves_complete_mastery_check_and_sliding_window(client):
    """
    Step 10.1: Alex's response correctly preserves COMPLETE_MASTERY_CHECK,
    Sliding Window target, and actual engine facts (CRITICAL severity, pause).
    """
    res = client.get("/api/students/student_alex/scholar/response")
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == ScholarAction.COMPLETE_MASTERY_CHECK.value
    assert data["target_topic"] == "Sliding Window"
    fp_evidence = next(e for e in data["evidence"] if e["source"] == "FALSE_PROGRESS_DIAGNOSTIC")
    assert "CRITICAL" in fp_evidence["detail"]
    assert "Sliding Window" in data["headline"]
    assert len(data["knowledge"]) > 0

