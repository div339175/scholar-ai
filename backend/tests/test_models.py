import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal
from app.models.student import Student
from app.models.problem import CodingTelemetry
from app.models.roadmap import RoadmapNode
from app.services.readiness_service import ReadinessService

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

def test_database_initialization_and_demo_students(db_session):
    """Verify database is initialized and both demo students exist."""
    alex = db_session.query(Student).filter(Student.id == "student_alex").first()
    priya = db_session.query(Student).filter(Student.id == "student_priya").first()

    assert alex is not None, "Demo student Alex Sharma must exist"
    assert priya is not None, "Demo student Priya Mehta must exist"

    assert alex.name == "Alex Sharma"
    assert alex.career_goal == "Full-Stack Developer"
    assert alex.current_streak == 12
    assert alex.roadmap_completion == 72.0

    assert priya.name == "Priya Mehta"
    assert priya.career_goal == "Full-Stack Developer"

def test_get_student_endpoint(client):
    """Verify GET /api/students/{student_id}."""
    resp = client.get("/api/students/student_alex")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "student_alex"
    assert data["name"] == "Alex Sharma"
    assert data["roadmap_completion"] == 72.0

    # Non-existent student should return 404
    resp_404 = client.get("/api/students/non_existent_id")
    assert resp_404.status_code == 404

def test_get_telemetry_endpoint(client):
    """Verify GET /api/students/{student_id}/telemetry."""
    resp = client.get("/api/students/student_alex/telemetry")
    assert resp.status_code == 200
    telemetry_list = resp.json()
    assert len(telemetry_list) == 40, "Alex should have exactly 40 problem telemetry records"
    assert all("topic" in t and "hints_requested" in t for t in telemetry_list)

def test_post_telemetry_endpoint(client):
    """Verify POST /api/students/{student_id}/telemetry."""
    payload = {
        "problem_id": "prob_sw_01",
        "topic": "Sliding Window",
        "difficulty": "Easy",
        "submission_count": 1,
        "successful": True,
        "first_attempt_pass": True,
        "hints_requested": 0,
        "active_coding_duration_seconds": 450,
    }
    resp = client.post("/api/students/student_priya/telemetry", json=payload)
    assert resp.status_code == 201
    created = resp.json()
    assert created["student_id"] == "student_priya"
    assert created["topic"] == "Sliding Window"
    assert created["first_attempt_pass"] is True

def test_get_roadmap_endpoint(client):
    """Verify GET /api/students/{student_id}/roadmap."""
    resp = client.get("/api/students/student_alex/roadmap")
    assert resp.status_code == 200
    nodes = resp.json()
    assert len(nodes) >= 10
    node_types = {n["node_type"] for n in nodes}
    assert "NORMAL" in node_types

def test_post_roadmap_endpoint(client):
    """Verify POST /api/students/{student_id}/roadmap."""
    payload = {
        "title": "Remediation: Sliding Window Foundations",
        "topic": "Sliding Window",
        "status": "PENDING",
        "sequence": 11,
        "estimated_minutes": 90,
        "is_locked": False,
        "node_type": "REMEDIATION",
    }
    resp = client.post("/api/students/student_alex/roadmap", json=payload)
    assert resp.status_code == 201
    node = resp.json()
    assert node["node_type"] == "REMEDIATION"
    assert node["title"] == payload["title"]

def test_get_readiness_endpoint(client):
    """Verify GET /api/students/{student_id}/readiness."""
    resp = client.get("/api/students/student_alex/readiness")
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == "student_alex"
    assert "standard_readiness" in data
    assert "mastery_multiplier" in data
    assert "verified_capability_score" in data
    assert data["standard_readiness"] > 0

def test_get_interventions_endpoint(client):
    """Verify GET /api/students/{student_id}/interventions."""
    resp = client.get("/api/students/student_alex/interventions")
    assert resp.status_code == 200
    interventions = resp.json()
    assert len(interventions) >= 1
    assert interventions[0]["student_id"] == "student_alex"
    assert "mastery_checks" in interventions[0]

def test_false_progress_vs_genuine_mastery_profiles(db_session):
    """
    Verify the fundamental thesis:
    Student activity is not the same as student competence.
    """
    alex_readiness = ReadinessService.get_or_create_readiness(db_session, "student_alex")
    priya_readiness = ReadinessService.get_or_create_readiness(db_session, "student_priya")

    # Alex has higher roadmap completion and activity
    alex = db_session.query(Student).filter(Student.id == "student_alex").first()
    priya = db_session.query(Student).filter(Student.id == "student_priya").first()
    assert alex.roadmap_completion > priya.roadmap_completion
    assert alex.current_streak > priya.current_streak

    # But Alex has a significantly lower Mastery Multiplier due to hint dependency
    assert alex_readiness["mastery_multiplier"] < priya_readiness["mastery_multiplier"]

    # Consequently, Alex's Verified Capability Score (VCS) is much lower than Priya's
    assert alex_readiness["verified_capability_score"] < priya_readiness["verified_capability_score"]
