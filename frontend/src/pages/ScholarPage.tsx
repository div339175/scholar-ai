import React, { useState, useEffect, useCallback } from "react";
import { scholarApi, ApiError } from "../api/scholarApi";
import {
  ScholarStudentState,
  ScholarNextAction,
  StudentProfile,
  ScholarKnowledgeRetrieval,
} from "../types/scholar";
import { ScholarStateCard } from "../components/ScholarStateCard";
import { CurrentActionBanner } from "../components/CurrentActionBanner";
import { GroundedKnowledgePanel } from "../components/GroundedKnowledgePanel";
import { ReadinessRoadmapContext } from "../components/ReadinessRoadmapContext";
import { ScholarChatPanel, ChatMessage } from "../components/ScholarChatPanel";
import { MasteryFlowModal } from "../components/MasteryFlowModal";
import { AlertCircle, UserCheck, Flame } from "lucide-react";

interface Props {
  studentId: string;
}

export const ScholarPage: React.FC<Props> = ({ studentId }) => {
  const [state, setState] = useState<ScholarStudentState | null>(null);
  const [nextAction, setNextAction] = useState<ScholarNextAction | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [knowledge, setKnowledge] = useState<ScholarKnowledgeRetrieval[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isMasteryModalOpen, setIsMasteryModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  const loadStudentData = useCallback(async () => {
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

      // If action has target topic, fetch topic knowledge from backend
      if (actionRes.target_topic) {
        try {
          const topicKnowledge = await scholarApi.getTopicKnowledge(studentId, actionRes.target_topic);
          setKnowledge(topicKnowledge || []);
        } catch {
          setKnowledge([]);
        }
      } else {
        setKnowledge([]);
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
    loadStudentData();
  }, [loadStudentData]);

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

      // If response includes knowledge items, update knowledge panel
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
    handleSendMessage(`Explain ${topic}`);
  };

  // Loading State
  if (isLoading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <div className="spinner" style={{ width: "2rem", height: "2rem", borderWidth: "3px" }} />
        <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Loading Scholar verified learning state for {studentId}...
        </div>
      </div>
    );
  }

  // Error State (e.g. 404 Student Not Found or API failure)
  if (error) {
    return (
      <div className="error-banner" style={{ margin: "2rem 0" }}>
        <AlertCircle size={22} />
        <div>
          <div style={{ fontWeight: 600 }}>
            {error.status === 404 ? "Student Profile Not Found" : "Scholar API Unavailable"}
          </div>
          <div style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>
            {error.status === 404
              ? `Student with ID '${studentId}' was not found in the database. Please verify the ID or choose a demo archetype.`
              : error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Student Profile Overview Header */}
      {profile && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <UserCheck size={20} color="#818cf8" />
              <span>{profile.name}</span>
              <span className="badge badge-neutral" style={{ textTransform: "none", fontSize: "0.75rem" }}>
                Goal: {profile.career_goal}
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Weekly Commitment: {profile.weekly_hours} hrs/week
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#fbbf24", fontSize: "0.9rem", fontWeight: 600 }}>
              <Flame size={16} />
              <span>{profile.current_streak} Day Streak</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Roadmap: <strong style={{ color: "#f9fafb" }}>{profile.roadmap_completion.toFixed(1)}% Completed</strong>
            </div>
          </div>
        </div>
      )}

      {/* A. Scholar State Summary */}
      {state && <ScholarStateCard state={state} />}

      {/* B. Current Action & C. Why this action */}
      {nextAction && (
        <CurrentActionBanner
          nextAction={nextAction}
          onAskWhy={handleAskWhy}
          onExplainTopic={handleExplainTopic}
          isActionLoading={isChatLoading}
          onStartMasteryCheck={() => setIsMasteryModalOpen(true)}
        />
      )}

      {/* Main Grid: Grounded Knowledge + Conversational Interface */}
      <div className="grid-2">
        {/* D. Grounded Knowledge Panel */}
        <GroundedKnowledgePanel
          knowledge={knowledge}
          targetTopic={nextAction?.target_topic || null}
        />

        {/* E. Conversational Interface */}
        <ScholarChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isChatLoading}
          targetTopic={nextAction?.target_topic || null}
        />
      </div>

      {/* F. Readiness / Roadmap Context */}
      {state && (
        <ReadinessRoadmapContext
          capability={state.capability}
          roadmap={state.roadmap}
        />
      )}

      {/* Mastery Verification Flow Modal */}
      {isMasteryModalOpen && nextAction?.target_topic && (
        <MasteryFlowModal
          studentId={studentId}
          topic={nextAction.target_topic}
          onClose={() => setIsMasteryModalOpen(false)}
          onMasteryCompleted={() => {
            loadStudentData();
          }}
        />
      )}
    </div>
  );
};
