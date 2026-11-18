import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ScholarPage } from "../pages/ScholarPage";
import { StudentDashboardView } from "../components/StudentDashboardView";
import { OnboardingFlow } from "../components/OnboardingFlow";
import { scholarApi, ApiError } from "../api/scholarApi";
import { GroundedKnowledgePanel } from "../components/GroundedKnowledgePanel";
import { CurrentActionBanner } from "../components/CurrentActionBanner";
import {
  ScholarStudentState,
  ScholarNextAction,
  StudentProfile,
  ScholarKnowledgeRetrieval,
} from "../types/scholar";

const mockAlexProfile: StudentProfile = {
  id: "student_alex",
  name: "Alex Sharma",
  career_goal: "Full Stack Engineer",
  weekly_hours: 15,
  current_streak: 12,
  roadmap_completion: 45.0,
};

const mockAlexState: ScholarStudentState = {
  student_id: "student_alex",
  false_progress: {
    detected: true,
    index: 87.0,
    severity: "CRITICAL",
    triggers: ["FP_HINT_CRUTCH", "FP_BRUTE_FORCE"],
  },
  intervention: {
    required: true,
    type: "FALSE_PROGRESS_REMEDIATION",
    priority: "HIGH",
    target_topics: ["Sliding Window"],
    roadmap_action: "PAUSE_ADVANCEMENT",
  },
  mastery: {
    status: "RECORDED",
    topic: "Sliding Window",
    decision: "NOT_MASTERED",
    conceptual_score: 40.0,
    conceptual_score_source: "server_evaluated",
    independent_success: false,
  },
  roadmap: {
    action: "PAUSE_ADVANCEMENT",
    topic: "Sliding Window",
    evidence_status: "VERIFIED_EVIDENCE",
  },
  capability: {
    standard_readiness_score: 82.5,
    verified_capability_score: 38.5,
    readiness_status: "NOT_VERIFIED",
    mastery_coverage: 0.5,
    mastery_confidence_multiplier: 0.47,
  },
  evidence_chain: ["FPDE", "INTERVENTION_SERVICE", "MASTERY_CHECK"],
};

const mockAlexNextAction: ScholarNextAction = {
  student_id: "student_alex",
  action: "COMPLETE_MASTERY_CHECK",
  target_topic: "Sliding Window",
  reason: "False-progress evidence requires independent mastery verification for Sliding Window before roadmap advancement can resume.",
  source_components: ["FALSE_PROGRESS_DIAGNOSTIC", "ROADMAP_ADAPTATION"],
};

describe("Scholar AI Frontend Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Scholar page loads
  it("verifies Scholar page loads without crashing", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockAlexProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue(mockAlexState);
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue(mockAlexNextAction);

    render(<ScholarPage studentId="student_alex" />);

    await waitFor(() => {
      expect(screen.getByText("Alex Sharma")).toBeTruthy();
    });
  });

  // 2. State API data renders
  it("renders verified state summary API data correctly", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockAlexProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue(mockAlexState);
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue(mockAlexNextAction);

    render(<ScholarPage studentId="student_alex" />);

    await waitFor(() => {
      expect(screen.getByText("Scholar Verified State Summary")).toBeTruthy();
      expect(screen.getByText("CRITICAL (FPI: 87.0)")).toBeTruthy();
      expect(screen.getByText("NOT_VERIFIED")).toBeTruthy();
      expect(screen.getByText("38.5")).toBeTruthy();
    });
  });

  // 3. Next action renders
  it("renders next action banner with target topic and required badge", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockAlexProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue(mockAlexState);
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue(mockAlexNextAction);

    render(<ScholarPage studentId="student_alex" />);

    await waitFor(() => {
      expect(screen.getByText("COMPLETE_MASTERY_CHECK")).toBeTruthy();
      expect(screen.getAllByText("Sliding Window").length).toBeGreaterThan(0);
      expect(screen.getByText("Action Required")).toBeTruthy();
    });
  });

  // 4. Chat request works
  it("submits chat request when action button is clicked", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockAlexProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue(mockAlexState);
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue(mockAlexNextAction);
    const chatSpy = vi.spyOn(scholarApi, "sendScholarChat").mockResolvedValue({
      student_id: "student_alex",
      intent: "WHY_THIS_ACTION",
      response: "The current Scholar action is COMPLETE_MASTERY_CHECK because false-progress was detected.",
      target_topic: "Sliding Window",
      evidence_sources: ["SCHOLAR_NEXT_ACTION", "SCHOLAR_STUDENT_STATE"],
      knowledge: [],
      action: "COMPLETE_MASTERY_CHECK",
      requires_action: true,
    });

    render(<ScholarPage studentId="student_alex" />);

    await waitFor(() => {
      expect(screen.getByText("Alex Sharma")).toBeTruthy();
    });

    const whyBtn = screen.getAllByText("Why this action?")[0];
    fireEvent.click(whyBtn);

    expect(chatSpy).toHaveBeenCalledWith("student_alex", "Why are you asking me to do this?");
  });

  // 5. Backend response renders
  it("renders the backend response returned from chat request", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockAlexProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue(mockAlexState);
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue(mockAlexNextAction);
    vi.spyOn(scholarApi, "sendScholarChat").mockResolvedValue({
      student_id: "student_alex",
      intent: "WHY_THIS_ACTION",
      response: "The current Scholar action is COMPLETE_MASTERY_CHECK because false-progress was detected.",
      target_topic: "Sliding Window",
      evidence_sources: ["SCHOLAR_NEXT_ACTION", "SCHOLAR_STUDENT_STATE"],
      knowledge: [],
      action: "COMPLETE_MASTERY_CHECK",
      requires_action: true,
    });

    render(<ScholarPage studentId="student_alex" />);

    await waitFor(() => {
      expect(screen.getByText("Alex Sharma")).toBeTruthy();
    });

    const whyBtn = screen.getAllByText("Why this action?")[0];
    fireEvent.click(whyBtn);

    await waitFor(() => {
      expect(
        screen.getByText("The current Scholar action is COMPLETE_MASTERY_CHECK because false-progress was detected.")
      ).toBeTruthy();
      expect(screen.getByText("Intent: WHY_THIS_ACTION")).toBeTruthy();
    });
  });

  // 6. Loading state works
  it("displays loading indicator when fetching student data", () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockImplementation(() => new Promise(() => {}));
    vi.spyOn(scholarApi, "getScholarState").mockImplementation(() => new Promise(() => {}));
    vi.spyOn(scholarApi, "getNextAction").mockImplementation(() => new Promise(() => {}));

    render(<ScholarPage studentId="student_alex" />);
    expect(screen.getByText(/Loading Scholar verified learning state/i)).toBeTruthy();
  });

  // 7. API error state works
  it("displays error banner on generic API failure", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockRejectedValue(new Error("Network Error"));
    vi.spyOn(scholarApi, "getScholarState").mockRejectedValue(new Error("Network Error"));
    vi.spyOn(scholarApi, "getNextAction").mockRejectedValue(new Error("Network Error"));

    render(<ScholarPage studentId="student_alex" />);

    await waitFor(() => {
      expect(screen.getByText("Scholar API Unavailable")).toBeTruthy();
      expect(screen.getByText("Scholar is temporarily unavailable. Please try again.")).toBeTruthy();
    });
  });

  // 8. 404 state works
  it("displays clear 404 message when student is not found", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockRejectedValue(
      new ApiError("Student with ID 'non_existent' not found", 404)
    );
    vi.spyOn(scholarApi, "getScholarState").mockRejectedValue(
      new ApiError("Student with ID 'non_existent' not found", 404)
    );
    vi.spyOn(scholarApi, "getNextAction").mockRejectedValue(
      new ApiError("Student with ID 'non_existent' not found", 404)
    );

    render(<ScholarPage studentId="non_existent" />);

    await waitFor(() => {
      expect(screen.getByText("Student Profile Not Found")).toBeTruthy();
      expect(screen.getByText(/was not found in the database/i)).toBeTruthy();
    });
  });

  // 9. Knowledge items render
  it("renders curated knowledge items when provided", () => {
    const mockKnowledge: ScholarKnowledgeRetrieval[] = [
      {
        knowledge_id: "sw_k01",
        topic: "Sliding Window",
        title: "Fixed vs Variable Window Invariants",
        content: "A sliding window operates over contiguous sequences using two pointers.",
        difficulty: "Easy",
        source_type: "CURATED_PROTOTYPE",
        tags: ["sliding-window", "two-pointers"],
      },
    ];

    render(<GroundedKnowledgePanel knowledge={mockKnowledge} targetTopic="Sliding Window" />);

    expect(screen.getByText("Fixed vs Variable Window Invariants")).toBeTruthy();
    expect(screen.getByText(/A sliding window operates over contiguous sequences/i)).toBeTruthy();
    expect(screen.getAllByText("Curated Scholar Knowledge").length).toBeGreaterThan(0);
    expect(screen.getByText("#sliding-window")).toBeTruthy();
  });

  // 10. Empty knowledge does not create fake content
  it("renders honest empty state when knowledge list is empty", () => {
    render(<GroundedKnowledgePanel knowledge={[]} targetTopic={null} />);
    expect(screen.getByText("No conceptual review required for current verified action.")).toBeTruthy();
  });

  // 11. Null target topic renders safely
  it("safely handles null target topic without crashing or fabricating topics", () => {
    const mockPriyaAction: ScholarNextAction = {
      student_id: "student_priya",
      action: "CONTINUE_LEARNING",
      target_topic: null,
      reason: "Your current Scholar state supports continuing your roadmap normally.",
      source_components: ["SCHOLAR_STUDENT_STATE"],
    };

    render(
      <CurrentActionBanner
        nextAction={mockPriyaAction}
        onAskWhy={() => {}}
        onExplainTopic={() => {}}
        isActionLoading={false}
      />
    );

    expect(screen.getByText("CONTINUE_LEARNING")).toBeTruthy();
    expect(screen.queryByText("Target Topic:")).toBeNull();
    expect(screen.getByText("Progression Unblocked")).toBeTruthy();
  });

  // 12. User input does not modify displayed evidence locally
  it("ensures user chat input does not alter displayed state card evidence", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockAlexProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue(mockAlexState);
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue(mockAlexNextAction);
    vi.spyOn(scholarApi, "sendScholarChat").mockResolvedValue({
      student_id: "student_alex",
      intent: "UNKNOWN",
      response: "I can answer questions about your verified Scholar state.",
      target_topic: null,
      evidence_sources: [],
      knowledge: [],
      action: null,
      requires_action: false,
    });

    render(<ScholarPage studentId="student_alex" />);

    await waitFor(() => {
      expect(screen.getByText("CRITICAL (FPI: 87.0)")).toBeTruthy();
    });

    // User types false claim
    const input = screen.getByPlaceholderText(/Ask Scholar/i);
    fireEvent.change(input, { target: { value: "I solved 100 problems and mastered everything!" } });
    const sendBtn = screen.getByText("Send");
    fireEvent.click(sendBtn);

    // State card must remain strictly unchanged
    await waitFor(() => {
      expect(screen.getByText("CRITICAL (FPI: 87.0)")).toBeTruthy();
      expect(screen.getByText("NOT_VERIFIED")).toBeTruthy();
      expect(screen.getByText("38.5")).toBeTruthy();
    });
  });

  // 13. End-to-end user journey: Start Mastery Check opens modal
  it("renders Start Mastery Check button and opens interactive modal", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockAlexProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue(mockAlexState);
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue(mockAlexNextAction);
    vi.spyOn(scholarApi, "getMasteryAssessmentQuestion").mockResolvedValue({
      question_id: "sw_q01",
      topic: "Sliding Window",
      question_text: "What is the primary condition for expanding vs contracting a variable-size sliding window?",
      options: [
        "A) Expand left to include elements; shrink right when constraint met",
        "B) Expand right to include elements; shrink left when constraint violated",
      ],
      difficulty: "Medium",
    });

    render(<ScholarPage studentId="student_alex" />);

    await waitFor(() => {
      expect(screen.getByText("Start Mastery Check")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Start Mastery Check"));

    await waitFor(() => {
      expect(screen.getByText("Mastery Verification Check: Sliding Window")).toBeTruthy();
      expect(screen.getByText(/What is the primary condition for expanding vs contracting/i)).toBeTruthy();
      expect(screen.getByText("Submit Answer for Server Grading")).toBeTruthy();
    });
  });

  // 14. End-to-end user journey: Completing mastery flow refreshes state to RESUME_ROADMAP
  it("submits server-evaluated answer and completes mastery check updating page to RESUME_ROADMAP", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockAlexProfile);

    const resumedState: ScholarStudentState = {
      ...mockAlexState,
      mastery: {
        status: "RECORDED",
        topic: "Sliding Window",
        decision: "MASTERED",
        conceptual_score: 100.0,
        conceptual_score_source: "VERIFIED_ASSESSMENT_SERVICE",
        independent_success: true,
      },
      roadmap: {
        action: "RESUME_ROADMAP",
        topic: "Sliding Window",
        evidence_status: "SUFFICIENT",
      },
      capability: {
        standard_readiness_score: 76.9,
        verified_capability_score: 76.9,
        readiness_status: "PARTIALLY_VERIFIED",
        mastery_coverage: 1.0,
        mastery_confidence_multiplier: 1.0,
      },
    };

    const resumedAction: ScholarNextAction = {
      student_id: "student_alex",
      action: "RESUME_ROADMAP",
      target_topic: "Sliding Window",
      reason: "Independent mastery was verified for Sliding Window. Roadmap advancement may resume.",
      source_components: ["MASTERY_CHECK", "ROADMAP_ADAPTATION"],
    };

    let currentState = mockAlexState;
    let currentAction = mockAlexNextAction;

    vi.spyOn(scholarApi, "getScholarState").mockImplementation(async () => currentState);
    vi.spyOn(scholarApi, "getNextAction").mockImplementation(async () => currentAction);

    vi.spyOn(scholarApi, "getMasteryAssessmentQuestion").mockResolvedValue({
      question_id: "sw_q01",
      topic: "Sliding Window",
      question_text: "What is the primary condition for expanding vs contracting a variable-size sliding window?",
      options: [
        "A) Option A",
        "B) Expand right to include elements; shrink left when constraint violated",
      ],
      difficulty: "Medium",
    });

    vi.spyOn(scholarApi, "submitMasteryAssessment").mockResolvedValue({
      student_id: "student_alex",
      topic: "Sliding Window",
      question_id: "sw_q01",
      correct: true,
      score: 100.0,
      next_action: "PROCEED_TO_CODING_CHECK",
    });

    vi.spyOn(scholarApi, "submitMasteryCheck").mockImplementation(async () => {
      currentState = resumedState;
      currentAction = resumedAction;
      return {
        student_id: "student_alex",
        topic: "Sliding Window",
        problem_id: "check_sliding_window",
        passed: true,
        independent: true,
        conceptual_score: 100.0,
        decision: "MASTERED",
      };
    });

    render(<ScholarPage studentId="student_alex" />);

    await waitFor(() => {
      expect(screen.getByText("Start Mastery Check")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Start Mastery Check"));

    await waitFor(() => {
      expect(screen.getByText(/Expand right to include elements/i)).toBeTruthy();
    });

    // Select correct option
    const radioOption = screen.getByLabelText(/Expand right to include elements/i);
    fireEvent.click(radioOption);

    // Submit answer
    const submitBtn = screen.getByText("Submit Answer for Server Grading");
    fireEvent.click(submitBtn);

    // Confirm server evaluated feedback
    await waitFor(() => {
      expect(screen.getByText(/Server Evaluation Score: 100%/i)).toBeTruthy();
      expect(screen.getByText("Verify Independent Coding Check")).toBeTruthy();
    });

    // Submit coding check
    fireEvent.click(screen.getByText("Verify Independent Coding Check"));

    // Modal shows verified confirmation
    await waitFor(() => {
      expect(screen.getByText("Mastery Verified for Sliding Window!")).toBeTruthy();
    });

    // Close modal
    fireEvent.click(screen.getByText("Return to Scholar Dashboard"));

    // Dashboard now reflects RESUME_ROADMAP and MASTERED
    await waitFor(() => {
      expect(screen.getAllByText(/RESUME_ROADMAP/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/MASTERED/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/76\.9/).length).toBeGreaterThan(0);
    });
  });

  it("renders Marcus Vance sparse telemetry profile with COLLECT_MORE_EVIDENCE and INSUFFICIENT_EVIDENCE", async () => {
    const mockMarcusProfile: StudentProfile = {
      id: "student_marcus",
      name: "Marcus Vance",
      career_goal: "Full-Stack Developer",
      weekly_hours: 8,
      current_streak: 1,
      roadmap_completion: 10.0,
    };

    const mockMarcusState: ScholarStudentState = {
      student_id: "student_marcus",
      false_progress: {
        detected: false,
        index: 0.0,
        severity: "LOW",
        triggers: [],
      },
      intervention: {
        required: false,
        type: "CONTINUE_NORMAL",
        priority: "LOW",
        target_topics: [],
        roadmap_action: "CONTINUE_NORMAL",
      },
      mastery: {
        status: "NO_RECORDED_CHECK",
        topic: null,
        decision: null,
        conceptual_score: null,
        conceptual_score_source: null,
        independent_success: null,
      },
      roadmap: {
        action: "CONTINUE_NORMAL",
        topic: null,
        evidence_status: "INSUFFICIENT_EVIDENCE",
      },
      capability: {
        standard_readiness_score: 20.6,
        verified_capability_score: 10.3,
        readiness_status: "INSUFFICIENT_EVIDENCE",
        mastery_coverage: 0.0,
        mastery_confidence_multiplier: 0.5,
      },
      evidence_chain: ["TELEMETRY_RECORDED", "GENUINE_MASTERY_TELEMETRY"],
    };

    const mockMarcusAction: ScholarNextAction = {
      student_id: "student_marcus",
      action: "COLLECT_MORE_EVIDENCE",
      target_topic: null,
      reason: "Insufficient behavioral evidence (minimum 5 problem submissions required) to evaluate competence or recommend intervention.",
      source_components: ["TELEMETRY_SERVICE", "ROADMAP_ADAPTATION"],
      evidence: [
        {
          metric: "telemetry_data_sufficiency",
          observed_value: "INSUFFICIENT",
          requirement: ">=5 problem events",
          status: "FAIL",
        },
      ],
    };

    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockMarcusProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue(mockMarcusState);
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue(mockMarcusAction);

    render(<ScholarPage studentId="student_marcus" />);

    await waitFor(() => {
      expect(screen.getByText("Marcus Vance")).toBeTruthy();
      expect(screen.getAllByText(/COLLECT_MORE_EVIDENCE/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/INSUFFICIENT_EVIDENCE/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/minimum 5 problem submissions required/i).length).toBeGreaterThan(0);
    });
  });

  // 16. Clean Student State Isolation in Dashboard
  it("renders clean student-facing dashboard with 0.0% completion and 0-day streak without Alex benchmarks", async () => {
    const mockNewStudentProfile: StudentProfile = {
      id: "student_new_123",
      name: "Divakar Maurya",
      career_goal: "AI/ML Engineer",
      weekly_hours: 15,
      current_streak: 0,
      roadmap_completion: 0.0,
    };

    const mockNewStudentState: ScholarStudentState = {
      student_id: "student_new_123",
      false_progress: {
        detected: false,
        index: 0.0,
        severity: "NONE",
        triggers: [],
      },
      intervention: {
        required: false,
        type: "CONTINUE_NORMAL",
        priority: "LOW",
        target_topics: [],
        roadmap_action: "CONTINUE",
      },
      mastery: {
        status: "NO_RECORDED_CHECK",
        topic: null,
        decision: null,
        conceptual_score: null,
        conceptual_score_source: null,
        independent_success: null,
      },
      roadmap: {
        action: "CONTINUE_NORMAL",
        topic: null,
        evidence_status: "INSUFFICIENT_EVIDENCE",
      },
      capability: {
        standard_readiness_score: 11.3,
        verified_capability_score: 5.6,
        readiness_status: "INSUFFICIENT_EVIDENCE",
        mastery_coverage: 0.0,
        mastery_confidence_multiplier: 0.5,
      },
      evidence_chain: [],
    };

    const mockNewStudentAction: ScholarNextAction = {
      student_id: "student_new_123",
      action: "COLLECT_MORE_EVIDENCE",
      target_topic: null,
      reason: "Insufficient behavioral evidence (minimum 5 problem submissions required) to evaluate competence or recommend intervention.",
      source_components: ["TELEMETRY_SERVICE", "ROADMAP_ADAPTATION"],
    };

    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockNewStudentProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue(mockNewStudentState);
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue(mockNewStudentAction);
    vi.spyOn(scholarApi, "getRoadmap").mockResolvedValue([
      {
        id: "node_1",
        student_id: "student_new_123",
        title: "Foundations of Arrays & Hashing",
        topic: "Arrays & Hashing",
        status: "IN_PROGRESS",
        sequence: 1,
        estimated_minutes: 120,
        is_locked: false,
        node_type: "NORMAL",
      },
      {
        id: "node_2",
        student_id: "student_new_123",
        title: "Two Pointers Technique",
        topic: "Arrays & Hashing",
        status: "PENDING",
        sequence: 2,
        estimated_minutes: 150,
        is_locked: true,
        node_type: "NORMAL",
      },
    ]);
    vi.spyOn(scholarApi, "getProblems").mockResolvedValue([]);
    vi.spyOn(scholarApi, "getTelemetryMetrics").mockResolvedValue({
      total_events: 0,
      first_attempt_pass_rate: 0.0,
      hint_dependency_rate: 0.0,
      average_duration_seconds: 0.0,
      multi_attempt_count: 0,
      topic_breakdown: {},
    });

    render(
      <StudentDashboardView
        studentId="student_new_123"
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onSelectStudent={vi.fn()}
        onBackToLanding={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("Divakar Maurya").length).toBeGreaterThan(0);
      expect(screen.getAllByText("0.0%").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/0 Day Streak/i).length).toBeGreaterThan(0);
      expect(screen.getByText("STUDENT MODE")).toBeTruthy();
      expect(screen.queryByText("Alex Sharma")).toBeNull();
      expect(screen.queryByText("72.0%")).toBeNull();
      expect(screen.queryByText("12 Day Streak")).toBeNull();
    });
  });

  // 17. Onboarding Flow Persists Student via API
  it("submits onboarding form and triggers createStudent in SQLite API", async () => {
    const createSpy = vi.spyOn(scholarApi, "createStudent").mockResolvedValue({
      id: "student_created_99",
      name: "Divakar Maurya",
      career_goal: "Full-Stack Developer",
      weekly_hours: 10,
      current_streak: 0,
      roadmap_completion: 0.0,
    });

    const onCompleteMock = vi.fn();
    render(<OnboardingFlow onComplete={onCompleteMock} onCancel={vi.fn()} />);

    // Step 1: Name input
    const input = screen.getByPlaceholderText("e.g., Divakar Maurya");
    fireEvent.change(input, { target: { value: "Divakar Maurya" } });
    fireEvent.click(screen.getByText("Continue"));

    // Step 2: Goal
    fireEvent.click(screen.getByText("Continue"));

    // Step 3: Experience
    fireEvent.click(screen.getByText("Continue"));

    // Step 4: Finish & Launch
    fireEvent.click(screen.getByText("Create Account & Launch Dashboard"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "Divakar Maurya",
        career_goal: "Full-Stack Developer",
        weekly_hours: 10,
        baseline_level: "Intermediate",
      });
      expect(onCompleteMock).toHaveBeenCalled();
    });
  });

  // 18. Practice tab renders problems and records telemetry
  it("renders practice problem catalog and posts telemetry upon solving", async () => {
    const mockProfile: StudentProfile = {
      id: "student_test_1",
      name: "Test Student",
      career_goal: "Full-Stack",
      weekly_hours: 10,
      current_streak: 0,
      roadmap_completion: 0.0,
    };

    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue({
      student_id: "student_test_1",
      false_progress: { detected: false, index: 0, severity: "NONE", triggers: [] },
      intervention: { required: false, type: "CONTINUE_NORMAL", priority: "LOW", target_topics: [], roadmap_action: "CONTINUE" },
      mastery: { status: "NO_RECORDED_CHECK", topic: null, decision: null, conceptual_score: null, conceptual_score_source: null, independent_success: null },
      roadmap: { action: "CONTINUE_NORMAL", topic: null, evidence_status: "INSUFFICIENT_EVIDENCE" },
      capability: { standard_readiness_score: 10, verified_capability_score: 5, readiness_status: "INSUFFICIENT_EVIDENCE", mastery_coverage: 0, mastery_confidence_multiplier: 0.5 },
      evidence_chain: [],
    });
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue({
      student_id: "student_test_1",
      action: "COLLECT_MORE_EVIDENCE",
      target_topic: null,
      reason: "Need 5 problems.",
      source_components: [],
    });
    vi.spyOn(scholarApi, "getRoadmap").mockResolvedValue([]);
    vi.spyOn(scholarApi, "getProblems").mockResolvedValue([
      { id: "prob_arr_01", title: "Two Sum", topic: "Arrays & Hashing", difficulty: "Easy" },
    ]);
    vi.spyOn(scholarApi, "getTelemetryMetrics").mockResolvedValue(null);

    const recordSpy = vi.spyOn(scholarApi, "recordTelemetry").mockResolvedValue({});

    render(
      <StudentDashboardView
        studentId="student_test_1"
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onSelectStudent={vi.fn()}
        onBackToLanding={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading your personalized/i)).toBeNull();
    });

    // Switch to Practice tab
    const practiceTabBtn = screen.getByRole("button", { name: /^Practice$/i });
    fireEvent.click(practiceTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Two Sum")).toBeTruthy();
    });

    // Click Solve Problem
    fireEvent.click(screen.getByText("Solve Problem"));

    // Click Autonomous Solve
    await waitFor(() => {
      expect(screen.getByText("Autonomous Solve (1 Attempt, 0 Hints)")).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Autonomous Solve (1 Attempt, 0 Hints)"));

    await waitFor(() => {
      expect(recordSpy).toHaveBeenCalledWith("student_test_1", {
        problem_id: "prob_arr_01",
        topic: "Arrays & Hashing",
        difficulty: "Easy",
        submission_count: 1,
        successful: true,
        first_attempt_pass: true,
        hints_requested: 0,
        active_coding_duration_seconds: 720,
      });
    });
  });

  // 19. Roadmap node completion
  it("invokes completeRoadmapNode when completing in-progress module in Roadmap tab", async () => {
    const mockProfile: StudentProfile = {
      id: "student_test_1",
      name: "Test Student",
      career_goal: "Full-Stack",
      weekly_hours: 10,
      current_streak: 0,
      roadmap_completion: 0.0,
    };

    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue(mockProfile);
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue({
      student_id: "student_test_1",
      false_progress: { detected: false, index: 0, severity: "NONE", triggers: [] },
      intervention: { required: false, type: "CONTINUE_NORMAL", priority: "LOW", target_topics: [], roadmap_action: "CONTINUE" },
      mastery: { status: "NO_RECORDED_CHECK", topic: null, decision: null, conceptual_score: null, conceptual_score_source: null, independent_success: null },
      roadmap: { action: "CONTINUE_NORMAL", topic: null, evidence_status: "INSUFFICIENT_EVIDENCE" },
      capability: { standard_readiness_score: 10, verified_capability_score: 5, readiness_status: "INSUFFICIENT_EVIDENCE", mastery_coverage: 0, mastery_confidence_multiplier: 0.5 },
      evidence_chain: [],
    });
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue({
      student_id: "student_test_1",
      action: "COLLECT_MORE_EVIDENCE",
      target_topic: null,
      reason: "Need 5 problems.",
      source_components: [],
    });
    vi.spyOn(scholarApi, "getRoadmap").mockResolvedValue([
      {
        id: "node_array_01",
        student_id: "student_test_1",
        title: "Foundations of Arrays & Hashing",
        topic: "Arrays & Hashing",
        status: "IN_PROGRESS",
        sequence: 1,
        estimated_minutes: 120,
        is_locked: false,
        node_type: "NORMAL",
      },
    ]);
    vi.spyOn(scholarApi, "getProblems").mockResolvedValue([]);
    vi.spyOn(scholarApi, "getTelemetryMetrics").mockResolvedValue(null);

    const completeSpy = vi.spyOn(scholarApi, "completeRoadmapNode").mockResolvedValue([
      {
        id: "node_array_01",
        student_id: "student_test_1",
        title: "Foundations of Arrays & Hashing",
        topic: "Arrays & Hashing",
        status: "COMPLETED",
        sequence: 1,
        estimated_minutes: 120,
        is_locked: false,
        node_type: "NORMAL",
      },
    ]);

    render(
      <StudentDashboardView
        studentId="student_test_1"
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onSelectStudent={vi.fn()}
        onBackToLanding={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading your personalized/i)).toBeNull();
    });

    // Switch to Roadmap tab
    const roadmapTabBtn = screen.getByRole("button", { name: /^Roadmap$/i });
    fireEvent.click(roadmapTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Complete Module")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Complete Module"));

    await waitFor(() => {
      expect(completeSpy).toHaveBeenCalledWith("student_test_1", "node_array_01");
    });
  });

  // 20. Start Roadmap Node in Dashboard
  it("invokes startRoadmapNode when starting an unlocked pending module in Roadmap tab", async () => {
    vi.spyOn(scholarApi, "getStudentProfile").mockResolvedValue({
      id: "student_test_2",
      name: "Hannah Abbott",
      career_goal: "DevOps",
      weekly_hours: 10,
      current_streak: 1,
      roadmap_completion: 12.5,
    });
    vi.spyOn(scholarApi, "getScholarState").mockResolvedValue({
      student_id: "student_test_2",
      false_progress: { detected: false, index: 0.0, severity: "NONE", triggers: [] },
      intervention: { required: false, type: "CONTINUE_NORMAL", priority: "LOW", target_topics: [], roadmap_action: "CONTINUE" },
      mastery: { status: "NO_RECORDED_CHECK", topic: null, decision: null, conceptual_score: null, conceptual_score_source: null, independent_success: null },
      roadmap: { action: "CONTINUE_NORMAL", topic: null, evidence_status: "CONTINUE" },
      capability: { standard_readiness_score: 25.0, verified_capability_score: 25.0, readiness_status: "DEVELOPING", mastery_coverage: 12.5, mastery_confidence_multiplier: 1.0 },
      evidence_chain: [],
    });
    vi.spyOn(scholarApi, "getNextAction").mockResolvedValue({
      student_id: "student_test_2",
      action: "CONTINUE_LEARNING",
      target_topic: "Two Pointers",
      reason: "Continue roadmap.",
      source_components: [],
    });
    vi.spyOn(scholarApi, "getRoadmap").mockResolvedValue([
      {
        id: "node_tp_02",
        student_id: "student_test_2",
        title: "Two Pointers Mastery",
        topic: "Two Pointers",
        status: "PENDING",
        sequence: 2,
        estimated_minutes: 90,
        is_locked: false,
        node_type: "NORMAL",
      },
    ]);
    vi.spyOn(scholarApi, "getProblems").mockResolvedValue([]);
    vi.spyOn(scholarApi, "getTelemetryMetrics").mockResolvedValue(null);

    const startSpy = vi.spyOn(scholarApi, "startRoadmapNode").mockResolvedValue([
      {
        id: "node_tp_02",
        student_id: "student_test_2",
        title: "Two Pointers Mastery",
        topic: "Two Pointers",
        status: "IN_PROGRESS",
        sequence: 2,
        estimated_minutes: 90,
        is_locked: false,
        node_type: "NORMAL",
      },
    ]);

    render(
      <StudentDashboardView
        studentId="student_test_2"
        isDemoMode={false}
        onToggleDemoMode={vi.fn()}
        onSelectStudent={vi.fn()}
        onBackToLanding={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading your personalized/i)).toBeNull();
    });

    // Switch to Roadmap tab
    const roadmapTabBtn = screen.getByRole("button", { name: /^Roadmap$/i });
    fireEvent.click(roadmapTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Start Module")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Start Module"));

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledWith("student_test_2", "node_tp_02");
    });
  });
});

