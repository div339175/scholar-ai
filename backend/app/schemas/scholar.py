from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Any
from enum import Enum

class ActionType(str, Enum):
    CONCEPT_REVIEW = "CONCEPT_REVIEW"
    GUIDED_PRACTICE = "GUIDED_PRACTICE"
    INDEPENDENT_PROBLEM = "INDEPENDENT_PROBLEM"
    MASTERY_CHECK = "MASTERY_CHECK"
    ROADMAP_REPLAN = "ROADMAP_REPLAN"
    CONTINUE = "CONTINUE"

class InterventionType(str, Enum):
    FALSE_PROGRESS_REMEDIATION = "FALSE_PROGRESS_REMEDIATION"
    CONCEPT_REMEDIATION = "CONCEPT_REMEDIATION"
    MASTERY_VALIDATION = "MASTERY_VALIDATION"
    CONTINUE_NORMAL = "CONTINUE_NORMAL"

class RoadmapAction(str, Enum):
    PAUSE_ADVANCEMENT = "PAUSE_ADVANCEMENT"
    INSERT_REMEDIATION = "INSERT_REMEDIATION"
    REPEAT_CONCEPT = "REPEAT_CONCEPT"
    CONTINUE = "CONTINUE"
    RESUME_ROADMAP = "RESUME_ROADMAP"
    CONTINUE_REMEDIATION = "CONTINUE_REMEDIATION"
    COLLECT_MORE_EVIDENCE = "COLLECT_MORE_EVIDENCE"

class MasteryDecision(str, Enum):
    MASTERED = "MASTERED"
    NOT_MASTERED = "NOT_MASTERED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"

class PriorityLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class DiagnosticEvidence(BaseModel):
    trigger_code: str
    metric: str
    observed_value: float
    threshold: float
    interpretation: str

    model_config = ConfigDict(from_attributes=True)

class FalseProgressDiagnosticResponse(BaseModel):
    student_id: str
    is_false_progress: bool
    false_progress_index: float
    severity: str
    confidence: float
    trigger_codes: List[str]
    affected_topics: List[str]
    evidence: List[DiagnosticEvidence]
    diagnosis: str
    recommended_action: str

    model_config = ConfigDict(from_attributes=True)

class InterventionStep(BaseModel):
    step_number: int
    title: str
    description: str
    action_type: str
    target_topic: str
    estimated_minutes: int
    success_condition: str

    model_config = ConfigDict(from_attributes=True)

class InterventionPlan(BaseModel):
    student_id: str
    intervention_required: bool
    intervention_type: str
    priority: str
    headline: str
    diagnosis_summary: str
    target_topics: List[str]
    steps: List[InterventionStep]
    mastery_check_required: bool
    mastery_check_topic: Optional[str] = None
    roadmap_action: str
    success_criteria: str

    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Step 4 & 5: Evidence-Based Assessment & Mastery Check Models
# ---------------------------------------------------------------------------

class MasteryEvidenceItem(BaseModel):
    metric: str
    observed_value: Any
    requirement: str
    status: str  # "PASS", "FAIL", "MISSING"

class MasteryAssessmentQuestion(BaseModel):
    """
    Student-facing assessment question.
    Strictly excludes internal correct_answer to prevent leakage.
    """
    question_id: str
    topic: str
    question_text: str
    options: List[str]
    difficulty: str

    model_config = ConfigDict(from_attributes=True)

class MasteryAssessmentSubmission(BaseModel):
    """
    Student submission payload for conceptual evaluation.
    """
    topic: str
    question_id: str
    answer: str
    student_id: Optional[str] = None

class MasteryAssessmentResult(BaseModel):
    """
    Deterministic result of evaluating student's conceptual answer.
    """
    student_id: str
    topic: str
    question_id: str
    correct: bool
    score: float
    evidence: List[MasteryEvidenceItem]
    next_action: str

    model_config = ConfigDict(from_attributes=True)

class MasteryCheckRequest(BaseModel):
    student_id: str
    topic: str
    problem_id: str
    hints_used: Optional[int] = None
    attempts: Optional[int] = None
    solved: Optional[bool] = None
    conceptual_score: Optional[float] = None

class MasteryCheckResult(BaseModel):
    student_id: str
    topic: str
    problem_id: str
    passed: bool
    independent: bool
    conceptual_score: Optional[float] = None
    attempt_count: Optional[int] = None
    hint_count: Optional[int] = None
    mastery_score: Optional[float] = None
    decision: str  # "MASTERED", "NOT_MASTERED", "INSUFFICIENT_EVIDENCE"
    evidence: List[MasteryEvidenceItem]
    next_action: str  # "RESUME_ROADMAP", "CONTINUE_REMEDIATION", "COLLECT_MORE_EVIDENCE"
    baseline_comparison: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class MasteryCheckStatusResponse(BaseModel):
    student_id: str
    status: str  # "RECORDED", "NO_RECORDED_CHECK"
    latest_result: Optional[MasteryCheckResult] = None
    message: str

class MasteryCheckResponse(BaseModel):
    id: str
    intervention_id: str
    question: str
    expected_concept: str
    student_answer: Optional[str] = None
    passed: Optional[bool] = None
    score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class ScholarInterventionResponse(BaseModel):
    id: str
    student_id: str
    trigger_type: str
    topic: str
    severity: str
    reason: str
    recommended_action: str
    status: str
    created_at: datetime
    mastery_checks: List[MasteryCheckResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ScholarAction(str, Enum):
    CONTINUE_LEARNING = "CONTINUE_LEARNING"
    COMPLETE_MASTERY_CHECK = "COMPLETE_MASTERY_CHECK"
    REVIEW_CONCEPT = "REVIEW_CONCEPT"
    COMPLETE_REMEDIATION = "COMPLETE_REMEDIATION"
    RESUME_ROADMAP = "RESUME_ROADMAP"
    COLLECT_MORE_EVIDENCE = "COLLECT_MORE_EVIDENCE"

class FalseProgressSummary(BaseModel):
    detected: bool
    index: float
    severity: str
    triggers: List[str]

class InterventionSummary(BaseModel):
    required: bool
    type: str
    priority: str
    target_topics: List[str]
    roadmap_action: str

class MasterySummary(BaseModel):
    status: str  # "RECORDED", "NO_RECORDED_CHECK"
    topic: Optional[str] = None
    decision: Optional[str] = None
    conceptual_score: Optional[float] = None
    conceptual_score_source: Optional[str] = None
    independent_success: Optional[bool] = None

class RoadmapSummary(BaseModel):
    action: str
    topic: Optional[str] = None
    evidence_status: str

class CapabilitySummary(BaseModel):
    standard_readiness_score: float
    verified_capability_score: float
    readiness_status: str
    mastery_coverage: float
    mastery_confidence_multiplier: float

class ScholarStudentState(BaseModel):
    student_id: str
    false_progress: FalseProgressSummary
    intervention: InterventionSummary
    mastery: MasterySummary
    roadmap: RoadmapSummary
    capability: CapabilitySummary
    evidence_chain: List[str]

    model_config = ConfigDict(from_attributes=True)

class ScholarNextAction(BaseModel):
    student_id: str
    action: str
    target_topic: Optional[str] = None
    reason: str
    source_components: List[str]
    evidence: List[Any]

    model_config = ConfigDict(from_attributes=True)

class ScholarKnowledgeItem(BaseModel):
    knowledge_id: str
    topic: str
    title: str
    content: str
    difficulty: str
    source_type: str = "CURATED_PROTOTYPE"
    tags: List[str]

    model_config = ConfigDict(from_attributes=True)

class ScholarKnowledgeRetrieval(BaseModel):
    knowledge_id: str
    topic: str
    title: str
    content: str
    difficulty: str
    source_type: str = "CURATED_PROTOTYPE"
    tags: List[str]
    retrieval_reason: str

    model_config = ConfigDict(from_attributes=True)

class ScholarGroundedContext(BaseModel):
    student_id: str
    action: str
    target_topic: Optional[str] = None
    knowledge: List[ScholarKnowledgeRetrieval]
    evidence_sources: List[str]

    model_config = ConfigDict(from_attributes=True)

class ResponseEvidenceItem(BaseModel):
    source: str
    detail: str

    model_config = ConfigDict(from_attributes=True)

class ScholarResponse(BaseModel):
    student_id: str
    action: str
    headline: str
    message: str
    target_topic: Optional[str] = None
    why_this_action: str
    evidence: List[ResponseEvidenceItem]
    knowledge: List[ScholarKnowledgeRetrieval]
    next_step: str
    confidence: str
    source_types: List[str]

    model_config = ConfigDict(from_attributes=True)


class ScholarIntent(str, Enum):
    NEXT_ACTION = "NEXT_ACTION"
    WHY_THIS_ACTION = "WHY_THIS_ACTION"
    EXPLAIN_TOPIC = "EXPLAIN_TOPIC"
    MASTERY_STATUS = "MASTERY_STATUS"
    READINESS_STATUS = "READINESS_STATUS"
    ROADMAP_STATUS = "ROADMAP_STATUS"
    FALSE_PROGRESS_STATUS = "FALSE_PROGRESS_STATUS"
    INTERVENTION_STATUS = "INTERVENTION_STATUS"
    UNKNOWN = "UNKNOWN"


class ScholarConversationRequest(BaseModel):
    message: str
    student_id: Optional[str] = None


class ScholarConversationResponse(BaseModel):
    student_id: str
    intent: str
    response: str
    target_topic: Optional[str] = None
    evidence_sources: List[str]
    knowledge: List[ScholarKnowledgeRetrieval]
    action: Optional[str] = None
    requires_action: bool

    model_config = ConfigDict(from_attributes=True)




