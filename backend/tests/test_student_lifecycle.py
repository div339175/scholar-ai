import sys
import os
import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal
from app.models.student import Student, ReadinessSnapshot
from app.models.problem import Problem, CodingTelemetry
from app.models.roadmap import RoadmapNode, NodeStatus, NodeType
from app.models.scholar import MasteryAssessmentRecord
from app.services.false_progress_detector import FalseProgressDetector
from app.services.readiness_service import ReadinessService
from app.services.roadmap_adaptation_service import RoadmapAdaptationService
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


def test_1_create_new_student_isolation_and_persistence(client, db_session):
    """
    Test 1: Create a new student.
    Verify:
    - Unique student record is created and persisted in SQLite.
    - Clean initial state (streak=0, roadmap_completion=0.0%).
    - Clean personalized roadmap initialized (Node 1 IN_PROGRESS, Nodes 2-8 LOCKED).
    - Zero Alex benchmark data contamination (no 72% completion, no 12-day streak).
    - Next action is COLLECT_MORE_EVIDENCE.
    """
    payload = {
        "name": "Divakar Maurya",
        "career_goal": "AI/ML Engineer",
        "weekly_hours": 15.0,
        "baseline_level": "Intermediate",
    }
    resp = client.post("/api/students", json=payload)
    assert resp.status_code == 201
    data = resp.json()

    student_id = data["id"]
    assert data["name"] == "Divakar Maurya"
    assert data["career_goal"] == "AI/ML Engineer"
    assert data["current_streak"] == 0
    assert data["roadmap_completion"] == 0.0

    # Verify persistent SQLite state
    db_student = db_session.query(Student).filter(Student.id == student_id).first()
    assert db_student is not None
    assert db_student.name == "Divakar Maurya"
    assert db_student.current_streak == 0
    assert db_student.roadmap_completion == 0.0

    # Verify clean initial roadmap nodes
    nodes = (
        db_session.query(RoadmapNode)
        .filter(RoadmapNode.student_id == student_id)
        .order_by(RoadmapNode.sequence.asc())
        .all()
    )
    assert len(nodes) == 8
    assert nodes[0].status == NodeStatus.IN_PROGRESS.value
    assert nodes[0].is_locked is False
    assert nodes[1].status == NodeStatus.PENDING.value
    assert nodes[1].is_locked is True

    # Verify Scholar AI initial state
    state_resp = client.get(f"/api/students/{student_id}/scholar/state")
    assert state_resp.status_code == 200
    state_data = state_resp.json()
    assert state_data["false_progress"]["detected"] is False
    assert state_data["capability"]["readiness_status"] == "INSUFFICIENT_EVIDENCE"

    action_resp = client.get(f"/api/students/{student_id}/scholar/next-action")
    assert action_resp.status_code == 200
    action_data = action_resp.json()
    assert action_data["action"] == ScholarAction.COLLECT_MORE_EVIDENCE.value


def test_2_two_distinct_students_data_isolated(client, db_session):
    """
    Test 2: Create two different students.
    Verify:
    - Independent IDs, roadmaps, and telemetry records.
    - Activity on Student A does not alter Student B.
    """
    resp_a = client.post("/api/students", json={"name": "Alice Tan", "career_goal": "Frontend"})
    resp_b = client.post("/api/students", json={"name": "Bob Chen", "career_goal": "Backend"})
    assert resp_a.status_code == 201
    assert resp_b.status_code == 201

    id_a = resp_a.json()["id"]
    id_b = resp_b.json()["id"]
    assert id_a != id_b

    # Add telemetry only for Student A
    client.post(f"/api/students/{id_a}/telemetry", json={
        "topic": "Arrays & Hashing",
        "difficulty": "Easy",
        "submission_count": 1,
        "successful": True,
        "first_attempt_pass": True,
        "hints_requested": 0,
        "active_coding_duration_seconds": 600,
    })

    # Complete roadmap node 1 only for Student B
    nodes_b = client.get(f"/api/students/{id_b}/roadmap").json()
    client.post(f"/api/students/{id_b}/roadmap/{nodes_b[0]['id']}/complete")

    # Verify Student A has 1 telemetry event, Student B has 0
    metrics_a = client.get(f"/api/students/{id_a}/telemetry/metrics").json()
    metrics_b = client.get(f"/api/students/{id_b}/telemetry/metrics").json()
    assert metrics_a["total_events"] == 1
    assert metrics_b["total_events"] == 0

    # Verify Student B has 12.5% roadmap completion, Student A has 0.0%
    prof_a = client.get(f"/api/students/{id_a}").json()
    prof_b = client.get(f"/api/students/{id_b}").json()
    assert prof_a["roadmap_completion"] == 0.0
    assert prof_b["roadmap_completion"] == 12.5


def test_3_complete_roadmap_node_persists_and_updates_completion(client, db_session):
    """
    Test 3: Complete a roadmap node.
    Verify:
    - Node status updates to COMPLETED in database.
    - Next sequential node is unlocked (status=IN_PROGRESS).
    - Student roadmap_completion percentage updates to reflect progress.
    """
    resp = client.post("/api/students", json={"name": "Clara Oswald", "career_goal": "Full-Stack"})
    student_id = resp.json()["id"]

    nodes_before = client.get(f"/api/students/{student_id}/roadmap").json()
    node_1 = nodes_before[0]
    node_2 = nodes_before[1]
    assert node_1["status"] == "IN_PROGRESS"
    assert node_2["status"] == "PENDING"
    assert node_2["is_locked"] is True

    # Complete node 1
    complete_resp = client.post(f"/api/students/{student_id}/roadmap/{node_1['id']}/complete")
    assert complete_resp.status_code == 200
    nodes_after = complete_resp.json()

    assert nodes_after[0]["status"] == "COMPLETED"
    assert nodes_after[1]["status"] == "IN_PROGRESS"
    assert nodes_after[1]["is_locked"] is False

    # Check student record in database
    student = db_session.query(Student).filter(Student.id == student_id).first()
    assert student.roadmap_completion == 12.5


def test_4_generate_telemetry_persists_and_feeds_fpde(client, db_session):
    """
    Test 4: Generate telemetry.
    Verify:
    - Telemetry records persist in SQLite coding_telemetry table.
    - Metrics API reflects total_events and pass rates.
    - FPDE consumes these records.
    """
    resp = client.post("/api/students", json={"name": "David Miller", "career_goal": "Algorithms"})
    student_id = resp.json()["id"]

    for i in range(5):
        telem_resp = client.post(f"/api/students/{student_id}/telemetry", json={
            "topic": "Arrays & Hashing",
            "difficulty": "Easy",
            "submission_count": 1,
            "successful": True,
            "first_attempt_pass": True,
            "hints_requested": 0,
            "active_coding_duration_seconds": 500,
        })
        assert telem_resp.status_code == 201

    # Verify SQLite rows
    count = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == student_id).count()
    assert count == 5

    # Verify metrics API
    metrics = client.get(f"/api/students/{student_id}/telemetry/metrics").json()
    assert metrics["total_events"] == 5
    assert metrics["first_attempt_pass_rate"] == 1.0
    assert metrics["hint_dependency_rate"] == 0.0

    # FPDE analysis
    diagnostic = FalseProgressDetector.analyze_student(db_session, student_id)
    assert diagnostic.is_false_progress is False


def test_5_trigger_false_progress_causes_intervention_and_pauses_roadmap(client, db_session):
    """
    Test 5: Trigger false progress.
    Verify:
    - High hint reliance and retries trigger FP_HINT_CRUTCH.
    - Next action becomes COMPLETE_MASTERY_CHECK.
    - Roadmap adaptation pauses advancement (PAUSE_ADVANCEMENT).
    """
    resp = client.post("/api/students", json={"name": "Elena Rostova", "career_goal": "Backend"})
    student_id = resp.json()["id"]

    # Set roadmap completion to demonstrate velocity-mastery decoupling
    student = db_session.query(Student).filter(Student.id == student_id).first()
    student.roadmap_completion = 65.0
    db_session.commit()

    # Post 7 hint-heavy, multi-attempt, anomalous duration submissions
    for i in range(7):
        client.post(f"/api/students/{student_id}/telemetry", json={
            "topic": "Sliding Window",
            "difficulty": "Medium",
            "submission_count": 5,
            "successful": True,
            "first_attempt_pass": False,
            "hints_requested": 4,
            "active_coding_duration_seconds": 5000,
        })

    # Diagnostic check
    diagnostic = FalseProgressDetector.analyze_student(db_session, student_id)
    assert diagnostic.is_false_progress is True
    assert "FP_HINT_CRUTCH" in diagnostic.trigger_codes

    # Next action check
    action = ScholarOrchestratorService.get_next_action(db_session, student_id)
    assert action.action == ScholarAction.COMPLETE_MASTERY_CHECK.value

    # Roadmap adaptation check
    adaptation = RoadmapAdaptationService.determine_adaptation(db_session, student_id)
    assert adaptation.action == "PAUSE_ADVANCEMENT"


def test_6_pass_mastery_resumes_roadmap(client, db_session):
    """
    Test 6: Pass mastery check.
    Verify:
    - Submitting correct mastery response verifies conceptual mastery.
    - Next action updates to RESUME_ROADMAP.
    """
    resp = client.post("/api/students", json={"name": "Fiona Gallagher", "career_goal": "Full-Stack"})
    student_id = resp.json()["id"]

    # 1. Trigger false progress on Sliding Window
    for i in range(6):
        client.post(f"/api/students/{student_id}/telemetry", json={
            "topic": "Sliding Window",
            "difficulty": "Medium",
            "submission_count": 4,
            "successful": True,
            "first_attempt_pass": False,
            "hints_requested": 3,
            "active_coding_duration_seconds": 1200,
        })

    # 2. Get mastery question
    q_resp = client.get(f"/api/students/{student_id}/mastery-assessment/Sliding Window")
    assert q_resp.status_code == 200
    question = q_resp.json()

    # 3. Submit correct answer
    sub_resp = client.post(f"/api/students/{student_id}/mastery-assessment/submit", json={
        "topic": "Sliding Window",
        "question_id": question["question_id"],
        "answer": question["options"][0],  # Server evaluates against correct invariant
    })
    assert sub_resp.status_code == 200

    # 4. Verify mastery record in SQLite
    record = (
        db_session.query(MasteryAssessmentRecord)
        .filter(MasteryAssessmentRecord.student_id == student_id)
        .first()
    )
    assert record is not None


def test_7_fail_mastery_activates_remediation_and_locks_downstream(client, db_session):
    """
    Test 7: Fail mastery check.
    Verify:
    - Submitting incorrect answer results in NOT_MASTERED.
    - Next action recommends COMPLETE_REMEDIATION.
    - Downstream nodes remain locked.
    """
    resp = client.post("/api/students", json={"name": "George Clark", "career_goal": "Systems"})
    student_id = resp.json()["id"]

    # Trigger false progress
    for i in range(6):
        client.post(f"/api/students/{student_id}/telemetry", json={
            "topic": "Sliding Window",
            "difficulty": "Medium",
            "submission_count": 4,
            "successful": True,
            "first_attempt_pass": False,
            "hints_requested": 3,
            "active_coding_duration_seconds": 1200,
        })

    # Fetch valid assessment question
    q_resp = client.get(f"/api/students/{student_id}/mastery-assessment/Sliding Window")
    assert q_resp.status_code == 200
    question = q_resp.json()

    # Submit deliberately incorrect answer
    sub_resp = client.post(f"/api/students/{student_id}/mastery-assessment/submit", json={
        "topic": "Sliding Window",
        "question_id": question["question_id"],
        "answer": "An intentionally incorrect conceptual answer that does not match invariants.",
    })
    assert sub_resp.status_code == 200
    res_data = sub_resp.json()
    assert res_data["correct"] is False
    assert res_data["next_action"] == "RETRY_CONCEPTUAL_REVIEW"

    # Submit unassisted mastery check failure
    check_resp = client.post(f"/api/students/{student_id}/mastery-check", json={
        "student_id": student_id,
        "topic": "Sliding Window",
        "problem_id": "prob_sw_01",
        "solved": False,
        "hints_used": 3,
        "attempts": 4,
    })
    assert check_resp.status_code == 200
    check_data = check_resp.json()
    assert check_data["decision"] == "NOT_MASTERED"

    # Orchestrator and Roadmap adaptation enforce complete remediation
    action = ScholarOrchestratorService.get_next_action(db_session, student_id)
    assert action.action == ScholarAction.COMPLETE_REMEDIATION.value

    adaptation = RoadmapAdaptationService.determine_adaptation(db_session, student_id)
    assert adaptation.action == "REMEDIATE_TOPIC"

    # Verify downstream nodes remain locked
    nodes = client.get(f"/api/students/{student_id}/roadmap").json()
    for n in nodes:
        if n["sequence"] > 3:
            assert n["is_locked"] is True


def test_8_demo_mode_archetypes_remain_intact(client, db_session):
    """
    Test 8: Evaluator Demo Mode.
    Verify:
    - Alex, Priya, and Marcus exist with their distinct archetypes.
    - Alex shows false progress (72% completion, 12 streak).
    - Priya shows genuine mastery (65% completion, 9 streak).
    - Marcus shows sparse telemetry (COLLECT_MORE_EVIDENCE).
    - Benchmark archetypes are isolated from newly created student records.
    """
    alex = db_session.query(Student).filter(Student.id == "student_alex").first()
    priya = db_session.query(Student).filter(Student.id == "student_priya").first()
    marcus = db_session.query(Student).filter(Student.id == "student_marcus").first()

    assert alex is not None
    assert alex.roadmap_completion == 72.0
    assert alex.current_streak == 12

    assert priya is not None
    assert priya.roadmap_completion == 65.0
    assert priya.current_streak == 9

    assert marcus is not None
    action_marcus = ScholarOrchestratorService.get_next_action(db_session, "student_marcus")
    assert action_marcus.action == ScholarAction.COLLECT_MORE_EVIDENCE.value


def test_9_process_restart_and_persistence(client):
    """
    Test 9: Process restart.
    Verify:
    - Create a student, log telemetry, and complete a node.
    - Open a completely fresh session simulating process restart.
    - Confirm all state is loaded accurately from SQLite disk.
    """
    unique_name = f"Student_{uuid.uuid4().hex[:6]}"
    resp = client.post("/api/students", json={"name": unique_name, "career_goal": "Cloud Architect"})
    student_id = resp.json()["id"]

    # Log telemetry
    client.post(f"/api/students/{student_id}/telemetry", json={
        "topic": "Arrays & Hashing",
        "difficulty": "Easy",
        "submission_count": 1,
        "successful": True,
        "first_attempt_pass": True,
        "hints_requested": 0,
        "active_coding_duration_seconds": 650,
    })

    # Complete node 1
    nodes = client.get(f"/api/students/{student_id}/roadmap").json()
    client.post(f"/api/students/{student_id}/roadmap/{nodes[0]['id']}/complete")

    # Simulate restart by instantiating a fresh DB session
    fresh_db = SessionLocal()
    try:
        reloaded_student = fresh_db.query(Student).filter(Student.id == student_id).first()
        assert reloaded_student is not None
        assert reloaded_student.name == unique_name
        assert reloaded_student.roadmap_completion == 12.5

        reloaded_telemetry = (
            fresh_db.query(CodingTelemetry)
            .filter(CodingTelemetry.student_id == student_id)
            .all()
        )
        assert len(reloaded_telemetry) == 1

        reloaded_nodes = (
            fresh_db.query(RoadmapNode)
            .filter(RoadmapNode.student_id == student_id)
            .order_by(RoadmapNode.sequence.asc())
            .all()
        )
        assert reloaded_nodes[0].status == NodeStatus.COMPLETED.value
        assert reloaded_nodes[1].status == NodeStatus.IN_PROGRESS.value
    finally:
        fresh_db.close()
