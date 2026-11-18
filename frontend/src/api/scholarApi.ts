import {
  StudentProfile,
  ScholarStudentState,
  ScholarNextAction,
  ScholarConversationResponse,
  VerifiedCapabilityResponse,
} from "../types/scholar";

const BASE_URL = "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const data = await res.json();
      if (data && data.detail) {
        errorDetail = data.detail;
      }
    } catch {
      // Ignore JSON parse error on non-JSON response
    }
    throw new ApiError(errorDetail, res.status);
  }
  return res.json() as Promise<T>;
}

export const scholarApi = {
  async getStudentProfile(studentId: string): Promise<StudentProfile> {
    const res = await fetch(`${BASE_URL}/students/${encodeURIComponent(studentId)}`);
    return handleResponse<StudentProfile>(res);
  },

  async getScholarState(studentId: string): Promise<ScholarStudentState> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/scholar/state`
    );
    return handleResponse<ScholarStudentState>(res);
  },

  async getNextAction(studentId: string): Promise<ScholarNextAction> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/scholar/next-action`
    );
    return handleResponse<ScholarNextAction>(res);
  },

  async sendScholarChat(
    studentId: string,
    message: string
  ): Promise<ScholarConversationResponse> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/scholar/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: studentId,
          message,
        }),
      }
    );
    return handleResponse<ScholarConversationResponse>(res);
  },

  async getVerifiedCapability(
    studentId: string
  ): Promise<VerifiedCapabilityResponse> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/verified-capability`
    );
    return handleResponse<VerifiedCapabilityResponse>(res);
  },

  async getMasteryAssessmentQuestion(
    studentId: string,
    topic: string
  ): Promise<import("../types/scholar").MasteryAssessmentQuestion> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/mastery-assessment/${encodeURIComponent(topic)}`
    );
    return handleResponse<import("../types/scholar").MasteryAssessmentQuestion>(res);
  },

  async submitMasteryAssessment(
    studentId: string,
    payload: { topic: string; question_id: string; answer: string }
  ): Promise<import("../types/scholar").MasteryAssessmentResult> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/mastery-assessment/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          topic: payload.topic,
          question_id: payload.question_id,
          answer: payload.answer,
        }),
      }
    );
    return handleResponse<import("../types/scholar").MasteryAssessmentResult>(res);
  },

  async submitMasteryCheck(
    studentId: string,
    payload: { topic: string; problem_id: string; solved: boolean; hints_used: number; attempts: number }
  ): Promise<import("../types/scholar").MasteryCheckResult> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/mastery-check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          topic: payload.topic,
          problem_id: payload.problem_id,
          solved: payload.solved,
          hints_used: payload.hints_used,
          attempts: payload.attempts,
        }),
      }
    );
    return handleResponse<import("../types/scholar").MasteryCheckResult>(res);
  },

  async getTopicKnowledge(
    studentId: string,
    topic: string
  ): Promise<import("../types/scholar").ScholarKnowledgeRetrieval[]> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/scholar/knowledge/topic/${encodeURIComponent(topic)}`
    );
    return handleResponse<import("../types/scholar").ScholarKnowledgeRetrieval[]>(res);
  },

  async getScholarContext(
    studentId: string
  ): Promise<import("../types/scholar").ScholarGroundedContext> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/scholar/context`
    );
    return handleResponse<import("../types/scholar").ScholarGroundedContext>(res);
  },

  async getRoadmap(
    studentId: string
  ): Promise<Array<{
    id: string;
    student_id: string;
    title: string;
    topic: string;
    status: string;
    sequence: number;
    estimated_minutes: number;
    is_locked: boolean;
    node_type: string;
  }>> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/roadmap`
    );
    return handleResponse<Array<{
      id: string;
      student_id: string;
      title: string;
      topic: string;
      status: string;
      sequence: number;
      estimated_minutes: number;
      is_locked: boolean;
      node_type: string;
    }>>(res);
  },

  async createStudent(payload: {
    name: string;
    career_goal: string;
    weekly_hours?: number;
    baseline_level?: string;
    id?: string;
  }): Promise<StudentProfile> {
    const res = await fetch(`${BASE_URL}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<StudentProfile>(res);
  },

  async startRoadmapNode(studentId: string, nodeId: string): Promise<any[]> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/roadmap/${encodeURIComponent(nodeId)}/start`,
      { method: "POST" }
    );
    return handleResponse<any[]>(res);
  },

  async completeRoadmapNode(studentId: string, nodeId: string): Promise<any[]> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/roadmap/${encodeURIComponent(nodeId)}/complete`,
      { method: "POST" }
    );
    return handleResponse<any[]>(res);
  },

  async getProblems(
    studentId?: string,
    topic?: string
  ): Promise<Array<{
    id: string;
    title: string;
    topic: string;
    difficulty: string;
    description?: string;
    solved?: boolean;
    attempts?: number;
  }>> {
    const params = new URLSearchParams();
    if (studentId) params.append("student_id", studentId);
    if (topic) params.append("topic", topic);
    const qs = params.toString();
    const url = qs ? `${BASE_URL}/problems?${qs}` : `${BASE_URL}/problems`;
    const res = await fetch(url);
    return handleResponse<Array<{
      id: string;
      title: string;
      topic: string;
      difficulty: string;
      description?: string;
      solved?: boolean;
      attempts?: number;
    }>>(res);
  },

  async recordTelemetry(
    studentId: string,
    payload: {
      problem_id: string;
      topic: string;
      difficulty: string;
      submission_count: number;
      successful: boolean;
      first_attempt_pass: boolean;
      hints_requested: number;
      active_coding_duration_seconds: number;
    }
  ): Promise<any> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/telemetry`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return handleResponse<any>(res);
  },

  async getTelemetryMetrics(studentId: string): Promise<{
    total_events: number;
    first_attempt_pass_rate: number;
    hint_dependency_rate: number;
    average_duration_seconds: number;
    multi_attempt_count: number;
    topic_breakdown: Record<string, any>;
  } | null> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/telemetry/metrics`
    );
    return handleResponse<any>(res);
  },

  async getRoadmapNodeDetails(studentId: string, nodeId: string): Promise<{
    id: string;
    title: string;
    topic: string;
    status: string;
    sequence: number;
    estimated_minutes: number;
    is_locked: boolean;
    node_type: string;
    what_you_learn: string[];
    required_evidence: number;
    current_evidence: number;
    prerequisite_title: string | null;
    prerequisite_completed: boolean;
    mastery_status: string;
    can_complete: boolean;
  }> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/roadmap/${encodeURIComponent(nodeId)}/details`
    );
    return handleResponse<any>(res);
  },

  async verifyRoadmapNodeCompletion(studentId: string, nodeId: string): Promise<{
    allowed: boolean;
    status: string;
    message: string;
    current_evidence?: number;
    required_evidence?: number;
    action?: string;
    nodes?: any[];
  }> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/roadmap/${encodeURIComponent(nodeId)}/verify-completion`,
      { method: "POST" }
    );
    return handleResponse<any>(res);
  },

  async updateStudentProfile(
    studentId: string,
    payload: {
      name?: string;
      career_goal?: string;
      weekly_hours?: number;
      baseline_level?: string;
    }
  ): Promise<StudentProfile> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return handleResponse<StudentProfile>(res);
  },

  async getDashboardSummary(studentId: string): Promise<{
    student: StudentProfile;
    readiness: VerifiedCapabilityResponse;
    next_action: ScholarNextAction;
    scholar_state: ScholarStudentState;
    roadmap: any[];
  }> {
    const res = await fetch(
      `${BASE_URL}/students/${encodeURIComponent(studentId)}/dashboard`
    );
    return handleResponse<any>(res);
  },
};

