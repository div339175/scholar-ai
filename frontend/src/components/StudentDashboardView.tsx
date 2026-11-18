import React, { useState, useEffect, useCallback } from "react";
import { scholarApi, ApiError } from "../api/scholarApi";
import {
  ScholarStudentState,
  ScholarNextAction,
  StudentProfile,
  ScholarKnowledgeRetrieval,
} from "../types/scholar";
import { GroundedKnowledgePanel } from "./GroundedKnowledgePanel";
import { ScholarChatPanel, ChatMessage } from "./ScholarChatPanel";
import { MasteryFlowModal } from "./MasteryFlowModal";
import { ScholarStateCard } from "./ScholarStateCard";
import {
  BrainCircuit,
  Compass,
  Award,
  Layers,
  Code2,
  FolderGit2,
  MessageSquare,
  BarChart3,
  User,
  Flame,
  CheckCircle2,
  Lock,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Loader2,
  Zap,
} from "lucide-react";

interface Props {
  studentId: string;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onSelectStudent: (id: string) => void;
  onBackToLanding: () => void;
  userGoal?: string;
  userCommitment?: string;
}

export type TabType = "dashboard" | "roadmap" | "practice" | "projects" | "scholar" | "insights" | "profile";

export const StudentDashboardView: React.FC<Props> = ({
  studentId,
  isDemoMode,
  onToggleDemoMode,
  onSelectStudent,
  onBackToLanding,
  userGoal,
  userCommitment,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [state, setState] = useState<ScholarStudentState | null>(null);
  const [nextAction, setNextAction] = useState<ScholarNextAction | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [roadmapNodes, setRoadmapNodes] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<ScholarKnowledgeRetrieval[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isMasteryModalOpen, setIsMasteryModalOpen] = useState<boolean>(false);
  const [showEvidencePill, setShowEvidencePill] = useState<boolean>(false);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  // Real Practice & Telemetry States
  const [telemetryMetrics, setTelemetryMetrics] = useState<{
    total_events: number;
    first_attempt_pass_rate: number;
    hint_dependency_rate: number;
    average_duration_seconds: number;
    multi_attempt_count: number;
    topic_breakdown: Record<string, any>;
  } | null>(null);

  const [problems, setProblems] = useState<Array<{
    id: string;
    title: string;
    topic: string;
    difficulty: string;
  }>>([]);

  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("All");
  const [solvingProblem, setSolvingProblem] = useState<{
    id: string;
    title: string;
    topic: string;
    difficulty: string;
  } | null>(null);
  const [customAttempts, setCustomAttempts] = useState<number>(1);
  const [customHints, setCustomHints] = useState<number>(0);
  const [customDuration, setCustomDuration] = useState<number>(15);
  const [isSubmittingSolve, setIsSubmittingSolve] = useState<boolean>(false);
  const [solveNotification, setSolveNotification] = useState<string | null>(null);
  const [isCompletingNodeId, setIsCompletingNodeId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [stateRes, actionRes, profileRes] = await Promise.all([
        scholarApi.getScholarState(studentId),
        scholarApi.getNextAction(studentId),
        scholarApi.getStudentProfile(studentId),
      ]);

      setState(stateRes);
      setNextAction(actionRes);
      setProfile(profileRes);

      // Seed initial guidance message from backend action
      setMessages([
        {
          id: "welcome-action",
          sender: "scholar",
          text: actionRes.reason,
          action: actionRes.action,
          target_topic: actionRes.target_topic,
          evidence_sources: actionRes.source_components,
        },
      ]);

      // Fetch topic knowledge if target topic is present
      if (actionRes.target_topic) {
        try {
          const knowledgeRes = await scholarApi.getTopicKnowledge(studentId, actionRes.target_topic);
          setKnowledge(knowledgeRes || []);
        } catch {
          setKnowledge([]);
        }
      } else {
        setKnowledge([]);
      }

      // Fetch roadmap nodes, problems, and telemetry metrics in parallel
      try {
        const [nodes, probs, metrics] = await Promise.all([
          scholarApi.getRoadmap(studentId).catch(() => []),
          scholarApi.getProblems().catch(() => []),
          scholarApi.getTelemetryMetrics(studentId).catch(() => null),
        ]);
        setRoadmapNodes(nodes || []);
        setProblems(probs || []);
        setTelemetryMetrics(metrics);
      } catch {
        setRoadmapNodes([]);
        setProblems([]);
        setTelemetryMetrics(null);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError({ status: err.status, message: err.message });
      } else {
        setError({
          status: 500,
          message: "Scholar is temporarily unavailable. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, sender: "user", text },
    ];
    setMessages(newMessages);
    setIsChatLoading(true);

    try {
      const chatRes = await scholarApi.sendScholarChat(studentId, text);

      setMessages([
        ...newMessages,
        {
          id: `scholar-${Date.now()}`,
          sender: "scholar",
          text: chatRes.response,
          intent: chatRes.intent,
          target_topic: chatRes.target_topic,
          evidence_sources: chatRes.evidence_sources,
          action: chatRes.action,
          requires_action: chatRes.requires_action,
        },
      ]);

      if (chatRes.knowledge && chatRes.knowledge.length > 0) {
        setKnowledge(chatRes.knowledge);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof ApiError
          ? `Error (${err.status}): ${err.message}`
          : "Scholar is temporarily unavailable. Please try again.";

      setMessages([
        ...newMessages,
        {
          id: `scholar-err-${Date.now()}`,
          sender: "scholar",
          text: errorMsg,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAskWhy = () => {
    handleSendMessage("Why are you asking me to do this?");
  };

  const handleExplainTopic = (topic: string) => {
    handleSendMessage(`Explain the core invariants and concepts for ${topic}.`);
  };

  const handleCompleteNode = async (nodeId: string) => {
    setIsCompletingNodeId(nodeId);
    try {
      const updatedNodes = await scholarApi.completeRoadmapNode(studentId, nodeId);
      setRoadmapNodes(updatedNodes || []);
      await loadData();
    } catch (err) {
      console.error("Failed to complete roadmap node:", err);
    } finally {
      setIsCompletingNodeId(null);
    }
  };

  const handleExecuteSolve = async (
    problem: { id: string; title: string; topic: string; difficulty: string },
    submissions: number,
    hints: number,
    durationMins: number
  ) => {
    setIsSubmittingSolve(true);
    try {
      await scholarApi.recordTelemetry(studentId, {
        problem_id: problem.id,
        topic: problem.topic,
        difficulty: problem.difficulty,
        submission_count: submissions,
        successful: true,
        first_attempt_pass: submissions === 1 && hints === 0,
        hints_requested: hints,
        active_coding_duration_seconds: durationMins * 60,
      });

      setSolvingProblem(null);
      setSolveNotification(`Logged solution for "${problem.title}"! Real telemetry persisted in SQLite.`);
      setTimeout(() => setSolveNotification(null), 5000);
      await loadData();
    } catch (err) {
      console.error("Failed to record problem telemetry:", err);
    } finally {
      setIsSubmittingSolve(false);
    }
  };

  const getFriendlyActionTitle = (action: string, topic?: string | null) => {
    switch (action) {
      case "COMPLETE_MASTERY_CHECK":
        return topic ? `Mastery Check: ${topic}` : "Concept Mastery Verification";
      case "COMPLETE_REMEDIATION":
        return topic ? `Remediation Sprint: ${topic}` : "Targeted Concept Remediation";
      case "RESUME_ROADMAP":
        return "Resume Forward Roadmap Progression";
      case "CONTINUE_LEARNING":
        return "Continue Your Scheduled Modules";
      case "COLLECT_MORE_EVIDENCE":
        return "Complete Introductory Practice Problems";
      default:
        return action.replace(/_/g, " ");
    }
  };

  const getFriendlyActionSubtitle = (action: string, topic?: string | null) => {
    switch (action) {
      case "COMPLETE_MASTERY_CHECK":
        return topic
          ? `Scholar AI recommends verifying your independent understanding of ${topic} before moving forward.`
          : "Scholar AI recommends verifying independent mastery on your current topic.";
      case "COMPLETE_REMEDIATION":
        return `Your recent assessment indicates ${topic || "this topic"} needs a quick conceptual review.`;
      case "RESUME_ROADMAP":
        return "Your mastery check passed! You have demonstrated autonomous competence and earned roadmap advancement.";
      case "CONTINUE_LEARNING":
        return "Your problem-solving telemetry demonstrates strong autonomous progress without hint dependency.";
      case "COLLECT_MORE_EVIDENCE":
        return "Scholar AI needs at least 5 independent problem submissions to establish your personalized competence profile.";
      default:
        return "Follow Scholar AI's evidence-based recommendations.";
    }
  };

  const getFriendlyStatusText = (status: string) => {
    switch (status) {
      case "PAUSE_ADVANCEMENT":
        return "Advancement paused for verification";
      case "RESUME_ROADMAP":
        return "Advancement active";
      case "REMEDIATE_TOPIC":
        return "Remediation in progress";
      case "CONTINUE_NORMAL":
        return "On track";
      default:
        return status;
    }
  };

  const getFriendlyReadinessText = (status: string) => {
    switch (status) {
      case "VERIFIED_READY":
        return "Verified Ready";
      case "PARTIALLY_VERIFIED":
        return "Partially Verified";
      case "NOT_VERIFIED":
      case "NEEDS_INTERVENTION":
        return "Verification in Progress";
      case "INSUFFICIENT_EVIDENCE":
        return "Building Baseline Evidence";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <div className="spinner" style={{ width: "2.5rem", height: "2.5rem", borderWidth: "3px" }} />
        <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Loading your personalized Scholar AI learning space...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "3rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
        <div className="error-banner">
          <AlertTriangle size={24} />
          <div>
            <div style={{ fontWeight: 700 }}>Student Profile Not Found</div>
            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {error.status === 404
                ? `Student profile '${studentId}' was not found. Please select a demo benchmark archetype.`
                : error.message}
            </div>
            <button onClick={onToggleDemoMode} className="btn-secondary" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
              Switch to Demo Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveGoal = userGoal || profile?.career_goal || "Full-Stack Developer";
  const effectiveWeekly = userCommitment || `${profile?.weekly_hours || 10} hours / week`;

  // Filter problems for practice tab
  const filteredProblems = selectedTopicFilter === "All"
    ? problems
    : problems.filter((p) => p.topic.toLowerCase().includes(selectedTopicFilter.toLowerCase()));

  const distinctTopics = ["All", "Arrays & Hashing", "Sliding Window", "Dynamic Programming", "Recursion", "Graph Traversal"];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Demo Mode Banner (when active) */}
      {isDemoMode ? (
        <div
          style={{
            background: "linear-gradient(90deg, #1e1b4b 0%, #1e293b 100%)",
            borderBottom: "1px solid #4338ca",
            padding: "0.6rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.82rem",
            color: "#c7d2fe",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="badge badge-info" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
              EVALUATOR DEMO MODE
            </span>
            <span>Viewing isolated benchmark scenario profiles.</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Benchmark Archetype:</span>
            <select
              value={studentId}
              onChange={(e) => onSelectStudent(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid #4338ca",
                borderRadius: "var(--radius-sm)",
                padding: "0.25rem 0.6rem",
                fontSize: "0.8rem",
              }}
            >
              <option value="student_alex">Alex Sharma (False Progress Scenario)</option>
              <option value="student_priya">Priya Mehta (Genuine Mastery Scenario)</option>
              <option value="student_marcus">Marcus Vance (Sparse Evidence Scenario)</option>
            </select>
            <button
              onClick={onToggleDemoMode}
              style={{ background: "transparent", color: "#a5b4fc", fontSize: "0.78rem", textDecoration: "underline", cursor: "pointer" }}
            >
              Return to Student Mode
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "rgba(16, 24, 39, 0.9)",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "0.45rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="badge badge-success" style={{ fontSize: "0.68rem" }}>
              STUDENT MODE
            </span>
            <span>Active Student: <strong>{profile?.name}</strong> (ID: <code style={{ fontSize: "0.75rem" }}>{profile?.id}</code>)</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={onToggleDemoMode}
              className="btn-secondary"
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
            >
              Switch to Evaluator Demo Mode
            </button>
          </div>
        </div>
      )}

      {/* Main Student Navigation Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.85rem 2rem",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-subtle)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div
            onClick={onBackToLanding}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
          >
            <BrainCircuit size={24} color="#818cf8" />
            <span style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              StepCode
            </span>
            <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>
              SCHOLAR AI
            </span>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            {[
              { id: "dashboard", label: "Dashboard", icon: Compass },
              { id: "roadmap", label: "Roadmap", icon: Layers },
              { id: "practice", label: "Practice", icon: Code2 },
              { id: "projects", label: "Projects", icon: FolderGit2 },
              { id: "scholar", label: "Scholar AI", icon: MessageSquare },
              { id: "insights", label: "Insights", icon: BarChart3 },
              { id: "profile", label: "Profile", icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    background: isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
                    color: isActive ? "#818cf8" : "var(--text-secondary)",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "0.85rem",
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Badge & Mode Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.3rem 0.75rem",
              borderRadius: "9999px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.82rem",
            }}
          >
            <div
              style={{
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "50%",
                background: "#6366f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "#fff",
                fontSize: "0.75rem",
              }}
            >
              {profile?.name ? profile.name[0] : "S"}
            </div>
            <span>{profile?.name || "Student"}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {/* ============================================================ */}
        {/* TAB 1: DASHBOARD (HOME)                                       */}
        {/* ============================================================ */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            {/* Student Welcome Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h1 style={{ fontSize: "1.7rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                  Welcome, {profile?.name?.split(" ")[0] || "Student"}
                </h1>
                <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span>Goal: <strong>{effectiveGoal}</strong></span>
                  <span>•</span>
                  <span>Commitment: <strong>{effectiveWeekly}</strong></span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#fbbf24", fontSize: "0.9rem", fontWeight: 600 }}>
                  <Flame size={18} />
                  <span>{profile?.current_streak ?? 0} Day Streak</span>
                </div>
              </div>
            </div>

            {/* PRIMARY HERO CARD: YOUR NEXT STEP */}
            {nextAction && (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(30, 27, 75, 0.85) 0%, rgba(24, 34, 52, 0.95) 100%)",
                  border: "1px solid rgba(99, 102, 241, 0.35)",
                  borderRadius: "var(--radius-lg)",
                  padding: "2rem",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Sparkles size={18} color="#818cf8" />
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#818cf8" }}>
                      Your Next Step
                    </span>
                  </div>

                  <span
                    className={`badge ${nextAction.action === "CONTINUE_LEARNING" || nextAction.action === "RESUME_ROADMAP" ? "badge-success" : "badge-warning"}`}
                    style={{ fontSize: "0.75rem" }}
                  >
                    {nextAction.action === "CONTINUE_LEARNING" || nextAction.action === "RESUME_ROADMAP"
                      ? "On Track"
                      : "Action Recommended"}
                  </span>
                </div>

                <h2 style={{ fontSize: "1.65rem", fontWeight: 800, color: "#f9fafb", marginBottom: "0.5rem" }}>
                  {getFriendlyActionTitle(nextAction.action, nextAction.target_topic)}
                </h2>

                <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", maxWidth: "780px", lineHeight: 1.55, marginBottom: "1.5rem" }}>
                  {getFriendlyActionSubtitle(nextAction.action, nextAction.target_topic)}
                </p>

                {/* Primary Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  {nextAction.action === "COMPLETE_MASTERY_CHECK" && (
                    <button
                      onClick={() => setIsMasteryModalOpen(true)}
                      className="btn-primary"
                      style={{
                        padding: "0.75rem 1.4rem",
                        fontSize: "0.92rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.45rem",
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                      }}
                    >
                      <Award size={16} />
                      <span>Start Mastery Check</span>
                    </button>
                  )}

                  {nextAction.action === "COLLECT_MORE_EVIDENCE" && (
                    <button
                      onClick={() => setActiveTab("practice")}
                      className="btn-primary"
                      style={{ padding: "0.75rem 1.4rem", fontSize: "0.92rem", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
                    >
                      <Code2 size={16} />
                      <span>Go to Practice Problems</span>
                    </button>
                  )}

                  <button
                    onClick={handleAskWhy}
                    className="btn-secondary"
                    style={{ padding: "0.75rem 1.25rem", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <span>Why this action?</span>
                  </button>

                  {nextAction.target_topic && (
                    <button
                      onClick={() => handleExplainTopic(nextAction.target_topic!)}
                      className="btn-secondary"
                      style={{ padding: "0.75rem 1.25rem", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                    >
                      <span>Explain {nextAction.target_topic}</span>
                    </button>
                  )}
                </div>

                {/* Collapsible Evidence Transparency */}
                <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <button
                    onClick={() => setShowEvidencePill(!showEvidencePill)}
                    style={{
                      background: "transparent",
                      color: "var(--text-muted)",
                      fontSize: "0.78rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <span>Evidence Basis: {nextAction.source_components.join(", ")}</span>
                    {showEvidencePill ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {showEvidencePill && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--text-secondary)", background: "rgba(0, 0, 0, 0.25)", padding: "0.6rem 0.85rem", borderRadius: "var(--radius-sm)" }}>
                      <div><strong>Diagnostic Reason:</strong> {nextAction.reason}</div>
                      {state?.false_progress.detected && (
                        <div style={{ marginTop: "0.25rem" }}>
                          <strong>Observed Signals:</strong> {state.false_progress.triggers.map((t) => t.replace("FP_", "")).join(", ")} (FPI: {state.false_progress.index.toFixed(1)})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress Summary Cards */}
            {state && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {/* 1. Roadmap Completion */}
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>Roadmap Progress</span>
                    <Layers size={16} color="#818cf8" />
                  </div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f9fafb" }}>
                    {(profile?.roadmap_completion ?? 0).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Status: <strong style={{ color: state.roadmap.action === "PAUSE_ADVANCEMENT" ? "#f87171" : "#34d399" }}>
                      {getFriendlyStatusText(state.roadmap.action)}
                    </strong>
                  </div>
                </div>

                {/* 2. Verified Capability */}
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>Verified Capability</span>
                    <ShieldCheck size={16} color="#34d399" />
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f9fafb" }}>
                      {state.capability.verified_capability_score.toFixed(1)}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>/ 100</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Confidence: <strong>{getFriendlyReadinessText(state.capability.readiness_status)}</strong>
                  </div>
                </div>

                {/* 3. Learning Streak */}
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>Active Learning Streak</span>
                    <Flame size={16} color="#fbbf24" />
                  </div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f9fafb" }}>
                    {profile?.current_streak ?? 0} Days
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Consistency Factor: <strong>Active</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Current Focus & Milestone Roadmap Preview */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Layers size={18} color="#818cf8" />
                  <span>Curriculum Milestones</span>
                </div>
                <button
                  onClick={() => setActiveTab("roadmap")}
                  style={{ background: "transparent", color: "#818cf8", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}
                >
                  <span>View Full Roadmap</span>
                  <ExternalLink size={13} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {roadmapNodes.slice(0, 5).map((node) => {
                  const isCompleted = node.status === "COMPLETED";
                  const isFocus = node.topic === nextAction?.target_topic;

                  return (
                    <div
                      key={node.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.85rem 1rem",
                        borderRadius: "var(--radius-sm)",
                        background: isFocus ? "rgba(99, 102, 241, 0.1)" : "var(--bg-secondary)",
                        border: `1px solid ${isFocus ? "rgba(99, 102, 241, 0.4)" : "var(--border-subtle)"}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {isCompleted ? (
                          <CheckCircle2 size={18} color="#34d399" />
                        ) : isFocus ? (
                          <AlertTriangle size={18} color="#fbbf24" />
                        ) : (
                          <Lock size={18} color="#6b7280" />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{node.title}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {node.topic} • {node.estimated_minutes} mins
                          </div>
                        </div>
                      </div>

                      <span
                        className={`badge ${isCompleted ? "badge-success" : isFocus ? "badge-warning" : "badge-neutral"}`}
                        style={{ fontSize: "0.72rem" }}
                      >
                        {isCompleted ? "Completed" : isFocus ? "Current Focus" : "Upcoming"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ROADMAP                                               */}
        {/* ============================================================ */}
        {activeTab === "roadmap" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Your Learning Roadmap</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Modules adapt dynamically based on verified conceptual competence and behavioral telemetry.
              </p>
            </div>

            {state?.roadmap.action === "PAUSE_ADVANCEMENT" && (
              <div className="error-banner" style={{ background: "rgba(69, 26, 26, 0.5)", borderColor: "#7f1d1d" }}>
                <AlertTriangle size={20} color="#f87171" />
                <div>
                  <div style={{ fontWeight: 700, color: "#fca5a5" }}>Roadmap Advancement Paused</div>
                  <div style={{ fontSize: "0.85rem", color: "#fecaca", marginTop: "0.2rem" }}>
                    Scholar AI detected that your recent solutions rely heavily on hints. Complete the{" "}
                    <strong>{state.roadmap.topic}</strong> mastery verification check to resume forward advancement.
                  </div>
                  <button
                    onClick={() => setIsMasteryModalOpen(true)}
                    className="btn-primary"
                    style={{ marginTop: "0.75rem", fontSize: "0.82rem", padding: "0.45rem 0.9rem" }}
                  >
                    Start Mastery Check
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {roadmapNodes.map((node) => {
                const isCompleted = node.status === "COMPLETED";
                const isInProgress = node.status === "IN_PROGRESS";
                const isFocus = node.topic === nextAction?.target_topic;
                const isCompletingThis = isCompletingNodeId === node.id;

                return (
                  <div
                    key={node.id}
                    className="card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1rem 1.25rem",
                      borderLeft: `4px solid ${isCompleted ? "#34d399" : isInProgress ? "#6366f1" : isFocus ? "#fbbf24" : "var(--border-subtle)"}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", width: "1.5rem" }}>
                        #{node.sequence}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{node.title}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          Topic: <strong>{node.topic}</strong> • Est: {node.estimated_minutes} mins
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {isInProgress && (
                        <button
                          onClick={() => handleCompleteNode(node.id)}
                          disabled={isCompletingThis}
                          className="btn-primary"
                          style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                        >
                          {isCompletingThis ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check size={13} />
                              <span>Complete Module</span>
                            </>
                          )}
                        </button>
                      )}

                      <span
                        className={`badge ${isCompleted ? "badge-success" : isInProgress ? "badge-info" : isFocus ? "badge-warning" : "badge-neutral"}`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {isCompleted ? "Completed" : isInProgress ? "In Progress" : isFocus ? "Verification Needed" : "Locked"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: PRACTICE (REAL CATALOG & TELEMETRY SUBMISSION)        */}
        {/* ============================================================ */}
        {activeTab === "practice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Practice Problem Modules</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Solve algorithmic patterns independently to generate real telemetry and calibrate verified capability.
              </p>
            </div>

            {/* Notification alert */}
            {solveNotification && (
              <div
                style={{
                  padding: "0.85rem 1.25rem",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  borderRadius: "var(--radius-sm)",
                  color: "#6ee7b7",
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <CheckCircle2 size={18} />
                <span>{solveNotification}</span>
              </div>
            )}

            {/* Topic Filter Pills */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {distinctTopics.map((top) => (
                <button
                  key={top}
                  onClick={() => setSelectedTopicFilter(top)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "9999px",
                    background: selectedTopicFilter === top ? "#6366f1" : "var(--bg-secondary)",
                    color: selectedTopicFilter === top ? "#fff" : "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  {top}
                </button>
              ))}
            </div>

            {/* Real Catalog Problems Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {filteredProblems.map((prob) => {
                const diffBadgeClass =
                  prob.difficulty === "Easy"
                    ? "badge-success"
                    : prob.difficulty === "Medium"
                    ? "badge-warning"
                    : "badge-danger";

                return (
                  <div
                    key={prob.id}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.85rem",
                      padding: "1.25rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{prob.topic}</span>
                        <span className={`badge ${diffBadgeClass}`} style={{ fontSize: "0.7rem" }}>
                          {prob.difficulty}
                        </span>
                      </div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f9fafb" }}>{prob.title}</h3>
                    </div>

                    <button
                      onClick={() => {
                        setSolvingProblem(prob);
                        setCustomAttempts(1);
                        setCustomHints(0);
                        setCustomDuration(15);
                      }}
                      className="btn-primary"
                      style={{ fontSize: "0.82rem", padding: "0.5rem 1rem", width: "100%", justifyContent: "center" }}
                    >
                      <Code2 size={14} />
                      <span>Solve Problem</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: PROJECTS (HONEST CURRICULUM MILESTONES)                */}
        {/* ============================================================ */}
        {activeTab === "projects" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Portfolio Capstone Milestones</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Future placement project milestones unlocked upon verifying foundational roadmap competence.
              </p>
            </div>

            <div
              style={{
                padding: "1rem 1.25rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                fontSize: "0.85rem",
                color: "#c7d2fe",
                lineHeight: 1.5,
              }}
            >
              <strong>Architecture Transparency Notice:</strong> The StepCode prototype focuses on the Scholar AI Competence Engine
              (behavioral telemetry, False Progress Detection, interventions, conceptual mastery verification, and adaptive roadmap mutations).
              Capstone synthesis milestones unlock after preceding curriculum nodes are completed.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Algorithmic Backend API Integration</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    Integrate verified algorithmic modules into structured REST endpoints with server-side validation.
                  </p>
                </div>
                <span className="badge badge-neutral">Future Milestone (Locked)</span>
              </div>

              <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>System Architecture & Verification Capstone</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    Capstone synthesis requiring verified independent mastery across data structures, dynamic programming, and graph traversal.
                  </p>
                </div>
                <span className="badge badge-neutral">Future Milestone (Locked)</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: SCHOLAR AI MENTOR CONSOLE                            */}
        {/* ============================================================ */}
        {activeTab === "scholar" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Scholar AI Competence Mentor</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Ask questions about your recommended next action, review curated topic invariants, or explore diagnostic reasons.
              </p>
            </div>

            <div className="grid-2">
              {/* Left: Curated Knowledge */}
              <GroundedKnowledgePanel
                knowledge={knowledge}
                targetTopic={nextAction?.target_topic || null}
              />

              {/* Right: Interactive Mentor Chat */}
              <ScholarChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
                targetTopic={nextAction?.target_topic || null}
              />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: INSIGHTS (REAL EVALUATOR & DEEP METRICS)              */}
        {/* ============================================================ */}
        {activeTab === "insights" && state && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Scholar Learning Insights</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Empirical diagnostic telemetry, False Progress Index breakdown, and capability calibration formulas.
              </p>
            </div>

            {/* Evaluator State Card */}
            <ScholarStateCard state={state} />

            {/* Explaining the Capability Decoupling Gap */}
            <div className="card" style={{ padding: "1.75rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Understanding Your Verified Capability Score
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "1.25rem" }}>
                Standard platforms only look at roadmap completion ({(profile?.roadmap_completion ?? 0).toFixed(1)}%) and streaks, giving a surface readiness of{" "}
                <strong>{state.capability.standard_readiness_score.toFixed(1)}</strong>. Scholar AI calculates your{" "}
                <strong>Verified Capability Score ({state.capability.verified_capability_score.toFixed(1)})</strong> by weighting activity against
                verified conceptual mastery coverage.
              </p>

              <div
                style={{
                  background: "var(--bg-secondary)",
                  padding: "1.25rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.95rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-around",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>STANDARD READINESS</span>
                  <strong>{state.capability.standard_readiness_score.toFixed(1)}</strong>
                </div>
                <span style={{ color: "var(--text-muted)" }}>×</span>
                <div>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>CONFIDENCE MULTIPLIER</span>
                  <strong>{state.capability.mastery_confidence_multiplier.toFixed(2)}x</strong>
                </div>
                <span style={{ color: "var(--text-muted)" }}>=</span>
                <div>
                  <span style={{ color: "#34d399", fontSize: "0.75rem", display: "block" }}>VERIFIED CAPABILITY</span>
                  <strong style={{ color: "#34d399", fontSize: "1.15rem" }}>
                    {state.capability.verified_capability_score.toFixed(1)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Behavioral Telemetry Signals Breakdown (REAL METRICS) */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                  Behavioral Telemetry Diagnostics
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Total Events: <strong>{telemetryMetrics?.total_events ?? 0}</strong>
                </span>
              </div>

              {telemetryMetrics && telemetryMetrics.total_events > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Hint Reliance Rate</div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        marginTop: "0.2rem",
                        color: telemetryMetrics.hint_dependency_rate > 0.5 ? "#f87171" : "#34d399",
                      }}
                    >
                      {(telemetryMetrics.hint_dependency_rate * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      Threshold: &gt; 50% triggers Hint Crutch
                    </div>
                  </div>

                  <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Independent Solve Rate</div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        marginTop: "0.2rem",
                        color: telemetryMetrics.first_attempt_pass_rate < 0.4 ? "#f87171" : "#34d399",
                      }}
                    >
                      {(telemetryMetrics.first_attempt_pass_rate * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      Threshold: &lt; 40% triggers Low Independence
                    </div>
                  </div>

                  <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Retry Submissions Rate</div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        marginTop: "0.2rem",
                        color:
                          telemetryMetrics.multi_attempt_count / telemetryMetrics.total_events > 0.45
                            ? "#f87171"
                            : "#34d399",
                      }}
                    >
                      {((telemetryMetrics.multi_attempt_count / telemetryMetrics.total_events) * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      Threshold: &gt; 45% triggers Brute Force
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "1.25rem",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-secondary)",
                    color: "var(--text-muted)",
                    fontSize: "0.88rem",
                    textAlign: "center",
                  }}
                >
                  No problem telemetry recorded yet for this student. Complete practice problems in the Practice tab to establish your behavioral baseline.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 7: PROFILE                                               */}
        {/* ============================================================ */}
        {activeTab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "600px" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Student Profile</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Your learning preferences, mode controls, and commitment goals.
              </p>
            </div>

            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Full Name</label>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.15rem" }}>{profile?.name}</div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Student ID</label>
                <div style={{ fontSize: "0.9rem", fontFamily: "var(--font-mono)", color: "#818cf8", marginTop: "0.15rem" }}>
                  {profile?.id}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Career Goal</label>
                <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: "0.15rem" }}>{effectiveGoal}</div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Weekly Commitment</label>
                <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: "0.15rem" }}>{effectiveWeekly}</div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Roadmap Progress</label>
                <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: "0.15rem" }}>
                  {(profile?.roadmap_completion ?? 0).toFixed(1)}%
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Consistency Streak</label>
                <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: "0.15rem" }}>
                  {profile?.current_streak ?? 0} Days
                </div>
              </div>

              <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>System Mode</label>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.4rem" }}>
                  <button
                    onClick={onToggleDemoMode}
                    className="btn-secondary"
                    style={{ fontSize: "0.85rem" }}
                  >
                    {isDemoMode ? "Switch to Student Mode" : "Switch to Evaluator Demo Mode"}
                  </button>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Currently: {isDemoMode ? "Demo Mode" : "Student Mode"}
                  </span>
                </div>
              </div>

              <div style={{ paddingTop: "0.5rem" }}>
                <button
                  onClick={onBackToLanding}
                  className="btn-secondary"
                  style={{ fontSize: "0.85rem", width: "100%", justifyContent: "center" }}
                >
                  Create a New Student Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Interactive Practice Solving Modal */}
      {solvingProblem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1.5rem",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "580px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              padding: "2rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Code2 size={20} color="#818cf8" />
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Solve: {solvingProblem.title}</h2>
              </div>
              <button
                onClick={() => setSolvingProblem(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Topic: <strong>{solvingProblem.topic}</strong> • Difficulty: <strong>{solvingProblem.difficulty}</strong>
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Choose a submission style to record real telemetry into SQLite:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <button
                onClick={() => handleExecuteSolve(solvingProblem, 1, 0, 12)}
                disabled={isSubmittingSolve}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "0.2rem",
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#f9fafb",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#34d399", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Zap size={15} />
                  <span>Autonomous Solve (1 Attempt, 0 Hints)</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Unassisted first-attempt pass. Strengthens verified capability score without false-progress flags.
                </div>
              </button>

              <button
                onClick={() => handleExecuteSolve(solvingProblem, 4, 3, 25)}
                disabled={isSubmittingSolve}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "0.2rem",
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#f9fafb",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <AlertTriangle size={15} />
                  <span>Assisted / Hint-Heavy Solve (4 Attempts, 3 Hints)</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Multiple attempts and heavy hint reliance. Triggers FPDE heuristic detection for demonstration.
                </div>
              </button>
            </div>

            {/* Custom parameters option */}
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius-sm)",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                Or customize specific telemetry parameters:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Submissions</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={customAttempts}
                    onChange={(e) => setCustomAttempts(parseInt(e.target.value) || 1)}
                    style={{ width: "100%", padding: "0.4rem 0.6rem", fontSize: "0.85rem", marginTop: "0.2rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Hints Used</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={customHints}
                    onChange={(e) => setCustomHints(parseInt(e.target.value) || 0)}
                    style={{ width: "100%", padding: "0.4rem 0.6rem", fontSize: "0.85rem", marginTop: "0.2rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Duration (mins)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={customDuration}
                    onChange={(e) => setCustomDuration(parseInt(e.target.value) || 15)}
                    style={{ width: "100%", padding: "0.4rem 0.6rem", fontSize: "0.85rem", marginTop: "0.2rem" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setSolvingProblem(null)}
                className="btn-secondary"
                disabled={isSubmittingSolve}
                style={{ fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteSolve(solvingProblem, customAttempts, customHints, customDuration)}
                className="btn-primary"
                disabled={isSubmittingSolve}
                style={{ fontSize: "0.85rem" }}
              >
                {isSubmittingSolve ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Submit Custom Telemetry</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Mastery Flow Modal */}
      {isMasteryModalOpen && nextAction?.target_topic && (
        <MasteryFlowModal
          studentId={studentId}
          topic={nextAction.target_topic}
          onClose={() => setIsMasteryModalOpen(false)}
          onMasteryCompleted={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
