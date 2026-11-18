import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal
from app.services.mastery_assessment_service import MasteryAssessmentService
from app.services.mastery_service import MasteryService
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

def test_question_retrieval_works(client):
    """Test 1: Verify valid topic returns an assessment question."""
    resp = client.get("/api/students/student_alex/mastery-assessment/Sliding Window")
    assert resp.status_code == 200
    data = resp.json()
    assert data["topic"] == "Sliding Window"
    assert data["question_id"] == "sw_q01"
    assert len(data["options"]) == 4
    assert "options" in data
    assert "difficulty" in data

def test_unknown_topic_handled_correctly(client):
    """Test 2: Unknown topic returns 404."""
    resp = client.get("/api/students/student_alex/mastery-assessment/Quantum Computing")
    assert resp.status_code == 404
    assert "No assessment questions available" in resp.json()["detail"]

def test_correct_answer_returns_score_100(client):
    """Test 3: Correct answer submission yields score 100 and correct=True."""
    payload = {
        "topic": "Sliding Window",
        "question_id": "sw_q01",
        "answer": "B",
    }
    resp = client.post("/api/students/student_alex/mastery-assessment/submit", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is True
    assert data["score"] == 100.0
    assert data["next_action"] == "PROCEED_TO_CODING_CHECK"

def test_incorrect_answer_returns_score_0(client):
    """Test 4: Incorrect answer yields score 0 and correct=False."""
    payload = {
        "topic": "Sliding Window",
        "question_id": "sw_q01",
        "answer": "A",
    }
    resp = client.post("/api/students/student_alex/mastery-assessment/submit", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is False
    assert data["score"] == 0.0
    assert data["next_action"] == "RETRY_CONCEPTUAL_REVIEW"

def test_correct_evidence_returned(client):
    """Test 5: Explicit evidence with status PASS returned on correct submission."""
    payload = {
        "topic": "Sliding Window",
        "question_id": "sw_q01",
        "answer": "B",
    }
    resp = client.post("/api/students/student_alex/mastery-assessment/submit", json=payload)
    data = resp.json()
    ev = data["evidence"][0]
    assert ev["metric"] == "assessment_answer"
    assert ev["observed_value"] == "B"
    assert ev["status"] == "PASS"

def test_incorrect_evidence_returned(client):
    """Test 6: Explicit evidence with status FAIL returned on incorrect submission."""
    payload = {
        "topic": "Sliding Window",
        "question_id": "sw_q01",
        "answer": "D",
    }
    resp = client.post("/api/students/student_alex/mastery-assessment/submit", json=payload)
    data = resp.json()
    ev = data["evidence"][0]
    assert ev["metric"] == "assessment_answer"
    assert ev["observed_value"] == "D"
    assert ev["status"] == "FAIL"

def test_correct_answer_not_exposed_in_get_question(client):
    """Test 7: Security check - ensure correct_answer and internal explanation are never leaked."""
    resp = client.get("/api/students/student_alex/mastery-assessment/Sliding Window")
    assert resp.status_code == 200
    data = resp.json()
    assert "correct_answer" not in data
    assert "explanation" not in data
    assert "answer_key" not in data

def test_unknown_question_returns_404(client):
    """Test 8: Submitting answer for non-existent question returns 404."""
    payload = {
        "topic": "Sliding Window",
        "question_id": "non_existent_q",
        "answer": "B",
    }
    resp = client.post("/api/students/student_alex/mastery-assessment/submit", json=payload)
    assert resp.status_code == 404

def test_unknown_student_returns_404(client):
    """Test 9: Unknown student ID returns 404 for assessment endpoints."""
    resp_get = client.get("/api/students/unknown_student/mastery-assessment/Sliding Window")
    assert resp_get.status_code == 404

    payload = {"topic": "Sliding Window", "question_id": "sw_q01", "answer": "B"}
    resp_post = client.post("/api/students/unknown_student/mastery-assessment/submit", json=payload)
    assert resp_post.status_code == 404

def test_score_calculated_server_side(db_session):
    """Test 10: Verify score calculation is 100% deterministic and server-side."""
    MasteryAssessmentService.clear_verified_scores()
    
    # Correct answer evaluation
    res_correct = MasteryAssessmentService.evaluate_answer(
        student_id="student_alex",
        topic="Sliding Window",
        question_id="sw_q01",
        answer="B",
    )
    assert res_correct.score == 100.0
    assert MasteryAssessmentService.get_verified_score("student_alex", "Sliding Window") == 100.0

    # Incorrect answer evaluation
    res_incorrect = MasteryAssessmentService.evaluate_answer(
        student_id="student_alex",
        topic="Sliding Window",
        question_id="sw_q01",
        answer="C",
    )
    assert res_incorrect.score == 0.0
    assert MasteryAssessmentService.get_verified_score("student_alex", "Sliding Window") == 0.0

def test_verified_score_flows_into_mastery_check(client, db_session):
    """Test 11: Verify student cannot fabricate conceptual_score: backend derives it from assessment evidence."""
    MasteryAssessmentService.clear_verified_scores()

    # Step 1: Student takes assessment and answers correctly (server calculates 100.0)
    sub_payload = {
        "topic": "Sliding Window",
        "question_id": "sw_q01",
        "answer": "B",
    }
    assess_resp = client.post("/api/students/student_alex/mastery-assessment/submit", json=sub_payload)
    assert assess_resp.status_code == 200
    assert assess_resp.json()["score"] == 100.0

    # Step 2: Student submits coding check WITHOUT providing conceptual_score (conceptual_score=None)
    # Backend must automatically look up the server-verified assessment score!
    check_payload = {
        "student_id": "student_alex",
        "topic": "Sliding Window",
        "problem_id": "prob_sw_02",
        "solved": True,
        "hints_used": 0,
        "attempts": 1,
        "conceptual_score": None, # Not fabricated by client
    }
    check_resp = client.post("/api/students/student_alex/mastery-check", json=check_payload)
    assert check_resp.status_code == 200
    check_data = check_resp.json()
    assert check_data["passed"] is True
    assert check_data["conceptual_score"] == 100.0 # pulled from verified assessment
    assert check_data["mastery_score"] == 100.0 # 0.6 * 100 + 0.4 * 100
    assert check_data["decision"] == "MASTERED"
    assert check_data["next_action"] == "RESUME_ROADMAP"

    # Evidence confirms source
    source_ev = next(e for e in check_data["evidence"] if e["metric"] == "conceptual_score_source")
    assert source_ev["observed_value"] == "VERIFIED_ASSESSMENT_SERVICE"
