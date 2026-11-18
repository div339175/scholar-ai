export interface FalseProgressSummary {
  detected: boolean;
  index: number;
  severity: string;
  triggers: string[];
}

export interface InterventionSummary {
  required: boolean;
  type: string;
  priority: string;
  target_topics: string[];
  roadmap_action: string;
}

export interface MasterySummary {
  status: string;
  topic: string | null;
  decision: string | null;
  conceptual_score: number | null;
  conceptual_score_source: string | null;
  independent_success: boolean | null;
}

export interface RoadmapSummary {
  action: string;
  topic: string | null;
  evidence_status: string;
}

export interface CapabilitySummary {
  standard_readiness_score: number;
  verified_capability_score: number;
  readiness_status: string;
  mastery_coverage: number;
  mastery_confidence_multiplier: number;
}

export interface ScholarStudentState {
  student_id: string;
  false_progress: FalseProgressSummary;
  intervention: InterventionSummary;
  mastery: MasterySummary;
  roadmap: RoadmapSummary;
  capability: CapabilitySummary;
  evidence_chain: string[];
}

export interface ScholarNextAction {
  student_id: string;
  action: string;
  target_topic: string | null;
  reason: string;
  source_components: string[];
  evidence?: any[];
}

export interface ScholarKnowledgeRetrieval {
  knowledge_id: string;
  topic: string;
  title: string;
  content: string;
  difficulty: string;
  source_type: string;
  tags: string[];
  retrieval_reason?: string;
}

export interface ScholarConversationResponse {
  student_id: string;
  intent: string;
  response: string;
  target_topic: string | null;
  evidence_sources: string[];
  knowledge: ScholarKnowledgeRetrieval[];
  action: string | null;
  requires_action: boolean;
}

export interface ReadinessEvidenceItem {
  metric: string;
  observed_value: any;
  requirement: string;
  status: string;
}

export interface MasteryEvidenceItem {
  metric: string;
  observed_value: any;
  requirement: string;
  status: string;
}

export interface VerifiedCapabilityResponse {
  student_id: string;
  standard_readiness_score: number;
  verified_capability_score: number;
  mastery_coverage: number;
  mastery_confidence_multiplier: number;
  readiness_status: string;
  evidence_status: string;
  verified_topics: string[];
  unverified_topics: string[];
  false_progress_detected: boolean;
  evidence: ReadinessEvidenceItem[];
  limitations: string[];
  // Backward-compatibility aliases
  standard_readiness?: number;
  mastery_multiplier?: number;
  evidence_chain?: Array<{
    source: string;
    description: string;
  }>;
}

export interface StudentProfile {
  id: string;
  name: string;
  career_goal: string;
  weekly_hours: number;
  current_streak: number;
  roadmap_completion: number;
  created_at?: string;
}

export interface MasteryAssessmentQuestion {
  question_id: string;
  topic: string;
  question_text: string;
  options: string[];
  difficulty: string;
}

export interface MasteryAssessmentResult {
  student_id: string;
  topic: string;
  question_id: string;
  correct: boolean;
  score: number;
  evidence?: MasteryEvidenceItem[];
  next_action: string;
}

export interface MasteryCheckResult {
  student_id: string;
  topic: string;
  problem_id: string;
  passed: boolean;
  independent: boolean;
  conceptual_score: number | null;
  attempt_count?: number;
  hint_count?: number;
  mastery_score?: number | null;
  decision: string;
  evidence?: MasteryEvidenceItem[];
  next_action?: string;
  baseline_comparison?: string | null;
}

export interface ScholarGroundedContext {
  student_id: string;
  action: string;
  target_topic: string | null;
  knowledge: ScholarKnowledgeRetrieval[];
  evidence_sources: string[];
}

