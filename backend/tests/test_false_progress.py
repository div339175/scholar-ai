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
from app.services.false_progress_detector import FalseProgressDetector

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

def test_alex_detected_as_false_progress(db_session):
    """Test 1: Verify Alex Sharma is correctly identified as False Progress."""
    result = FalseProgressDetector.analyze_student(db_session, "student_alex")
    assert result.is_false_progress is True
    assert result.false_progress_index >= 75.0
    assert result.severity in ("HIGH", "CRITICAL")
    assert "FP_HINT_CRUTCH" in result.trigger_codes
    assert "FP_LOW_INDEPENDENCE" in result.trigger_codes
    assert len(result.affected_topics) >= 2
    assert "Dynamic Programming" in result.affected_topics
    assert len(result.evidence) >= 5

def test_priya_not_falsely_flagged(db_session):
    """Test 2: Verify Priya Mehta (genuine mastery) is NOT flagged."""
    result = FalseProgressDetector.analyze_student(db_session, "student_priya")
    assert result.is_false_progress is False
    assert result.false_progress_index < 25.0
    assert result.severity == "LOW"
    assert len(result.trigger_codes) == 0
    assert len(result.affected_topics) == 0

def test_high_hint_dependency_triggers_crutch(db_session):
    """Test 3: Verify hint dependency > 0.50 triggers FP_HINT_CRUTCH."""
    temp_id = f"test_student_hint_{uuid.uuid4().hex[:6]}"
    student = Student(id=temp_id, name="Test Hint", career_goal="Dev", weekly_hours=10, current_streak=3, roadmap_completion=20)
    db_session.add(student)
    
    # 6 problems, 5 using hints
    for i in range(6):
        telem = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:8]}",
            student_id=temp_id,
            topic="Binary Search",
            difficulty="Medium",
            submission_count=1,
            successful=True,
            first_attempt_pass=True,
            hints_requested=2 if i < 5 else 0,
            active_coding_duration_seconds=900,
            timestamp=datetime.now(timezone.utc),
        )
        db_session.add(telem)
    db_session.commit()

    result = FalseProgressDetector.analyze_student(db_session, temp_id)
    assert "FP_HINT_CRUTCH" in result.trigger_codes

def test_low_first_pass_rate_triggers_independence_flag(db_session):
    """Test 4: Verify unassisted pass ratio < 0.40 triggers FP_LOW_INDEPENDENCE."""
    temp_id = f"test_student_indep_{uuid.uuid4().hex[:6]}"
    student = Student(id=temp_id, name="Test Indep", career_goal="Dev", weekly_hours=10, current_streak=3, roadmap_completion=30)
    db_session.add(student)

    # 10 problems, only 2 first attempt passes (20%)
    for i in range(10):
        telem = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:8]}",
            student_id=temp_id,
            topic="Trees",
            difficulty="Medium",
            submission_count=2,
            successful=True,
            first_attempt_pass=(i < 2),
            hints_requested=0,
            active_coding_duration_seconds=1000,
            timestamp=datetime.now(timezone.utc),
        )
        db_session.add(telem)
    db_session.commit()

    result = FalseProgressDetector.analyze_student(db_session, temp_id)
    assert "FP_LOW_INDEPENDENCE" in result.trigger_codes

def test_repeated_submissions_trigger_brute_force(db_session):
    """Test 5: Verify problems requiring >= 5 submissions trigger FP_BRUTE_FORCE."""
    temp_id = f"test_student_brute_{uuid.uuid4().hex[:6]}"
    student = Student(id=temp_id, name="Test Brute", career_goal="Dev", weekly_hours=10, current_streak=4, roadmap_completion=25)
    db_session.add(student)

    # 6 problems with high retry count
    for i in range(6):
        telem = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:8]}",
            student_id=temp_id,
            topic="Graphs",
            difficulty="Medium",
            submission_count=6,
            successful=True,
            first_attempt_pass=False,
            hints_requested=0,
            active_coding_duration_seconds=1200,
            timestamp=datetime.now(timezone.utc),
        )
        db_session.add(telem)
    db_session.commit()

    result = FalseProgressDetector.analyze_student(db_session, temp_id)
    assert "FP_BRUTE_FORCE" in result.trigger_codes

def test_repeated_topic_failures_trigger_concept_blindspot(db_session):
    """Test 6: Verify repeated weak performance in a specific topic triggers FP_CONCEPT_BLINDSPOT."""
    temp_id = f"test_student_blind_{uuid.uuid4().hex[:6]}"
    student = Student(id=temp_id, name="Test Blindspot", career_goal="Dev", weekly_hours=10, current_streak=4, roadmap_completion=25)
    db_session.add(student)

    for i in range(5):
        telem = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:8]}",
            student_id=temp_id,
            topic="Dynamic Programming",
            difficulty="Medium",
            submission_count=4,
            successful=True,
            first_attempt_pass=False,
            hints_requested=2,
            active_coding_duration_seconds=1500,
            timestamp=datetime.now(timezone.utc),
        )
        db_session.add(telem)
    db_session.commit()

    result = FalseProgressDetector.analyze_student(db_session, temp_id)
    assert "FP_CONCEPT_BLINDSPOT" in result.trigger_codes
    assert "Dynamic Programming" in result.affected_topics

def test_velocity_vs_mastery_trigger(db_session):
    """Test 7: Verify roadmap_completion >= 60% and pass_ratio < 50% triggers FP_VELOCITY_DECAY."""
    temp_id = f"test_student_velo_{uuid.uuid4().hex[:6]}"
    student = Student(id=temp_id, name="Test Velocity", career_goal="Dev", weekly_hours=10, current_streak=4, roadmap_completion=70.0)
    db_session.add(student)

    # 8 problems, 3 first passes (37.5%)
    for i in range(8):
        telem = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:8]}",
            student_id=temp_id,
            topic="Arrays",
            difficulty="Easy",
            submission_count=2,
            successful=True,
            first_attempt_pass=(i < 3),
            hints_requested=0,
            active_coding_duration_seconds=800,
            timestamp=datetime.now(timezone.utc),
        )
        db_session.add(telem)
    db_session.commit()

    result = FalseProgressDetector.analyze_student(db_session, temp_id)
    assert "FP_VELOCITY_DECAY" in result.trigger_codes

def test_shallow_consistency_trigger(db_session):
    """Test 8: Verify streak >= 7 and unassisted pass < 40% triggers FP_SHALLOW_CONSISTENCY."""
    temp_id = f"test_student_streak_{uuid.uuid4().hex[:6]}"
    student = Student(id=temp_id, name="Test Streak", career_goal="Dev", weekly_hours=10, current_streak=10, roadmap_completion=30.0)
    db_session.add(student)

    for i in range(6):
        telem = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:8]}",
            student_id=temp_id,
            topic="Strings",
            difficulty="Easy",
            submission_count=2,
            successful=True,
            first_attempt_pass=(i == 0), # 16.7% first pass
            hints_requested=1,
            active_coding_duration_seconds=900,
            timestamp=datetime.now(timezone.utc),
        )
        db_session.add(telem)
    db_session.commit()

    result = FalseProgressDetector.analyze_student(db_session, temp_id)
    assert "FP_SHALLOW_CONSISTENCY" in result.trigger_codes

def test_false_progress_index_bounds(db_session):
    """Test 9: Verify index is bounded strictly within [0.0, 100.0]."""
    alex_res = FalseProgressDetector.analyze_student(db_session, "student_alex")
    priya_res = FalseProgressDetector.analyze_student(db_session, "student_priya")

    assert 0.0 <= alex_res.false_progress_index <= 100.0
    assert 0.0 <= priya_res.false_progress_index <= 100.0

def test_insufficient_data_produces_no_false_flag(db_session):
    """Test 10: Verify students with < 5 problems return is_false_progress=False."""
    temp_id = f"test_student_new_{uuid.uuid4().hex[:6]}"
    student = Student(id=temp_id, name="Newbie", career_goal="Dev", weekly_hours=10, current_streak=1, roadmap_completion=5.0)
    db_session.add(student)

    # Only 2 problems
    for i in range(2):
        telem = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:8]}",
            student_id=temp_id,
            topic="Basics",
            difficulty="Easy",
            submission_count=4,
            successful=True,
            first_attempt_pass=False,
            hints_requested=3,
            active_coding_duration_seconds=1200,
            timestamp=datetime.now(timezone.utc),
        )
        db_session.add(telem)
    db_session.commit()

    result = FalseProgressDetector.analyze_student(db_session, temp_id)
    assert result.is_false_progress is False
    assert result.false_progress_index == 0.0
    assert "Insufficient behavioural evidence" in result.diagnosis

def test_api_endpoint_false_progress(client):
    """Test 11: Verify GET /api/students/{student_id}/false-progress returns structured diagnostic."""
    resp = client.get("/api/students/student_alex/false-progress")
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == "student_alex"
    assert data["is_false_progress"] is True
    assert data["false_progress_index"] >= 75.0
    assert data["severity"] in ("HIGH", "CRITICAL")
    assert len(data["evidence"]) >= 5
    assert "diagnosis" in data
    assert "recommended_action" in data

    # Priya check via API
    resp_priya = client.get("/api/students/student_priya/false-progress")
    assert resp_priya.status_code == 200
    data_priya = resp_priya.json()
    assert data_priya["student_id"] == "student_priya"
    assert data_priya["is_false_progress"] is False
    assert data_priya["false_progress_index"] < 25.0
