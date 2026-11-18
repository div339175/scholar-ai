import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal
from app.models.student import Student
from app.models.scholar import MasteryCheck, ScholarIntervention
from app.services.mastery_service import MasteryService
from app.services.mastery_assessment_service import MasteryAssessmentService
from app.services.scholar_knowledge_service import ScholarKnowledgeService
from app.services.scholar_orchestrator_service import ScholarOrchestratorService
from app.services.readiness_service import ReadinessService
from app.data.scholar_knowledge import SCHOLAR_KNOWLEDGE_BANK

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

def test_get_by_topic_returns_deterministic_results():
    """Test 1: get_by_topic returns deterministic results sorted identically on repeated calls."""
    res1 = ScholarKnowledgeService.get_by_topic("Sliding Window")
    res2 = ScholarKnowledgeService.get_by_topic("Sliding Window")

    assert len(res1) >= 4
    assert [i.knowledge_id for i in res1] == [i.knowledge_id for i in res2]
    assert all(i.topic == "Sliding Window" for i in res1)
    assert all(i.retrieval_reason == "topic_match" for i in res1)

def test_get_by_id_returns_correct_item():
    """Test 2: get_by_id returns the exact corresponding item."""
    item = ScholarKnowledgeService.get_by_id("sw_k01")
    assert item is not None
    assert item.knowledge_id == "sw_k01"
    assert item.topic == "Sliding Window"
    assert "Fixed vs Variable Window Invariants" in item.title
    assert item.source_type == "CURATED_PROTOTYPE"

def test_unknown_knowledge_id_returns_none():
    """Test 3: Unknown knowledge_id returns None gracefully."""
    item = ScholarKnowledgeService.get_by_id("non_existent_k99")
    assert item is None

def test_search_is_deterministic():
    """Test 4: search returns strictly identical ordering on repeated queries."""
    res1 = ScholarKnowledgeService.search(topic=None, query="invariant pointer")
    res2 = ScholarKnowledgeService.search(topic=None, query="invariant pointer")

    assert len(res1) > 0
    assert [i.knowledge_id for i in res1] == [i.knowledge_id for i in res2]

def test_topic_matching_works():
    """Test 5: Explicit topic scoping filters knowledge to the specified topic only."""
    res = ScholarKnowledgeService.search(topic="Dynamic Programming", query="state")
    assert len(res) > 0
    assert all(i.topic == "Dynamic Programming" for i in res)

def test_tag_matching_works():
    """Test 6: Tag matching correctly identifies items containing the tag."""
    res = ScholarKnowledgeService.search(topic=None, query="two-pointers")
    assert len(res) > 0
    assert any(i.knowledge_id == "sw_k01" for i in res)
    matching_item = next(i for i in res if i.knowledge_id == "sw_k01")
    assert matching_item.retrieval_reason == "tag_match"

def test_content_matching_works():
    """Test 7: Content matching identifies terms appearing in the body text."""
    res = ScholarKnowledgeService.search(topic=None, query="topological evaluation")
    assert len(res) > 0
    matching_item = next(i for i in res if i.knowledge_id == "dp_k02")
    assert matching_item.retrieval_reason == "content_keyword_match"

def test_source_type_is_always_curated_prototype():
    """Test 8: Every item in the knowledge base is explicitly labeled CURATED_PROTOTYPE."""
    for item in SCHOLAR_KNOWLEDGE_BANK:
        assert item.source_type == "CURATED_PROTOTYPE"

def test_alex_complete_mastery_check_retrieves_sliding_window_knowledge(client):
    """Test 9: Alex's COMPLETE_MASTERY_CHECK action retrieves Sliding Window conceptual knowledge."""
    resp = client.get("/api/students/student_alex/scholar/context")
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == "student_alex"
    assert data["action"] == "COMPLETE_MASTERY_CHECK"
    assert data["target_topic"] == "Sliding Window"
    assert len(data["knowledge"]) >= 4
    assert all(k["topic"] == "Sliding Window" for k in data["knowledge"])
    assert all(k["source_type"] == "CURATED_PROTOTYPE" for k in data["knowledge"])

def test_priya_continue_learning_does_not_invent_topic(client):
    """Test 10: Priya's CONTINUE_LEARNING has target_topic=null and returns knowledge=[]."""
    resp = client.get("/api/students/student_priya/scholar/context")
    assert resp.status_code == 200
    data = resp.json()
    assert data["student_id"] == "student_priya"
    assert data["action"] == "CONTINUE_LEARNING"
    assert data["target_topic"] is None
    assert data["knowledge"] == []

def test_student_state_is_not_modified_by_knowledge_retrieval(client, db_session):
    """Test 11: Querying knowledge endpoints is strictly read-only and does not mutate student state."""
    state_before = ScholarOrchestratorService.get_student_state(db_session, "student_alex")
    client.get("/api/students/student_alex/scholar/context")
    client.get("/api/students/student_alex/scholar/knowledge/topic/Sliding%20Window")
    client.get("/api/students/student_alex/scholar/knowledge/item/sw_k01")
    state_after = ScholarOrchestratorService.get_student_state(db_session, "student_alex")

    assert state_before.false_progress.index == state_after.false_progress.index
    assert state_before.capability.verified_capability_score == state_after.capability.verified_capability_score

def test_knowledge_retrieval_does_not_modify_readiness(client, db_session):
    """Test 12: Knowledge retrieval does not alter verified capability or readiness scores."""
    cap_before = ReadinessService.evaluate_verified_capability(db_session, "student_alex")
    client.get("/api/students/student_alex/scholar/context")
    cap_after = ReadinessService.evaluate_verified_capability(db_session, "student_alex")

    assert cap_before.verified_capability_score == cap_after.verified_capability_score
    assert cap_before.mastery_coverage == cap_after.mastery_coverage

def test_no_assessment_answer_keys_are_returned(client):
    """Test 13: Security check - ensure no assessment answer keys or expected concept notes leak."""
    resp = client.get("/api/students/student_alex/scholar/context")
    assert resp.status_code == 200
    text = resp.text
    assert "correct_answer" not in text
    assert "expected_concept" not in text
    assert "options" not in text

def test_unknown_student_returns_404(client):
    """Test 14: Unknown student returns 404 for context and knowledge endpoints."""
    resp1 = client.get("/api/students/unknown_student/scholar/context")
    assert resp1.status_code == 404

    resp2 = client.get("/api/students/unknown_student/scholar/knowledge/topic/Sliding%20Window")
    assert resp2.status_code == 404

    resp3 = client.get("/api/students/unknown_student/scholar/knowledge/item/sw_k01")
    assert resp3.status_code == 404
