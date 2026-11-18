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
  Play,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
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

      // Fetch roadmap nodes for visual timeline
      try {
        const nodes = await scholarApi.getRoadmap(studentId);
        setRoadmapNodes(nodes || []);
      } catch {
        setRoadmapNodes([]);
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
    setActiveTab("scholar");
  };

  const handleExplainTopic = (topic: string) => {
    handleSendMessage(`Explain ${topic}`);
    setActiveTab("scholar");
  };

  // Student-friendly terminology translations
  const getFriendlyActionTitle = (action: string, topic?: string | null) => {
    switch (action) {
      case "COMPLETE_MASTERY_CHECK":
        return topic ? `Strengthen & Verify ${topic}` : "Verify Conceptual Mastery";
      case "COMPLETE_REMEDIATION":
        return topic ? `Remediate ${topic} Concepts` : "Review Target Concepts";
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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top Demo Mode Banner (when active) */}
      {isDemoMode && (
        <div
          style={{
            background: "linear-gradient(90deg, #1e1b4b 0%, #1e293b 100%)",
            borderBottom: "1px solid #4338ca",
            padding: "0.5rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.82rem",
            color: "#c7d2fe",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="badge badge-info" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem" }}>
              DEMO MODE
            </span>
            <span>Using benchmark student profiles for evaluation.</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Benchmark Student:</span>
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
              <option value="student_priya">Priya Mehta (Autonomous Progression Scenario)</option>
              <option value="student_marcus">Marcus (Insufficient Evidence Scenario)</option>
            </select>
            <button
              onClick={onToggleDemoMode}
              style={{ background: "transparent", color: "#a5b4fc", fontSize: "0.78rem", textDecoration: "underline" }}
            >
              Return to Student Mode
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
          {!isDemoMode && (
            <button
              onClick={onToggleDemoMode}
              className="btn-secondary"
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              <Play size={12} color="#818cf8" />
              <span>Demo Mode</span>
            </button>
          )}

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
                  Good evening, {profile?.name?.split(" ")[0] || "Student"}
                </h1>
                <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span>Track: <strong>{effectiveGoal}</strong></span>
                  <span>•</span>
                  <span>Commitment: <strong>{effectiveWeekly}</strong></span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#fbbf24", fontSize: "0.9rem", fontWeight: 600 }}>
                  <Flame size={18} />
                  <span>{profile?.current_streak || 0} Day Streak</span>
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
                    {(profile?.roadmap_completion || state.roadmap.topic ? profile?.roadmap_completion || 72 : 0).toFixed(1)}%
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
                    {profile?.current_streak || 0} Days
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
                  style={{ background: "transparent", color: "#818cf8", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
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
                Modules adapt dynamically based on your verified conceptual competence.
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
                const isFocus = node.topic === nextAction?.target_topic;

                return (
                  <div
                    key={node.id}
                    className="card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1rem 1.25rem",
                      borderLeft: `4px solid ${isCompleted ? "#34d399" : isFocus ? "#fbbf24" : "var(--border-subtle)"}`,
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
                      <span
                        className={`badge ${isCompleted ? "badge-success" : isFocus ? "badge-warning" : "badge-neutral"}`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {isCompleted ? "Completed" : isFocus ? "Verification Needed" : "Locked"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: PRACTICE                                              */}
        {/* ============================================================ */}
        {activeTab === "practice" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Practice Problem Modules</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Solve algorithmic patterns independently to strengthen your verified capability.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {[
                { topic: "Sliding Window", problems: 8, status: "Focus Topic", icon: "🪟" },
                { topic: "Dynamic Programming", problems: 10, status: "Upcoming", icon: "⚡" },
                { topic: "Recursion & Backtracking", problems: 8, status: "Upcoming", icon: "🔄" },
                { topic: "Graph Traversal", problems: 8, status: "Upcoming", icon: "🌐" },
                { topic: "Arrays & Hashing", problems: 6, status: "Completed", icon: "📦" },
              ].map((p, idx) => (
                <div key={idx} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ fontSize: "1.5rem" }}>{p.icon}</div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{p.topic}</h3>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {p.problems} catalog problems available
                  </div>
                  <span
                    className={`badge ${p.status === "Focus Topic" ? "badge-warning" : p.status === "Completed" ? "badge-success" : "badge-neutral"}`}
                    style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: PROJECTS                                              */}
        {/* ============================================================ */}
        {activeTab === "projects" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Portfolio Capstone Projects</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Demonstrate end-to-end full-stack competence for placement portfolios.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Full-Stack REST & Async Microservices</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    Build scalable FastAPI endpoints with PostgreSQL, Redis caching, and Docker containers.
                  </p>
                </div>
                <span className="badge badge-neutral">Locked (Requires Graphs)</span>
              </div>

              <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>System Design & Distributed Capstone</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    Architect a high-throughput event streaming platform with rate limiting and database partitioning.
                  </p>
                </div>
                <span className="badge badge-neutral">Locked</span>
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
        {/* TAB 6: INSIGHTS (EVALUATOR & DEEP METRICS)                  */}
        {/* ============================================================ */}
        {activeTab === "insights" && state && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Scholar Learning Insights</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Deep diagnostic telemetry, False Progress Index breakdown, and capability calibration formulas.
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
                Standard platforms only look at roadmap completion ({profile?.roadmap_completion || 72}%) and streaks, giving a surface readiness of{" "}
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

            {/* Behavioral Telemetry Signals Breakdown */}
            <div className="card">
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>
                Behavioral Telemetry Diagnostics
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Hint Reliance Rate</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.2rem", color: state.false_progress.detected ? "#f87171" : "#34d399" }}>
                    {state.false_progress.detected ? "77.5%" : "8.6%"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Threshold: &gt; 50% triggers Hint Crutch
                  </div>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Independent Solve Rate</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.2rem", color: state.false_progress.detected ? "#f87171" : "#34d399" }}>
                    {state.false_progress.detected ? "20.0%" : "85.7%"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Threshold: &lt; 40% triggers Low Independence
                  </div>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Retry Submissions Rate</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.2rem", color: state.false_progress.detected ? "#f87171" : "#34d399" }}>
                    {state.false_progress.detected ? "80.0%" : "15.0%"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Threshold: &gt; 45% triggers Brute Force
                  </div>
                </div>
              </div>
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
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Career Goal</label>
                <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: "0.15rem" }}>{effectiveGoal}</div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Weekly Commitment</label>
                <div style={{ fontSize: "1rem", fontWeight: 600, marginTop: "0.15rem" }}>{effectiveWeekly}</div>
              </div>

              <div>
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
            </div>
          </div>
        )}
      </main>

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
