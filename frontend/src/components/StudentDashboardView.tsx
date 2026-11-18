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
  Play,
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
  HelpCircle,
  Clock,
  Lightbulb,
  Save,
  ShieldAlert,
  Activity,
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
    description?: string;
    solved?: boolean;
    is_solved?: boolean;
    attempts?: number;
  }>>([]);

  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("All");
  const [solvingProblem, setSolvingProblem] = useState<{
    id: string;
    title: string;
    topic: string;
    difficulty: string;
    description?: string;
    solved?: boolean;
    attempts?: number;
  } | null>(null);
  const [customAttempts, setCustomAttempts] = useState<number>(1);
  const [customHints, setCustomHints] = useState<number>(0);
  const [customDuration, setCustomDuration] = useState<number>(15);
  const [isSubmittingSolve, setIsSubmittingSolve] = useState<boolean>(false);
  const [solveNotification, setSolveNotification] = useState<string | null>(null);
  const [isCompletingNodeId, setIsCompletingNodeId] = useState<string | null>(null);
  const [isStartingNodeId, setIsStartingNodeId] = useState<string | null>(null);

  // "Why this action?" evidence breakdown modal
  const [isWhyModalOpen, setIsWhyModalOpen] = useState<boolean>(false);

  // Clickable roadmap module details modal
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<{
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
    effective_state?: string;
    state_reason?: string;
  } | null>(null);
  const [isLoadingNodeDetails, setIsLoadingNodeDetails] = useState<boolean>(false);
  const [completionFeedback, setCompletionFeedback] = useState<{
    allowed: boolean;
    message: string;
    action?: string;
  } | null>(null);

  // Clickable projects capstone modal
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    title: string;
    difficulty: string;
    description: string;
    techStack: string[];
    prereqTopics: string[];
    prereqModuleSequences: number[];
    minCapability: number;
  } | null>(null);

  // Practice code editor & hint state
  const [selectedLanguage, setSelectedLanguage] = useState<string>("Python");
  const [hintsRevealed, setHintsRevealed] = useState<number>(0);
  const [userCode, setUserCode] = useState<string>("");

  // Profile preferences edit state
  const [editName, setEditName] = useState<string>("");
  const [editGoal, setEditGoal] = useState<string>("");
  const [editWeeklyHours, setEditWeeklyHours] = useState<number>(10);
  const [editBaseline, setEditBaseline] = useState<string>("Intermediate");
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<boolean>(false);

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
          scholarApi.getProblems(studentId).catch(() => []),
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
    // Evidence-enforced completion: always routes through verification
    await handleVerifyComplete(nodeId);
  };

  const handleStartNode = async (nodeId: string) => {
    setIsStartingNodeId(nodeId);
    try {
      const updatedNodes = await scholarApi.startRoadmapNode(studentId, nodeId);
      setRoadmapNodes(updatedNodes || []);
      await loadData();
    } catch (err) {
      console.error("Failed to start roadmap node:", err);
    } finally {
      setIsStartingNodeId(null);
    }
  };

  const handleOpenNodeDetails = async (nodeId: string) => {
    setIsLoadingNodeDetails(true);
    try {
      const details = await scholarApi.getRoadmapNodeDetails(studentId, nodeId);
      setSelectedNodeDetails(details);
    } catch (err) {
      console.error("Failed to fetch node details:", err);
      const fallback = roadmapNodes.find((n) => n.id === nodeId);
      if (fallback) {
        setSelectedNodeDetails({
          ...fallback,
          what_you_learn: [
            "Algorithmic invariants and complexity bounds",
            "Optimal memory and space-time tradeoffs",
            "Pattern application to edge-case problem variants",
          ],
          required_evidence: 2,
          current_evidence: 0,
          prerequisite_title: null,
          prerequisite_completed: true,
          mastery_status: "NO_RECORD",
          can_complete: false,
        });
      }
    } finally {
      setIsLoadingNodeDetails(false);
    }
  };

  const handleVerifyComplete = async (nodeId: string) => {
    setIsCompletingNodeId(nodeId);
    try {
      const res = await scholarApi.verifyRoadmapNodeCompletion(studentId, nodeId);
      if (!res.allowed) {
        setCompletionFeedback({
          allowed: false,
          message: res.message,
          action: res.action,
        });
      } else {
        setSolveNotification(res.message);
        setTimeout(() => setSolveNotification(null), 5000);
        setSelectedNodeDetails(null);
        await loadData();
      }
    } catch (err) {
      console.error("Failed to verify completion:", err);
      await handleCompleteNode(nodeId);
    } finally {
      setIsCompletingNodeId(null);
    }
  };

  // Sync profile editing values
  useEffect(() => {
    if (profile) {
      setEditName(profile.name || "");
      setEditGoal(profile.career_goal || "");
      setEditWeeklyHours(profile.weekly_hours || 10);
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const updated = await scholarApi.updateStudentProfile(studentId, {
        name: editName,
        career_goal: editGoal,
        weekly_hours: editWeeklyHours,
        baseline_level: editBaseline,
      });
      setProfile(updated);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const getStarterCode = (probTitle: string, lang: string) => {
    switch (lang) {
      case "C++":
        return `// Problem: ${probTitle}\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solve(vector<int>& nums) {\n        // Maintain sliding window / algorithm invariants\n        return 0;\n    }\n};`;
      case "Java":
        return `// Problem: ${probTitle}\nclass Solution {\n    public int solve(int[] nums) {\n        // Your code here\n        return 0;\n    }\n}`;
      case "JavaScript":
        return `// Problem: ${probTitle}\nfunction solve(nums) {\n    // Implement optimal solution\n    return 0;\n}`;
      default:
        return `# Problem: ${probTitle}\ndef solve(nums):\n    # Maintain running state and invariants\n    left = 0\n    return 0`;
    }
  };

  const getProblemHints = (topic: string) => {
    if (topic.includes("Sliding Window")) {
      return [
        "Track window boundaries using left and right pointers. Avoid recomputing sums from scratch.",
        "When the window constraint is broken, advance the left pointer and subtract the outgoing value.",
        "Core Invariant: window_sum maintains sum(nums[left:right+1]). Update max candidate when window size equals K.",
      ];
    } else if (topic.includes("Dynamic Programming")) {
      return [
        "Identify overlapping subproblems: What is the optimal decision at step i based on previous steps?",
        "Define your state transition: dp[i] = min(dp[i-1], dp[i-2]) + cost[i].",
        "Core Invariant: Subproblem optimality guarantees global optimality with no cyclic dependencies.",
      ];
    } else if (topic.includes("Graph")) {
      return [
        "Choose appropriate representation: Adjacency list is preferred for sparse graphs.",
        "Use a visited set or in-place mark to prevent infinite loops in cyclic components.",
        "Core Invariant: For shortest path on unweighted graphs, queue order in BFS guarantees earliest discovery.",
      ];
    } else {
      return [
        "Analyze whether sorting or hashing gives the desired time-space tradeoff.",
        "Can a hash map store frequency counts or previously seen complements in O(1) time?",
        "Core Invariant: Map each seen element so lookups for complement target - num occur in constant time.",
      ];
    }
  };

  const capstoneProjects = [
    {
      id: "proj_backend_api",
      title: "Algorithmic Backend API Integration",
      difficulty: "Intermediate Capstone",
      description: "Integrate verified algorithmic modules into structured REST endpoints with server-side validation and comprehensive error handling.",
      techStack: ["FastAPI", "SQLAlchemy", "SQLite", "Pydantic"],
      prereqTopics: ["Arrays & Hashing", "Sliding Window"],
      prereqModuleSequences: [1, 2, 3],
      minCapability: 30,
    },
    {
      id: "proj_distributed_engine",
      title: "High-Performance Distributed Data Engine",
      difficulty: "Advanced Capstone",
      description: "Capstone synthesis requiring verified independent mastery across dynamic programming state transitions, topological sorting, and graph traversals.",
      techStack: ["Python AsyncIO", "Graph Algorithms", "Memoization Engines", "Topological DAG"],
      prereqTopics: ["Dynamic Programming", "Graph Traversal"],
      prereqModuleSequences: [5, 7, 8],
      minCapability: 60,
    },
  ];

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
                  Good evening, {profile?.name || "Student"}
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
                    onClick={() => setIsWhyModalOpen(true)}
                    className="btn-secondary"
                    style={{ padding: "0.75rem 1.25rem", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <HelpCircle size={15} color="#818cf8" />
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
                const isLocked = node.is_locked;
                const isPendingUnlocked = node.status === "PENDING" && !node.is_locked;
                const isInProgress = node.status === "IN_PROGRESS" && !node.is_locked;
                const isStartingThis = isStartingNodeId === node.id;
                const isCompletingThis = isCompletingNodeId === node.id;

                // Check Scholar AI intervention & roadmap state for this topic
                const isTopicPaused = Boolean(
                  isInProgress &&
                  (state?.roadmap?.action === "PAUSE_ADVANCEMENT" || state?.intervention?.roadmap_action === "PAUSE_ADVANCEMENT" || nextAction?.action === "COMPLETE_MASTERY_CHECK") &&
                  (state?.roadmap?.topic === node.topic || !state?.roadmap?.topic || nextAction?.target_topic === node.topic)
                );
                const isTopicRemediation = Boolean(
                  node.node_type === "REMEDIATION" ||
                  (isInProgress && state?.roadmap?.action === "REMEDIATE_TOPIC" &&
                    (state?.roadmap?.topic === node.topic || !state?.roadmap?.topic || nextAction?.target_topic === node.topic))
                );

                // Telemetry evidence
                const solvedCount = Math.max(
                  telemetryMetrics?.topic_breakdown?.[node.topic]?.total || 0,
                  problems.filter((p) => p.topic === node.topic && (p.solved || p.is_solved)).length
                );
                const requiredEvidence = node.topic.includes("Sliding Window") ? 3 : 2;
                const hasSufficientEvidence = solvedCount >= requiredEvidence;

                let effectiveState: "COMPLETED" | "LOCKED" | "AVAILABLE" | "MASTERY_CHECK_REQUIRED" | "REMEDIATION" | "NEEDS_EVIDENCE" | "IN_PROGRESS" = "LOCKED";
                let stateSubtitle = "";

                if (isCompleted) {
                  effectiveState = "COMPLETED";
                  stateSubtitle = "Module completed based on verified learning evidence.";
                } else if (isTopicPaused) {
                  effectiveState = "MASTERY_CHECK_REQUIRED";
                  stateSubtitle = "Scholar AI detected false progress • Mastery check required.";
                } else if (isTopicRemediation) {
                  effectiveState = "REMEDIATION";
                  stateSubtitle = "Recent evidence indicates this topic needs conceptual reinforcement.";
                } else if (isLocked) {
                  effectiveState = "LOCKED";
                  stateSubtitle = `Requires #${node.sequence - 1}`;
                } else if (isPendingUnlocked) {
                  effectiveState = "AVAILABLE";
                  stateSubtitle = "Prerequisites satisfied • Ready to begin module.";
                } else if (!hasSufficientEvidence) {
                  effectiveState = "NEEDS_EVIDENCE";
                  stateSubtitle = `Evidence: ${solvedCount}/${requiredEvidence} solved • More practice evidence needed.`;
                } else {
                  effectiveState = "IN_PROGRESS";
                  stateSubtitle = `Evidence satisfied (${solvedCount}/${requiredEvidence} solved) • Ready for Scholar AI verification.`;
                }

                return (
                  <div
                    key={node.id}
                    className="card"
                    onClick={() => handleOpenNodeDetails(node.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1rem 1.25rem",
                      cursor: "pointer",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
                      borderLeft: `4px solid ${
                        effectiveState === "COMPLETED"
                          ? "#34d399"
                          : effectiveState === "MASTERY_CHECK_REQUIRED"
                          ? "#f59e0b"
                          : effectiveState === "REMEDIATION"
                          ? "#ef4444"
                          : effectiveState === "NEEDS_EVIDENCE"
                          ? "#fbbf24"
                          : effectiveState === "IN_PROGRESS"
                          ? "#10b981"
                          : effectiveState === "AVAILABLE"
                          ? "#6366f1"
                          : "var(--border-subtle)"
                      }`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", width: "1.5rem" }}>
                        #{node.sequence}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span>{node.title}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 400 }}>
                            (Click for details)
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          Topic: <strong>{node.topic}</strong> • Est: {node.estimated_minutes} mins
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          {stateSubtitle}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={(e) => e.stopPropagation()}>
                      {/* COMPLETED */}
                      {effectiveState === "COMPLETED" && (
                        <>
                          <button
                            onClick={() => {
                              handleExplainTopic(node.topic);
                              setActiveTab("scholar");
                            }}
                            className="btn-secondary"
                            style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            <BrainCircuit size={12} color="#818cf8" />
                            <span>Review Invariants</span>
                          </button>
                          <span className="badge badge-success" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <CheckCircle2 size={12} />
                            <span>Completed</span>
                          </span>
                        </>
                      )}

                      {/* LOCKED */}
                      {effectiveState === "LOCKED" && (
                        <>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginRight: "0.25rem" }}>
                            <Lock size={12} />
                            <span>Requires #{node.sequence - 1}</span>
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <Lock size={12} />
                            <span>Locked</span>
                          </span>
                        </>
                      )}

                      {/* AVAILABLE / NOT STARTED */}
                      {effectiveState === "AVAILABLE" && (
                        <>
                          <button
                            onClick={() => handleStartNode(node.id)}
                            disabled={isStartingThis}
                            className="btn-secondary"
                            style={{ fontSize: "0.75rem", padding: "0.35rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            {isStartingThis ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Starting...</span>
                              </>
                            ) : (
                              <>
                                <Play size={13} />
                                <span>Start Module</span>
                              </>
                            )}
                          </button>
                          <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>Available</span>
                        </>
                      )}

                      {/* MASTERY_CHECK_REQUIRED */}
                      {effectiveState === "MASTERY_CHECK_REQUIRED" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedTopicFilter(node.topic);
                              setIsMasteryModalOpen(true);
                            }}
                            className="btn-primary"
                            style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", background: "#f59e0b", borderColor: "#d97706", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            <ShieldAlert size={13} />
                            <span>Verify Mastery</span>
                          </button>
                          <span className="badge badge-warning" style={{ fontSize: "0.75rem", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.3)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <ShieldAlert size={12} />
                            <span>Mastery Required</span>
                          </span>
                        </>
                      )}

                      {/* REMEDIATION */}
                      {effectiveState === "REMEDIATION" && (
                        <>
                          <button
                            onClick={() => {
                              handleExplainTopic(node.topic);
                              setActiveTab("scholar");
                            }}
                            className="btn-secondary"
                            style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            <BrainCircuit size={12} color="#818cf8" />
                            <span>Review Invariants</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTopicFilter(node.topic);
                              setActiveTab("practice");
                            }}
                            className="btn-secondary"
                            style={{ fontSize: "0.75rem", padding: "0.35rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            <Code2 size={13} />
                            <span>Practice Problems</span>
                          </button>
                          <span className="badge badge-danger" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <AlertTriangle size={12} />
                            <span>Remediation</span>
                          </span>
                        </>
                      )}

                      {/* NEEDS_EVIDENCE */}
                      {effectiveState === "NEEDS_EVIDENCE" && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedTopicFilter(node.topic);
                              setActiveTab("practice");
                            }}
                            className="btn-secondary"
                            style={{ fontSize: "0.75rem", padding: "0.35rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            <Code2 size={13} />
                            <span>Practice Problems</span>
                          </button>
                          <span className="badge badge-warning" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <Activity size={12} />
                            <span>Needs Evidence ({solvedCount}/{requiredEvidence})</span>
                          </span>
                        </>
                      )}

                      {/* IN_PROGRESS (evidence satisfied) */}
                      {effectiveState === "IN_PROGRESS" && (
                        <>
                          <button
                            onClick={() => handleVerifyComplete(node.id)}
                            disabled={isCompletingThis}
                            className="btn-primary"
                            style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            {isCompletingThis ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <Check size={13} />
                                <span>Verify Evidence</span>
                              </>
                            )}
                          </button>
                          <span className="badge badge-info" style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.3)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <Check size={12} />
                            <span>Evidence Ready</span>
                          </span>
                        </>
                      )}
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
                        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                          {prob.solved ? (
                            <span className="badge badge-success" style={{ fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                              <CheckCircle2 size={11} />
                              <span>Solved</span>
                            </span>
                          ) : prob.attempts && prob.attempts > 0 ? (
                            <span className="badge badge-warning" style={{ fontSize: "0.7rem" }}>
                              {prob.attempts} {prob.attempts === 1 ? "att." : "atts."}
                            </span>
                          ) : (
                            <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                              New
                            </span>
                          )}
                          <span className={`badge ${diffBadgeClass}`} style={{ fontSize: "0.7rem" }}>
                            {prob.difficulty}
                          </span>
                        </div>
                      </div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f9fafb" }}>{prob.title}</h3>
                      {prob.description && (
                        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.35rem", lineHeight: 1.4 }}>
                          {prob.description}
                        </p>
                      )}
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

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {capstoneProjects.map((proj) => {
                const prereqNodes = roadmapNodes.filter((n) => proj.prereqModuleSequences.includes(n.sequence));
                const completedPrereqs = prereqNodes.filter((n) => n.status === "COMPLETED");
                const isPrereqsMet = prereqNodes.length > 0 && completedPrereqs.length === prereqNodes.length;
                const isCapabilityMet = (state?.capability.verified_capability_score ?? 0) >= proj.minCapability;
                const isUnlocked = isPrereqsMet && isCapabilityMet;

                return (
                  <div
                    key={proj.id}
                    className="card"
                    onClick={() => setSelectedProject(proj)}
                    style={{
                      cursor: "pointer",
                      padding: "1.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      borderLeft: `4px solid ${isUnlocked ? "#34d399" : "var(--border-subtle)"}`,
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                          <FolderGit2 size={18} color="#818cf8" />
                          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#f9fafb" }}>{proj.title}</h3>
                        </div>
                        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", maxWidth: "750px", lineHeight: 1.5 }}>
                          {proj.description}
                        </p>
                      </div>

                      <span
                        className={`badge ${isUnlocked ? "badge-success" : "badge-neutral"}`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {isUnlocked ? "Ready to Build" : "Prerequisites Incomplete"}
                      </span>
                    </div>

                    {/* Live Prerequisite Competencies Checklist */}
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        padding: "0.85rem 1rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "0.82rem",
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                        Roadmap Competency Prerequisites:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.5rem" }}>
                        {prereqNodes.map((n) => {
                          const isDone = n.status === "COMPLETED";
                          return (
                            <div key={n.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              {isDone ? (
                                <CheckCircle2 size={14} color="#34d399" />
                              ) : (
                                <Clock size={14} color="#f59e0b" />
                              )}
                              <span style={{ color: isDone ? "#e2e8f0" : "var(--text-muted)" }}>
                                Module #{n.sequence}: {n.topic} {isDone ? "(✓)" : "(Incomplete)"}
                              </span>
                            </div>
                          );
                        })}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {isCapabilityMet ? (
                            <CheckCircle2 size={14} color="#34d399" />
                          ) : (
                            <Clock size={14} color="#f59e0b" />
                          )}
                          <span style={{ color: isCapabilityMet ? "#e2e8f0" : "var(--text-muted)" }}>
                            Verified Capability &ge; {proj.minCapability} (Current: {(state?.capability.verified_capability_score ?? 0).toFixed(1)})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.25rem" }}>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {proj.techStack.map((tech) => (
                          <span key={tech} className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                            {tech}
                          </span>
                        ))}
                      </div>

                      <button
                        className="btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject(proj);
                        }}
                        style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
                      >
                        View Project Scope
                      </button>
                    </div>
                  </div>
                );
              })}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "800px" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Student Profile & Verified Statistics</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                Update your learning preferences and review empirical competence statistics backed by SQLite telemetry.
              </p>
            </div>

            {profileSaveSuccess && (
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
                <span>Learning preferences successfully saved to SQLite database!</span>
              </div>
            )}

            {/* Editable Profile Information Form */}
            <form onSubmit={handleSaveProfile} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Learning Preferences</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  ID: {profile?.id}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.85rem", fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                    Career Goal
                  </label>
                  <select
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.85rem", fontSize: "0.9rem", background: "var(--bg-secondary)", color: "#fff", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                  >
                    <option value="Full-Stack Developer">Full-Stack Developer</option>
                    <option value="AI/ML Engineer">AI/ML Engineer</option>
                    <option value="Backend Systems Engineer">Backend Systems Engineer</option>
                    <option value="Cloud Architect">Cloud Architect</option>
                    <option value="DevOps & Platform Engineer">DevOps & Platform Engineer</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                    Weekly Commitment (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={editWeeklyHours}
                    onChange={(e) => setEditWeeklyHours(Number(e.target.value))}
                    style={{ width: "100%", padding: "0.55rem 0.85rem", fontSize: "0.9rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                    Baseline Experience Level
                  </label>
                  <select
                    value={editBaseline}
                    onChange={(e) => setEditBaseline(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.85rem", fontSize: "0.9rem", background: "var(--bg-secondary)", color: "#fff", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}
                  >
                    <option value="Beginner">Beginner (Foundations)</option>
                    <option value="Intermediate">Intermediate (Core DSA)</option>
                    <option value="Advanced">Advanced (Systems & Optimization)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1.25rem", fontSize: "0.88rem" }}
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving to SQLite...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Learning Preferences</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Empirical Learning Statistics Grid (Item 27) */}
            <div className="card" style={{ padding: "1.75rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>
                Empirical Learning Statistics
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Problems Solved</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.2rem", color: "#818cf8" }}>
                    {telemetryMetrics?.total_events ?? 0}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Across active curriculum topics
                  </div>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Independent Success Rate</div>
                  <div
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      marginTop: "0.2rem",
                      color: (telemetryMetrics?.first_attempt_pass_rate ?? 1) < 0.4 ? "#f87171" : "#34d399",
                    }}
                  >
                    {telemetryMetrics ? (telemetryMetrics.first_attempt_pass_rate * 100).toFixed(1) : "0.0"}%
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    First-attempt unassisted pass
                  </div>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Hint Reliance Rate</div>
                  <div
                    style={{
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      marginTop: "0.2rem",
                      color: (telemetryMetrics?.hint_dependency_rate ?? 0) > 0.5 ? "#f87171" : "#34d399",
                    }}
                  >
                    {telemetryMetrics ? (telemetryMetrics.hint_dependency_rate * 100).toFixed(1) : "0.0"}%
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Lower indicates higher independence
                  </div>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Active Streak</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.2rem", color: "#fbbf24" }}>
                    {profile?.current_streak ?? 0} Days
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Verified practice streak
                  </div>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Roadmap Completion</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.2rem", color: "#38bdf8" }}>
                    {(profile?.roadmap_completion ?? 0).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Completed curriculum modules
                  </div>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Verified Capability</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.2rem", color: "#34d399" }}>
                    {(state?.capability.verified_capability_score ?? 0).toFixed(1)} / 100
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Status: {state?.capability.readiness_status ?? "INSUFFICIENT_EVIDENCE"}
                  </div>
                </div>
              </div>
            </div>

            {/* System Mode & Profile Switcher */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Evaluation & Navigation Mode
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{isDemoMode ? "Evaluator Demo Environment" : "Student-Facing Production Environment"}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    {isDemoMode ? "Accessing benchmark archetypes (Alex, Priya, Marcus)" : "Accessing genuine SQLite student record"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={onToggleDemoMode} className="btn-secondary" style={{ fontSize: "0.82rem" }}>
                    {isDemoMode ? "Switch to Student Mode" : "Switch to Demo Mode"}
                  </button>
                  <button onClick={onBackToLanding} className="btn-secondary" style={{ fontSize: "0.82rem" }}>
                    Back to Landing
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL 1: INTERACTIVE PROBLEM SOLVER WITH REAL HINT TELEMETRY  */}
      {/* ============================================================ */}
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
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              padding: "2rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Code2 size={22} color="#818cf8" />
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{solvingProblem.title}</h2>
              </div>
              <button
                onClick={() => {
                  setSolvingProblem(null);
                  setHintsRevealed(0);
                }}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Topic: <strong>{solvingProblem.topic}</strong></span>
              <span>•</span>
              <span className={`badge ${solvingProblem.difficulty === "Easy" ? "badge-success" : solvingProblem.difficulty === "Medium" ? "badge-warning" : "badge-danger"}`}>
                {solvingProblem.difficulty}
              </span>
            </div>

            {/* Problem Description */}
            <div
              style={{
                padding: "0.9rem 1.1rem",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.88rem",
                lineHeight: 1.55,
                color: "#e2e8f0",
                marginBottom: "1.25rem",
              }}
            >
              {solvingProblem.description || "Solve the algorithmic challenge respecting optimal complexity guarantees."}
            </div>

            {/* Language Selector */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                Solution Implementation
              </label>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                {["Python", "C++", "Java", "JavaScript"].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      background: selectedLanguage === lang ? "#6366f1" : "transparent",
                      color: selectedLanguage === lang ? "#fff" : "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Scratchpad Area */}
            <div style={{ marginBottom: "1.25rem" }}>
              <textarea
                rows={7}
                value={userCode || getStarterCode(solvingProblem.title, selectedLanguage)}
                onChange={(e) => setUserCode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                  background: "#0d1117",
                  color: "#58a6ff",
                  border: "1px solid #30363d",
                  borderRadius: "var(--radius-sm)",
                  lineHeight: 1.45,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Dynamic Telemetry-Generating Hint System (Item 11 & 12) */}
            <div
              style={{
                background: "rgba(99, 102, 241, 0.06)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: "var(--radius-sm)",
                padding: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", fontWeight: 700, color: "#818cf8" }}>
                  <Lightbulb size={16} />
                  <span>Interactive Guidance (Generates Telemetry)</span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Hints Requested: <strong>{customHints}</strong>
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                <button
                  onClick={() => {
                    setHintsRevealed(Math.max(hintsRevealed, 1));
                    setCustomHints((prev) => prev + 1);
                  }}
                  className="btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                >
                  {hintsRevealed >= 1 ? "Hint 1 (Revealed)" : "Show Hint 1 (+1 Hint)"}
                </button>

                <button
                  onClick={() => {
                    setHintsRevealed(Math.max(hintsRevealed, 2));
                    setCustomHints((prev) => prev + 1);
                  }}
                  className="btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                >
                  {hintsRevealed >= 2 ? "Hint 2 (Revealed)" : "Show Hint 2 (+1 Hint)"}
                </button>

                <button
                  onClick={() => {
                    setHintsRevealed(3);
                    setCustomHints((prev) => prev + 1);
                  }}
                  className="btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem" }}
                >
                  {hintsRevealed >= 3 ? "Core Invariant (Revealed)" : "Show Invariant (+1 Hint)"}
                </button>
              </div>

              {/* Revealed Hints Display */}
              {hintsRevealed > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem" }}>
                  {getProblemHints(solvingProblem.topic).slice(0, hintsRevealed).map((hint, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.5rem 0.75rem",
                        background: "rgba(245, 158, 11, 0.1)",
                        borderLeft: "3px solid #f59e0b",
                        fontSize: "0.8rem",
                        color: "#fef3c7",
                      }}
                    >
                      <strong>{idx === 2 ? "Core Invariant: " : `Hint ${idx + 1}: `}</strong>
                      {hint}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Telemetry Submission Presets */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <button
                onClick={() => handleExecuteSolve(solvingProblem, 1, 0, 12)}
                disabled={isSubmittingSolve}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "0.2rem",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#f9fafb",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#34d399", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <Zap size={14} />
                  <span>Autonomous Solve (1 Attempt, 0 Hints)</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Strengthens verified capability.
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
                  padding: "0.75rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#f9fafb",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <AlertTriangle size={14} />
                  <span>Assisted / Hint-Heavy Solve (4 Attempts, 3 Hints)</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Triggers FPDE heuristic flags.
                </div>
              </button>
            </div>

            {/* Custom Telemetry Inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem", background: "var(--bg-secondary)", padding: "0.75rem", borderRadius: "var(--radius-sm)" }}>
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Submissions</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={customAttempts}
                  onChange={(e) => setCustomAttempts(parseInt(e.target.value) || 1)}
                  style={{ width: "100%", padding: "0.35rem 0.5rem", fontSize: "0.82rem", marginTop: "0.2rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Hints Used</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={customHints}
                  onChange={(e) => setCustomHints(parseInt(e.target.value) || 0)}
                  style={{ width: "100%", padding: "0.35rem 0.5rem", fontSize: "0.82rem", marginTop: "0.2rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Duration (mins)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(parseInt(e.target.value) || 15)}
                  style={{ width: "100%", padding: "0.35rem 0.5rem", fontSize: "0.82rem", marginTop: "0.2rem" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => {
                  setSolvingProblem(null);
                  setHintsRevealed(0);
                }}
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
                    <span>Recording Telemetry...</span>
                  </>
                ) : (
                  <span>Run & Submit Solution</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: "WHY THIS ACTION?" EVIDENCE BREAKDOWN MODAL (Item 15) */}
      {/* ============================================================ */}
      {isWhyModalOpen && nextAction && (
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
              maxWidth: "560px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              padding: "2rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BrainCircuit size={22} color="#818cf8" />
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Scholar AI Evidence Explanation</h2>
              </div>
              <button
                onClick={() => setIsWhyModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
                fontSize: "0.85rem",
                color: "#c7d2fe",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#818cf8", fontWeight: 700 }}>
                Current Recommendation
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", marginTop: "0.15rem" }}>
                {nextAction.action.replace(/_/g, " ")} {nextAction.target_topic ? `(${nextAction.target_topic})` : ""}
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Why am I seeing this recommendation?
              </div>
              <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "0.75rem" }}>
                {nextAction.reason}
              </p>

              {/* Concrete Telemetry Evidence Points */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", background: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Observed Diagnostic Signals:
                </div>

                {state?.false_progress.detected ? (
                  <>
                    <div style={{ fontSize: "0.82rem", color: "#f87171", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <AlertTriangle size={14} />
                      <span>False Progress Index: <strong>{state.false_progress.index.toFixed(1)}</strong> ({state.false_progress.severity})</span>
                    </div>
                    {state.false_progress.triggers.map((trig) => (
                      <div key={trig} style={{ fontSize: "0.8rem", color: "#fca5a5", marginLeft: "1.2rem" }}>
                        • Triggered: <strong>{trig.replace("FP_", "")}</strong>
                      </div>
                    ))}
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                      Therefore: Forward roadmap advancement is paused until conceptual mastery is independently verified.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "0.82rem", color: "#34d399", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <CheckCircle2 size={14} />
                      <span>False Progress Index: <strong>0.0</strong> (Clean Behavioral Baseline)</span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Source Components: {nextAction.source_components.join(", ")}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => {
                  setIsWhyModalOpen(false);
                  setActiveTab("scholar");
                  handleAskWhy();
                }}
                className="btn-secondary"
                style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                <MessageSquare size={14} />
                <span>Ask Scholar Mentor</span>
              </button>

              {nextAction.action === "COMPLETE_MASTERY_CHECK" && (
                <button
                  onClick={() => {
                    setIsWhyModalOpen(false);
                    setIsMasteryModalOpen(true);
                  }}
                  className="btn-primary"
                  style={{ fontSize: "0.85rem" }}
                >
                  Start Mastery Check
                </button>
              )}
              {nextAction.action === "COLLECT_MORE_EVIDENCE" && (
                <button
                  onClick={() => {
                    setIsWhyModalOpen(false);
                    setActiveTab("practice");
                  }}
                  className="btn-primary"
                  style={{ fontSize: "0.85rem" }}
                >
                  Go to Practice Problems
                </button>
              )}
              <button
                onClick={() => setIsWhyModalOpen(false)}
                className="btn-secondary"
                style={{ fontSize: "0.85rem" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Module Details Spinner */}
      {isLoadingNodeDetails && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 size={36} className="animate-spin" color="#818cf8" />
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: CLICKABLE ROADMAP MODULE DETAILS (Item 7)            */}
      {/* ============================================================ */}
      {selectedNodeDetails && (
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
              <div>
                <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#818cf8" }}>
                  MODULE #{selectedNodeDetails.sequence}
                </span>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: "0.1rem" }}>
                  {selectedNodeDetails.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedNodeDetails(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Topic: <strong>{selectedNodeDetails.topic}</strong>
              </span>
              <span>•</span>
              <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Est: <strong>{selectedNodeDetails.estimated_minutes} mins</strong>
              </span>
              <span>•</span>
              <span className={`badge ${selectedNodeDetails.status === "COMPLETED" ? "badge-success" : selectedNodeDetails.status === "IN_PROGRESS" ? "badge-info" : "badge-neutral"}`}>
                {selectedNodeDetails.status}
              </span>
            </div>

            {/* Locked Explanation */}
            {selectedNodeDetails.is_locked && (
              <div
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#fbbf24",
                  fontSize: "0.85rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <Lock size={16} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
                <div>
                  <strong>Why is this locked?</strong>
                  <div style={{ marginTop: "0.2rem", color: "#fef3c7", fontSize: "0.82rem" }}>
                    Prerequisite incomplete: You must complete Module #{selectedNodeDetails.sequence - 1}{" "}
                    {selectedNodeDetails.prerequisite_title ? `(${selectedNodeDetails.prerequisite_title})` : ""} before advancing to this module.
                  </div>
                </div>
              </div>
            )}

            {/* What You'll Learn (Learning Objectives) */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                What You'll Master:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {(selectedNodeDetails.what_you_learn || []).map((item, idx) => (
                  <div key={idx} style={{ fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ color: "#818cf8" }}>•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Required Evidence vs Current Evidence */}
            <div
              style={{
                background: "var(--bg-secondary)",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Required Telemetry Evidence:</span>
                <strong>{selectedNodeDetails.required_evidence} Solved Problems</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", marginTop: "0.35rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Current Verified Solves:</span>
                <strong style={{ color: selectedNodeDetails.current_evidence >= selectedNodeDetails.required_evidence ? "#34d399" : "#fbbf24" }}>
                  {selectedNodeDetails.current_evidence} / {selectedNodeDetails.required_evidence}
                </strong>
              </div>
            </div>

            {/* Effective State Callout */}
            {selectedNodeDetails.effective_state && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  background:
                    selectedNodeDetails.effective_state === "COMPLETED"
                      ? "rgba(16, 185, 129, 0.1)"
                      : selectedNodeDetails.effective_state === "MASTERY_CHECK_REQUIRED"
                      ? "rgba(245, 158, 11, 0.1)"
                      : selectedNodeDetails.effective_state === "REMEDIATION"
                      ? "rgba(239, 68, 68, 0.1)"
                      : "var(--bg-secondary)",
                  border: `1px solid ${
                    selectedNodeDetails.effective_state === "COMPLETED"
                      ? "rgba(16, 185, 129, 0.25)"
                      : selectedNodeDetails.effective_state === "MASTERY_CHECK_REQUIRED"
                      ? "rgba(245, 158, 11, 0.25)"
                      : selectedNodeDetails.effective_state === "REMEDIATION"
                      ? "rgba(239, 68, 68, 0.25)"
                      : "var(--border-subtle)"
                  }`,
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                  Status: {selectedNodeDetails.effective_state.replace(/_/g, " ")}
                </div>
                <span>•</span>
                <div>{selectedNodeDetails.state_reason}</div>
              </div>
            )}

            {/* Actions inside Module Modal */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => {
                  setSelectedTopicFilter(selectedNodeDetails.topic);
                  setActiveTab("practice");
                  setSelectedNodeDetails(null);
                }}
                className="btn-secondary"
                style={{ fontSize: "0.85rem" }}
              >
                <Code2 size={14} />
                <span>Practice Topic Problems</span>
              </button>

              {selectedNodeDetails.effective_state === "MASTERY_CHECK_REQUIRED" && (
                <button
                  onClick={() => {
                    setSelectedTopicFilter(selectedNodeDetails.topic);
                    setSelectedNodeDetails(null);
                    setIsMasteryModalOpen(true);
                  }}
                  className="btn-primary"
                  style={{ fontSize: "0.85rem", background: "#f59e0b", borderColor: "#d97706" }}
                >
                  <ShieldAlert size={14} />
                  <span>Start Mastery Check</span>
                </button>
              )}

              {selectedNodeDetails.can_complete && (
                <button
                  onClick={() => handleVerifyComplete(selectedNodeDetails.id)}
                  disabled={isCompletingNodeId === selectedNodeDetails.id}
                  className="btn-primary"
                  style={{ fontSize: "0.85rem" }}
                >
                  {isCompletingNodeId === selectedNodeDetails.id ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify & Complete Module</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: EVIDENCE VERIFICATION FEEDBACK MODAL (Item 8)       */}
      {/* ============================================================ */}
      {completionFeedback && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
            padding: "1.5rem",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "var(--bg-card)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              padding: "1.75rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#fbbf24", marginBottom: "0.75rem" }}>
              <AlertTriangle size={20} />
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Evidence Requirement Not Met</h3>
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "1.25rem" }}>
              {completionFeedback.message}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              {completionFeedback.action === "PRACTICE" && (
                <button
                  onClick={() => {
                    setCompletionFeedback(null);
                    setActiveTab("practice");
                  }}
                  className="btn-primary"
                  style={{ fontSize: "0.85rem" }}
                >
                  Go to Practice Problems
                </button>
              )}
              {completionFeedback.action === "COMPLETE_MASTERY_CHECK" && (
                <button
                  onClick={() => {
                    setCompletionFeedback(null);
                    setIsMasteryModalOpen(true);
                  }}
                  className="btn-primary"
                  style={{ fontSize: "0.85rem" }}
                >
                  Start Mastery Check
                </button>
              )}
              <button
                onClick={() => setCompletionFeedback(null)}
                className="btn-secondary"
                style={{ fontSize: "0.85rem" }}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: PROJECT BLUEPRINT & PREREQUISITES (Item 25 & 26)     */}
      {/* ============================================================ */}
      {selectedProject && (
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
              maxWidth: "600px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              padding: "2rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FolderGit2 size={22} color="#818cf8" />
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{selectedProject.title}</h2>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Tier: <strong>{selectedProject.difficulty}</strong>
            </div>

            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "1.25rem" }}>
              {selectedProject.description}
            </p>

            {/* Architecture Tech Stack */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "0.4rem" }}>
                Architectural Deliverables & Tech Stack:
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {selectedProject.techStack.map((tech) => (
                  <span key={tech} className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Live Roadmap Competency Alignment */}
            <div
              style={{
                background: "var(--bg-secondary)",
                padding: "1rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Curriculum Competency Prerequisites:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {roadmapNodes
                  .filter((n) => selectedProject.prereqModuleSequences.includes(n.sequence))
                  .map((n) => {
                    const isDone = n.status === "COMPLETED";
                    return (
                      <div key={n.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {isDone ? <CheckCircle2 size={14} color="#34d399" /> : <Clock size={14} color="#f59e0b" />}
                          <span style={{ color: isDone ? "#e2e8f0" : "var(--text-muted)" }}>
                            Module #{n.sequence}: {n.title}
                          </span>
                        </div>
                        <span className={`badge ${isDone ? "badge-success" : "badge-neutral"}`} style={{ fontSize: "0.7rem" }}>
                          {isDone ? "Completed" : "Incomplete"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedProject(null)}
                className="btn-secondary"
                style={{ fontSize: "0.85rem" }}
              >
                Close Blueprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 6: INTERACTIVE MASTERY FLOW MODAL                      */}
      {/* ============================================================ */}
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
