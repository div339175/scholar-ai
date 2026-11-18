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
from app.services.scholar_intent_service import ScholarIntentService
from app.schemas.scholar import ScholarIntent, ScholarAction

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

# 1. NEXT_ACTION intent
def test_intent_next_action(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "What should I do next?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.NEXT_ACTION.value
    assert data["action"] == ScholarAction.COMPLETE_MASTERY_CHECK.value
    assert data["requires_action"] is True

# 2. WHY_THIS_ACTION intent
def test_intent_why_this_action(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "Why are you asking me to do this?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.WHY_THIS_ACTION.value
    assert "COMPLETE_MASTERY_CHECK" in data["response"]
    assert "false-progress" in data["response"].lower()

# 3. EXPLAIN_TOPIC intent
def test_intent_explain_topic(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "Explain sliding window"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.EXPLAIN_TOPIC.value
    assert data["target_topic"] == "Sliding Window"
    assert len(data["knowledge"]) > 0

# 4. MASTERY_STATUS intent
def test_intent_mastery_status(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "Did I master this?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.MASTERY_STATUS.value
    assert "recorded mastery check" in data["response"] or "decision=" in data["response"]

# 5. READINESS_STATUS intent
def test_intent_readiness_status(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "What is my readiness?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.READINESS_STATUS.value
    assert "NOT_VERIFIED" in data["response"]
    assert "verified capability score" in data["response"]

# 6. ROADMAP_STATUS intent
def test_intent_roadmap_status(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "Where am I on my roadmap?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.ROADMAP_STATUS.value
    assert "PAUSE_ADVANCEMENT" in data["response"]

# 7. FALSE_PROGRESS_STATUS intent
def test_intent_false_progress_status(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "Do I have false progress?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.FALSE_PROGRESS_STATUS.value
    assert "CRITICAL" in data["response"]

# 8. INTERVENTION_STATUS intent
def test_intent_intervention_status(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "What intervention do I have?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.INTERVENTION_STATUS.value
    assert "Active intervention" in data["response"] or "remediation" in data["response"].lower()

# 9. UNKNOWN intent
def test_intent_unknown(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "What is the capital of France?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.UNKNOWN.value
    assert "I can answer questions about your current Scholar action" in data["response"]
    assert data["knowledge"] == []
    assert data["requires_action"] is False

# 10. Case & punctuation normalization
def test_case_and_punctuation_normalization():
    intent, topic = ScholarIntentService.classify_intent("   WHAT SHOULD I DO NEXT???   ")
    assert intent == ScholarIntent.NEXT_ACTION
    intent2, topic2 = ScholarIntentService.classify_intent("TeAcH mE sLiDiNg WiNdOw!!!")
    assert intent2 == ScholarIntent.EXPLAIN_TOPIC
    assert topic2 == "Sliding Window"

# 11. Deterministic classification repeatability
def test_deterministic_classification_repeatability():
    for _ in range(5):
        intent, topic = ScholarIntentService.classify_intent("Why did you stop my roadmap?")
        assert intent == ScholarIntent.WHY_THIS_ACTION

# 12. Alex next-action question
def test_alex_next_action_flow(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "What next?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == "student_alex"
    assert data["action"] == ScholarAction.COMPLETE_MASTERY_CHECK.value
    assert data["target_topic"] == "Sliding Window"
    assert data["requires_action"] is True

# 13. Alex why-action question
def test_alex_why_action_flow(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "Why this action?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.WHY_THIS_ACTION.value
    assert "COMPLETE_MASTERY_CHECK" in data["response"]
    assert "false-progress evidence" in data["response"].lower()

# 14. Alex topic explanation (Sliding Window grounded knowledge returned)
def test_alex_topic_explanation_grounded(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "Explain Sliding Window"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.EXPLAIN_TOPIC.value
    assert data["target_topic"] == "Sliding Window"
    assert len(data["knowledge"]) == 4
    for k in data["knowledge"]:
        assert k["topic"] == "Sliding Window"
        assert k["source_type"] == "CURATED_PROTOTYPE"

# 15. Priya next-action question (CONTINUE_LEARNING)
def test_priya_next_action_flow(client):
    res = client.post(
        "/api/students/student_priya/scholar/chat",
        json={"message": "What should I do next?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.NEXT_ACTION.value
    assert data["action"] == ScholarAction.CONTINUE_LEARNING.value
    assert data["requires_action"] is False
    assert "supports continuing your roadmap normally" in data["response"]

# 16. Priya no invented topic
def test_priya_no_invented_topic(client):
    res = client.post(
        "/api/students/student_priya/scholar/chat",
        json={"message": "What next?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["target_topic"] is None
    assert data["knowledge"] == []

# 17. User message saying "I mastered sliding window" does NOT modify mastery
def test_user_statement_does_not_modify_mastery(client, db_session):
    # Verify mastery status before
    status_before = client.get("/api/students/student_alex/mastery-check/status").json()

    # User falsely claims mastery
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "I mastered sliding window and solved all problems!"},
    )
    assert res.status_code == 200

    # Verify mastery status after is unchanged
    status_after = client.get("/api/students/student_alex/mastery-check/status").json()
    assert status_before == status_after

# 18. User message saying "I am ready" does NOT modify readiness
def test_user_statement_does_not_modify_readiness(client, db_session):
    cap_before = ReadinessService.evaluate_verified_capability(db_session, "student_alex")

    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "I am ready for the Google interview!"},
    )
    assert res.status_code == 200

    cap_after = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    assert cap_before.verified_capability_score == cap_after.verified_capability_score
    assert cap_before.readiness_status == cap_after.readiness_status

# 19. Unknown student -> 404
def test_unknown_student_chat_404(client):
    res = client.post(
        "/api/students/non_existent_student_999/scholar/chat",
        json={"message": "What should I do next?"},
    )
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

# 20. Empty message -> UNKNOWN
def test_empty_message_handled_cleanly(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": ""},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.UNKNOWN.value

# 21. Unsupported message -> UNKNOWN
def test_unsupported_message_returns_safe_guidance(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "Who won the cricket match yesterday?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.UNKNOWN.value
    assert "I can answer questions about your current Scholar action" in data["response"]

# 22. Answer-key isolation: no answer keys leaked
def test_answer_key_isolation_in_chat(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "Teach me Sliding Window"},
    )
    assert res.status_code == 200
    data_str = str(res.json())
    assert "correct_answer" not in data_str
    assert "expected_concept" not in data_str

# 23. Read-only state: student records and DB unchanged
def test_read_only_state_guarantee(client, db_session):
    alex_student = db_session.query(Student).filter(Student.id == "student_alex").first()
    streak_before = alex_student.current_streak
    completion_before = alex_student.roadmap_completion

    for q in [
        "What should I do next?",
        "Did I master this?",
        "I solved 50 problems today",
        "Explain Sliding Window",
    ]:
        client.post("/api/students/student_alex/scholar/chat", json={"message": q})

    alex_student_after = db_session.query(Student).filter(Student.id == "student_alex").first()
    assert alex_student_after.current_streak == streak_before
    assert alex_student_after.roadmap_completion == completion_before

# 24. Repeated identical requests produce identical output (idempotent)
def test_repeated_requests_identical_output(client):
    res1 = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "What should I do next?"},
    ).json()
    res2 = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "What should I do next?"},
    ).json()
    assert res1 == res2

# 25. Evidence source correctness
def test_evidence_source_correctness(client):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "What is my readiness?"},
    )
    data = res.json()
    assert "VERIFIED_CAPABILITY_SERVICE" in data["evidence_sources"]
    assert "SCHOLAR_STUDENT_STATE" in data["evidence_sources"]

# 26. Topic boundary: Priya asking for DP does NOT claim DP is her target topic
def test_topic_boundary_priya_dp(client):
    res = client.post(
        "/api/students/student_priya/scholar/chat",
        json={"message": "Explain Dynamic Programming"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == ScholarIntent.EXPLAIN_TOPIC.value
    assert "Dynamic Programming is available in the curated knowledge base" in data["response"]
    assert "not the currently verified Scholar target topic" in data["response"]
    assert data["target_topic"] is None
    assert data["knowledge"] == []

# 27. No invented score: exact score from database
def test_no_invented_score(client, db_session):
    cap = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "What is my readiness?"},
    )
    data = res.json()
    assert f"{cap.verified_capability_score:.1f}" in data["response"]

# 28. No invented student behavior: Alex false progress reflects actual FPI
def test_no_invented_behavior_alex(client, db_session):
    res = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"message": "Do I have false progress?"},
    )
    data = res.json()
    assert "CRITICAL" in data["response"]
    assert "87.0" in data["response"]
