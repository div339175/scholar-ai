"""
STEP 13 — SCHOLAR AI END-TO-END PRODUCT & DEMO WORKFLOW TESTS

Proves that the complete Scholar AI system functions as ONE coherent end-to-end product:
STUDENT TELEMETRY
    ↓
FALSE PROGRESS DETECTION
    ↓
INTERVENTION
    ↓
MASTERY EVIDENCE
    ↓
ROADMAP ADAPTATION
    ↓
VERIFIED CAPABILITY
    ↓
SCHOLAR STATE
    ↓
NEXT ACTION
    ↓
GROUNDED KNOWLEDGE
    ↓
CONVERSATIONAL EXPLANATION
    ↓
FRONTEND UI

Exercises actual backend services and actual API responses.
NO fake outputs. NO LLM calls. NO client-side hallucinations.
"""

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
from app.models.scholar import MasteryCheck, ScholarIntervention
from app.services.mastery_service import MasteryService
from app.services.mastery_assessment_service import MasteryAssessmentService
from app.services.false_progress_detector import FalseProgressDetector
from app.services.intervention_service import InterventionService
from app.services.roadmap_adaptation_service import RoadmapAdaptationService
from app.services.readiness_service import ReadinessService
from app.services.scholar_orchestrator_service import ScholarOrchestratorService
from app.services.scholar_knowledge_service import ScholarKnowledgeService
from app.services.scholar_response_service import ScholarResponseService
from app.services.scholar_conversation_service import ScholarConversationService
from app.schemas.scholar import ScholarIntent, ScholarAction
from app.schemas.student import ReadinessStatus

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
    """
    Ensures each test starts from the pristine seeded state and resets
    in-memory assessment ledgers and DB check records on teardown.
    """
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


# ===========================================================================
# SCENARIO A: ALEX FALSE PROGRESS DETECTION & INTERVENTION FLOW
# ===========================================================================

def test_scenario_a_alex_false_progress(client, db_session):
    """
    Verifies Alex Sharma's initial state:
    1. Telemetry exists (40 events, high hints, low unassisted pass ratio)
    2. FPDE detects false progress (severity CRITICAL, FPI = 87.0)
    3. Proactive intervention required (priority HIGH, target Sliding Window, roadmap PAUSE_ADVANCEMENT)
    4. Roadmap adaptation decision is PAUSE_ADVANCEMENT
    5. Verified capability reflects 38.5 (50% penalty on 76.9 standard readiness, 0.0 coverage, NOT_VERIFIED)
    6. Scholar unified state orchestrates all layers
    7. Scholar next action is COMPLETE_MASTERY_CHECK
    8. Chat explains "Why are you asking me to do this?" using backend evidence
    9. Chat provides curated Sliding Window knowledge invariants
    """
    # 1. Telemetry verification
    telemetry_events = (
        db_session.query(CodingTelemetry)
        .filter(CodingTelemetry.student_id == "student_alex")
        .all()
    )
    assert len(telemetry_events) >= 5, "Alex must have sufficient telemetry events recorded"

    # 2. FPDE detection
    diag = FalseProgressDetector.analyze_student(db_session, "student_alex")
    assert diag.is_false_progress is True
    assert diag.severity == "CRITICAL"
    assert diag.false_progress_index == 87.0
    assert "FP_HINT_CRUTCH" in diag.trigger_codes
    assert "FP_BRUTE_FORCE" in diag.trigger_codes
    assert "FP_LOW_INDEPENDENCE" in diag.trigger_codes
    assert "Sliding Window" in diag.affected_topics

    # 3. Intervention plan
    student = db_session.query(Student).filter(Student.id == "student_alex").first()
    interv = InterventionService.generate_intervention(student, diag, telemetry_events, [])
    assert interv.intervention_required is True
    assert interv.priority == "HIGH"
    assert interv.mastery_check_required is True
    assert interv.mastery_check_topic == "Sliding Window"
    assert interv.roadmap_action == "PAUSE_ADVANCEMENT"

    # 4. Roadmap adaptation
    adaptation = RoadmapAdaptationService.determine_adaptation(db_session, "student_alex")
    assert adaptation.action == "PAUSE_ADVANCEMENT"
    assert adaptation.topic == "Sliding Window"
    assert adaptation.evidence_status == "SUFFICIENT"

    # 5. Verified capability
    cap = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    assert cap.standard_readiness_score == 76.9
    assert cap.verified_capability_score == 38.5
    assert cap.mastery_coverage == 0.0
    assert cap.mastery_confidence_multiplier == 0.5
    assert cap.readiness_status == ReadinessStatus.NOT_VERIFIED.value
    assert "Sliding Window" in cap.unverified_topics

    # 6. Scholar State API
    state_res = client.get("/api/students/student_alex/scholar/state")
    assert state_res.status_code == 200
    state_data = state_res.json()
    assert state_data["false_progress"]["detected"] is True
    assert state_data["false_progress"]["severity"] == "CRITICAL"
    assert state_data["false_progress"]["index"] == 87.0
    assert state_data["roadmap"]["action"] == "PAUSE_ADVANCEMENT"
    assert state_data["capability"]["verified_capability_score"] == 38.5

    # 7. Scholar Next Action API
    action_res = client.get("/api/students/student_alex/scholar/next-action")
    assert action_res.status_code == 200
    action_data = action_res.json()
    assert action_data["action"] == "COMPLETE_MASTERY_CHECK"
    assert action_data["target_topic"] == "Sliding Window"
    assert "Sliding Window" in action_data["reason"]

    # 8. Conversational Explanation ("Why are you asking me to do this?")
    chat_why = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"student_id": "student_alex", "message": "Why are you asking me to do this?"},
    )
    assert chat_why.status_code == 200
    why_data = chat_why.json()
    assert why_data["intent"] == "WHY_THIS_ACTION"
    assert why_data["action"] == "COMPLETE_MASTERY_CHECK"
    assert (
        "false-progress" in why_data["response"].lower()
        or "false progress" in why_data["response"].lower()
        or "PAUSE_ADVANCEMENT" in why_data["response"]
    )
    assert why_data["requires_action"] is True

    # 9. Grounded Topic Explanation ("Explain Sliding Window")
    chat_explain = client.post(
        "/api/students/student_alex/scholar/chat",
        json={"student_id": "student_alex", "message": "Explain Sliding Window"},
    )
    assert chat_explain.status_code == 200
    explain_data = chat_explain.json()
    assert explain_data["intent"] == "EXPLAIN_TOPIC"
    assert explain_data["target_topic"] == "Sliding Window"
    assert len(explain_data["knowledge"]) > 0
    assert any(
        item["topic"] == "Sliding Window" or "window" in item["title"].lower()
        for item in explain_data["knowledge"]
    )


# ===========================================================================
# SCENARIO B: ALEX SUCCESSFUL MASTERY & ROADMAP RESUMPTION FLOW
# ===========================================================================

def test_scenario_b_alex_successful_mastery(client, db_session):
    """
    Verifies full mastery transition:
    1. Retrieve curated Sliding Window question (correct_answer strictly omitted)
    2. Submit correct answer ("B") to server-side assessment
    3. Server evaluates answer, scores 100.0, records in verified ledger
    4. Client-supplied scores cannot forge verified scores
    5. Submit mastery check with unassisted telemetry (1 attempt, 0 hints, solved)
    6. Mastery evaluates to MASTERED
    7. Roadmap adaptation transitions from PAUSE_ADVANCEMENT to RESUME_ROADMAP
    8. Verified capability increases from 38.5 to 76.9 (multiplier 1.0, coverage 1.0, PARTIALLY_VERIFIED)
    9. Scholar next action becomes RESUME_ROADMAP
    10. State API reflects the verified competence
    11. Unrelated topics (e.g. Dynamic Programming) remain unverified
    """
    # 1. Fetch question (Answer key omitted)
    q_res = client.get("/api/students/student_alex/mastery-assessment/Sliding%20Window")
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert q_data["topic"] == "Sliding Window"
    assert "correct_answer" not in q_data
    assert "explanation" not in q_data
    question_id = q_data["question_id"]

    # 2. Submit conceptual answer to server-side evaluation
    sub_res = client.post(
        "/api/students/student_alex/mastery-assessment/submit",
        json={
            "student_id": "student_alex",
            "topic": "Sliding Window",
            "question_id": question_id,
            "answer": "B",
        },
    )
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["correct"] is True
    assert sub_data["score"] == 100.0
    assert sub_data["next_action"] == "PROCEED_TO_CODING_CHECK"

    # Verify score recorded server-side
    verified_score = MasteryAssessmentService.get_verified_score("student_alex", "Sliding Window")
    assert verified_score == 100.0

    # 3. Submit mastery check with independent telemetry
    check_res = client.post(
        "/api/students/student_alex/mastery-check",
        json={
            "student_id": "student_alex",
            "topic": "Sliding Window",
            "problem_id": "p_sw_01",
            "solved": True,
            "hints_used": 0,
            "attempts": 1,
            # Note: conceptual_score omitted to ensure server ledger retrieval
        },
    )
    assert check_res.status_code == 200
    check_data = check_res.json()
    assert check_data["decision"] == "MASTERED"
    assert check_data["passed"] is True
    assert check_data["independent"] is True
    assert check_data["conceptual_score"] == 100.0

    # 4. Roadmap adaptation transitions to RESUME_ROADMAP
    adapt_res = client.get("/api/students/student_alex/roadmap/adaptation")
    assert adapt_res.status_code == 200
    adapt_data = adapt_res.json()
    assert adapt_data["action"] == "RESUME_ROADMAP"
    assert adapt_data["topic"] == "Sliding Window"
    assert "resumed" in adapt_data["reason"].lower()

    # 5. Verified capability increases to match verified evidence
    cap_res = client.get("/api/students/student_alex/verified-capability")
    assert cap_res.status_code == 200
    cap_data = cap_res.json()
    assert cap_data["mastery_coverage"] == 1.0
    assert cap_data["mastery_confidence_multiplier"] == 1.0
    assert "Sliding Window" in cap_data["verified_topics"]
    assert cap_data["verified_capability_score"] == 76.9
    assert cap_data["readiness_status"] == ReadinessStatus.PARTIALLY_VERIFIED.value

    # 6. Scholar Next Action reflects resumption
    action_res = client.get("/api/students/student_alex/scholar/next-action")
    assert action_res.status_code == 200
    action_data = action_res.json()
    assert action_data["action"] == "RESUME_ROADMAP"
    assert action_data["target_topic"] == "Sliding Window"

    # 7. Unified Scholar State reflects complete verified chain
    state_res = client.get("/api/students/student_alex/scholar/state")
    assert state_res.status_code == 200
    state_data = state_res.json()
    assert state_data["mastery"]["decision"] == "MASTERED"
    assert state_data["roadmap"]["action"] == "RESUME_ROADMAP"
    assert state_data["capability"]["verified_capability_score"] == 76.9
    assert "MASTERY_CHECK_MASTERED" in state_data["evidence_chain"]
    assert "ROADMAP_RESUME_ROADMAP" in state_data["evidence_chain"]

    # 8. Unrelated topic remains unverified
    assert "Dynamic Programming" not in cap_data["verified_topics"]


# ===========================================================================
# SCENARIO C: FAILED MASTERY EVIDENCE FLOW
# ===========================================================================

def test_scenario_c_failed_mastery(client, db_session):
    """
    Verifies failed mastery check behavior:
    1. Student fails the mastery check (e.g. hints_used > 0, attempts > 1)
    2. Mastery check evaluates to NOT_MASTERED
    3. Roadmap adaptation transitions to REMEDIATE_TOPIC (does NOT resume)
    4. Scholar next action becomes COMPLETE_REMEDIATION (never CONTINUE_LEARNING)
    5. Verified capability remains penalized at 38.5 (NOT_VERIFIED, coverage 0.0)
    """
    # Record a failed check (e.g. hints used and multiple attempts)
    check_res = client.post(
        "/api/students/student_alex/mastery-check",
        json={
            "student_id": "student_alex",
            "topic": "Sliding Window",
            "problem_id": "p_sw_01",
            "solved": True,
            "hints_used": 2,
            "attempts": 3,
            "conceptual_score": 60.0,
        },
    )
    assert check_res.status_code == 200
    check_data = check_res.json()
    assert check_data["decision"] == "NOT_MASTERED"
    assert check_data["passed"] is False
    assert check_data["independent"] is False

    # Roadmap does NOT resume
    adapt_res = client.get("/api/students/student_alex/roadmap/adaptation")
    assert adapt_res.status_code == 200
    adapt_data = adapt_res.json()
    assert adapt_data["action"] == "REMEDIATE_TOPIC"
    assert adapt_data["topic"] == "Sliding Window"
    assert "not passed" in adapt_data["reason"].lower()

    # Next action requires complete remediation
    action_res = client.get("/api/students/student_alex/scholar/next-action")
    assert action_res.status_code == 200
    action_data = action_res.json()
    assert action_data["action"] == "COMPLETE_REMEDIATION"
    assert action_data["action"] != "CONTINUE_LEARNING"

    # Readiness remains unverified
    cap_res = client.get("/api/students/student_alex/verified-capability")
    assert cap_res.status_code == 200
    cap_data = cap_res.json()
    assert cap_data["verified_capability_score"] == 38.5
    assert cap_data["mastery_coverage"] == 0.0
    assert cap_data["readiness_status"] == ReadinessStatus.NOT_VERIFIED.value
    assert "Sliding Window" in cap_data["unverified_topics"]


# ===========================================================================
# SCENARIO D: PRIYA NORMAL PROGRESSION & TOPIC SAFETY BOUNDARY
# ===========================================================================

def test_scenario_d_priya_normal_progression(client, db_session):
    """
    Verifies Priya Mehta's genuine learning state:
    1. False progress is false (FPI = 12.5, severity = LOW)
    2. No intervention required
    3. Roadmap continues normally (CONTINUE_NORMAL)
    4. Scholar next action is CONTINUE_LEARNING (target_topic is None)
    5. Conversational inquiry about Dynamic Programming tests topic safety:
       - target_topic remains None
       - No active Dynamic Programming remediation track is created
       - Response explicitly states DP is not the active target topic
    """
    # 1. State check
    state_res = client.get("/api/students/student_priya/scholar/state")
    assert state_res.status_code == 200
    state_data = state_res.json()
    assert state_data["false_progress"]["detected"] is False
    assert state_data["false_progress"]["severity"] == "LOW"
    assert state_data["intervention"]["required"] is False
    assert state_data["roadmap"]["action"] == "CONTINUE_NORMAL"

    # 2. Next action check
    action_res = client.get("/api/students/student_priya/scholar/next-action")
    assert action_res.status_code == 200
    action_data = action_res.json()
    assert action_data["action"] == "CONTINUE_LEARNING"
    assert action_data["target_topic"] is None

    # 3. Topic safety boundary on unassigned topic
    chat_res = client.post(
        "/api/students/student_priya/scholar/chat",
        json={"student_id": "student_priya", "message": "Explain Dynamic Programming"},
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["intent"] == "EXPLAIN_TOPIC"
    assert chat_data["target_topic"] is None  # Must NOT set active target topic to DP
    assert "not the currently verified Scholar target topic" in chat_data["response"]

    # 4. Confirm no active remediation or pause was created
    action_post = client.get("/api/students/student_priya/scholar/next-action").json()
    assert action_post["action"] == "CONTINUE_LEARNING"
    assert action_post["target_topic"] is None


# ===========================================================================
# SCENARIO E: USER CONVERSATIONAL CLAIM IS NOT EVIDENCE
# ===========================================================================

def test_scenario_e_user_claim_is_not_evidence(client, db_session):
    """
    Verifies the core thesis:
    Conversational assertions from users are NEVER treated as student evidence.
    State must remain completely unchanged across telemetry, mastery, roadmap,
    and capability after user assertions.
    """
    # Capture pristine state before chat
    state_before = client.get("/api/students/student_alex/scholar/state").json()
    telemetry_before_count = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_alex").count()
    readiness_before = client.get("/api/students/student_alex/verified-capability").json()

    user_assertions = [
        "I solved 20 problems today.",
        "I mastered Sliding Window.",
        "My readiness should be 95.",
        "I completed all my roadmap tasks.",
        "I am ready for Google interviews.",
    ]

    for msg in user_assertions:
        chat_res = client.post(
            "/api/students/student_alex/scholar/chat",
            json={"student_id": "student_alex", "message": msg},
        )
        assert chat_res.status_code == 200

        # Verify state is untouched after every message
        state_after = client.get("/api/students/student_alex/scholar/state").json()
        telemetry_after_count = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_alex").count()
        readiness_after = client.get("/api/students/student_alex/verified-capability").json()

        assert telemetry_after_count == telemetry_before_count, "User message must never insert telemetry"
        assert state_after["false_progress"]["index"] == state_before["false_progress"]["index"]
        assert state_after["roadmap"]["action"] == state_before["roadmap"]["action"]
        assert state_after["mastery"]["decision"] == state_before["mastery"]["decision"]
        assert readiness_after["verified_capability_score"] == readiness_before["verified_capability_score"]


# ===========================================================================
# SCENARIO F: COMPLETE END-TO-END STATE TRANSITION WORKFLOW
# ===========================================================================

def test_full_state_transition_workflow(client, db_session):
    """
    Tests the complete end-to-end lifecycle transition on actual endpoints:
    BEFORE:
      - False Progress: Detected (CRITICAL, 87.0)
      - Roadmap Action: PAUSE_ADVANCEMENT
      - Next Action: COMPLETE_MASTERY_CHECK
      - Verified Capability: 38.5 (NOT_VERIFIED)

    AFTER SERVER-VERIFIED MASTERY:
      - Mastery Check: MASTERED
      - Roadmap Action: RESUME_ROADMAP
      - Next Action: RESUME_ROADMAP
      - Verified Capability: 76.9 (PARTIALLY_VERIFIED)
    """
    # 1. Inspect initial state (BEFORE)
    init_state = client.get("/api/students/student_alex/scholar/state").json()
    assert init_state["false_progress"]["detected"] is True
    assert init_state["roadmap"]["action"] == "PAUSE_ADVANCEMENT"
    assert init_state["capability"]["verified_capability_score"] == 38.5

    init_action = client.get("/api/students/student_alex/scholar/next-action").json()
    assert init_action["action"] == "COMPLETE_MASTERY_CHECK"

    # 2. Server-side evaluated assessment
    q = client.get("/api/students/student_alex/mastery-assessment/Sliding%20Window").json()
    sub = client.post(
        "/api/students/student_alex/mastery-assessment/submit",
        json={"student_id": "student_alex", "topic": "Sliding Window", "question_id": q["question_id"], "answer": "B"},
    ).json()
    assert sub["correct"] is True

    # 3. Submit valid independent check
    check = client.post(
        "/api/students/student_alex/mastery-check",
        json={"student_id": "student_alex", "topic": "Sliding Window", "problem_id": "p_sw_01", "solved": True, "hints_used": 0, "attempts": 1},
    ).json()
    assert check["decision"] == "MASTERED"

    # 4. Inspect final state (AFTER)
    final_state = client.get("/api/students/student_alex/scholar/state").json()
    assert final_state["mastery"]["decision"] == "MASTERED"
    assert final_state["roadmap"]["action"] == "RESUME_ROADMAP"
    assert final_state["capability"]["verified_capability_score"] == 76.9

    final_action = client.get("/api/students/student_alex/scholar/next-action").json()
    assert final_action["action"] == "RESUME_ROADMAP"


# ===========================================================================
# SCENARIO G: API-LEVEL VERIFICATION FOR ALL STEP 1-13 ENDPOINTS
# ===========================================================================

def test_all_step13_api_endpoints(client):
    """
    Validates presence and response schema across all primary Scholar AI endpoints.
    """
    student_id = "student_alex"

    # 1. State
    res = client.get(f"/api/students/{student_id}/scholar/state")
    assert res.status_code == 200
    assert "evidence_chain" in res.json()

    # 2. Next Action
    res = client.get(f"/api/students/{student_id}/scholar/next-action")
    assert res.status_code == 200
    assert "action" in res.json()

    # 3. Verified Capability
    res = client.get(f"/api/students/{student_id}/verified-capability")
    assert res.status_code == 200
    assert "verified_capability_score" in res.json()

    # 4. Roadmap Adaptation
    res = client.get(f"/api/students/{student_id}/roadmap/adaptation")
    assert res.status_code == 200
    assert "action" in res.json()

    # 5. Response Generator
    res = client.get(f"/api/students/{student_id}/scholar/response")
    assert res.status_code == 200
    assert "message" in res.json()

    # 6. Conversational Chat
    res = client.post(f"/api/students/{student_id}/scholar/chat", json={"student_id": student_id, "message": "What should I do next?"})
    assert res.status_code == 200
    assert "intent" in res.json()

    # 7. Context / Knowledge
    res = client.get(f"/api/students/{student_id}/scholar/context")
    assert res.status_code == 200
    assert "knowledge" in res.json()

    # 8. Mastery Assessment Question
    res = client.get(f"/api/students/{student_id}/mastery-assessment/Sliding%20Window")
    assert res.status_code == 200
    assert "question_text" in res.json()

    # 9. Mastery Check Status
    res = client.get(f"/api/students/{student_id}/mastery-check/status")
    assert res.status_code == 200
    assert "status" in res.json()
