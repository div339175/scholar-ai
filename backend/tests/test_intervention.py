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
from app.models.roadmap import RoadmapNode
from app.services.false_progress_detector import FalseProgressDetector
from app.services.intervention_service import InterventionService
from app.schemas.scholar import ActionType, RoadmapAction, PriorityLevel

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

def test_alex_receives_intervention(db_session):
    """Test 1: Verify Alex receives an intervention plan with intervention_required=True."""
    student = db_session.query(Student).filter(Student.id == "student_alex").first()
    telem = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_alex").all()
    roadmap = db_session.query(RoadmapNode).filter(RoadmapNode.student_id == "student_alex").all()
    diag = FalseProgressDetector.analyze_student(db_session, "student_alex")
    
    plan = InterventionService.generate_intervention(student, diag, telem, roadmap)
    assert plan.intervention_required is True
    assert plan.student_id == "student_alex"

def test_alex_intervention_is_high_priority(db_session):
    """Test 2: Verify Alex's intervention priority is HIGH."""
    student = db_session.query(Student).filter(Student.id == "student_alex").first()
    telem = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_alex").all()
    roadmap = db_session.query(RoadmapNode).filter(RoadmapNode.student_id == "student_alex").all()
    diag = FalseProgressDetector.analyze_student(db_session, "student_alex")
    
    plan = InterventionService.generate_intervention(student, diag, telem, roadmap)
    assert plan.priority == PriorityLevel.HIGH.value

def test_alex_roadmap_advancement_paused(db_session):
    """Test 3: Verify Alex's roadmap action is PAUSE_ADVANCEMENT."""
    student = db_session.query(Student).filter(Student.id == "student_alex").first()
    telem = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_alex").all()
    roadmap = db_session.query(RoadmapNode).filter(RoadmapNode.student_id == "student_alex").all()
    diag = FalseProgressDetector.analyze_student(db_session, "student_alex")
    
    plan = InterventionService.generate_intervention(student, diag, telem, roadmap)
    assert plan.roadmap_action == RoadmapAction.PAUSE_ADVANCEMENT.value

def test_alex_mastery_check_required(db_session):
    """Test 4: Verify Alex requires a mastery check."""
    student = db_session.query(Student).filter(Student.id == "student_alex").first()
    telem = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_alex").all()
    roadmap = db_session.query(RoadmapNode).filter(RoadmapNode.student_id == "student_alex").all()
    diag = FalseProgressDetector.analyze_student(db_session, "student_alex")
    
    plan = InterventionService.generate_intervention(student, diag, telem, roadmap)
    assert plan.mastery_check_required is True
    assert plan.mastery_check_topic is not None

def test_alex_target_topic_includes_sliding_window(db_session):
    """Test 5: Verify target topics include Sliding Window and primary topic is selected."""
    student = db_session.query(Student).filter(Student.id == "student_alex").first()
    telem = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_alex").all()
    roadmap = db_session.query(RoadmapNode).filter(RoadmapNode.student_id == "student_alex").all()
    diag = FalseProgressDetector.analyze_student(db_session, "student_alex")
    
    plan = InterventionService.generate_intervention(student, diag, telem, roadmap)
    assert "Sliding Window" in plan.target_topics
    assert plan.mastery_check_topic == "Sliding Window"

def test_alex_receives_multiple_intervention_steps(db_session):
    """Test 6: Verify Alex receives 4 structured intervention steps."""
    student = db_session.query(Student).filter(Student.id == "student_alex").first()
    telem = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_alex").all()
    roadmap = db_session.query(RoadmapNode).filter(RoadmapNode.student_id == "student_alex").all()
    diag = FalseProgressDetector.analyze_student(db_session, "student_alex")
    
    plan = InterventionService.generate_intervention(student, diag, telem, roadmap)
    assert len(plan.steps) == 4
    action_types = [s.action_type for s in plan.steps]
    assert action_types == [
        ActionType.CONCEPT_REVIEW.value,
        ActionType.GUIDED_PRACTICE.value,
        ActionType.INDEPENDENT_PROBLEM.value,
        ActionType.MASTERY_CHECK.value,
    ]

def test_hint_dependency_changes_intervention_behavior(db_session):
    """Test 7: Verify FP_HINT_CRUTCH trigger injects specific advice to reduce hint crutch."""
    student = db_session.query(Student).filter(Student.id == "student_alex").first()
    telem = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_alex").all()
    roadmap = db_session.query(RoadmapNode).filter(RoadmapNode.student_id == "student_alex").all()
    diag = FalseProgressDetector.analyze_student(db_session, "student_alex")
    
    plan = InterventionService.generate_intervention(student, diag, telem, roadmap)
    guided_step = next(s for s in plan.steps if s.action_type == ActionType.GUIDED_PRACTICE.value)
    assert "Reduce hint dependency" in guided_step.description

def test_brute_force_trigger_changes_intervention_behavior(db_session):
    """Test 8: Verify FP_BRUTE_FORCE trigger injects advice against trial-and-error submissions."""
    student = db_session.query(Student).filter(Student.id == "student_alex").first()
    telem = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_alex").all()
    roadmap = db_session.query(RoadmapNode).filter(RoadmapNode.student_id == "student_alex").all()
    diag = FalseProgressDetector.analyze_student(db_session, "student_alex")
    
    plan = InterventionService.generate_intervention(student, diag, telem, roadmap)
    guided_step = next(s for s in plan.steps if s.action_type == ActionType.GUIDED_PRACTICE.value)
    assert "Avoid repeated trial-and-error submissions" in guided_step.description

def test_priya_receives_no_remediation(db_session):
    """Test 9: Verify Priya (genuine mastery) does not require remediation."""
    student = db_session.query(Student).filter(Student.id == "student_priya").first()
    telem = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_priya").all()
    roadmap = db_session.query(RoadmapNode).filter(RoadmapNode.student_id == "student_priya").all()
    diag = FalseProgressDetector.analyze_student(db_session, "student_priya")
    
    plan = InterventionService.generate_intervention(student, diag, telem, roadmap)
    assert plan.intervention_required is False
    assert plan.priority == PriorityLevel.LOW.value
    assert plan.mastery_check_required is False

def test_priya_roadmap_action_is_continue(db_session):
    """Test 10: Verify Priya's roadmap action is CONTINUE."""
    student = db_session.query(Student).filter(Student.id == "student_priya").first()
    telem = db_session.query(CodingTelemetry).filter(CodingTelemetry.student_id == "student_priya").all()
    roadmap = db_session.query(RoadmapNode).filter(RoadmapNode.student_id == "student_priya").all()
    diag = FalseProgressDetector.analyze_student(db_session, "student_priya")
    
    plan = InterventionService.generate_intervention(student, diag, telem, roadmap)
    assert plan.roadmap_action == RoadmapAction.CONTINUE.value
    assert len(plan.steps) == 1
    assert plan.steps[0].action_type == ActionType.CONTINUE.value

def test_api_endpoint_intervention(client):
    """Test 11: Verify GET /api/students/{student_id}/intervention returns 200 with complete plan."""
    resp = client.get("/api/students/student_alex/intervention")
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == "student_alex"
    assert data["intervention_required"] is True
    assert data["priority"] == "HIGH"
    assert data["roadmap_action"] == "PAUSE_ADVANCEMENT"
    assert data["mastery_check_required"] is True
    assert data["mastery_check_topic"] == "Sliding Window"
    assert len(data["steps"]) == 4

    # Priya check
    resp_priya = client.get("/api/students/student_priya/intervention")
    assert resp_priya.status_code == 200
    data_priya = resp_priya.json()
    assert data_priya["student_id"] == "student_priya"
    assert data_priya["intervention_required"] is False
    assert data_priya["roadmap_action"] == "CONTINUE"

def test_missing_student_returns_404(client):
    """Test 12: Verify non-existent student returns 404."""
    resp = client.get("/api/students/non_existent_student/intervention")
    assert resp.status_code == 404
