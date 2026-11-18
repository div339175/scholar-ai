import React from "react";
import { ScholarStudentState } from "../types/scholar";
import { AlertTriangle, ShieldCheck, Activity, Navigation, Target } from "lucide-react";

interface Props {
  state: ScholarStudentState;
}

export const ScholarStateCard: React.FC<Props> = ({ state }) => {
  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toUpperCase()) {
      case "CRITICAL":
        return "badge-critical";
      case "HIGH":
      case "MEDIUM":
        return "badge-warning";
      case "LOW":
        return "badge-success";
      default:
        return "badge-neutral";
    }
  };

  const getReadinessBadgeClass = (status: string) => {
    switch (status) {
      case "VERIFIED_READY":
        return "badge-success";
      case "PARTIALLY_VERIFIED":
        return "badge-info";
      case "NOT_VERIFIED":
      case "NEEDS_INTERVENTION":
        return "badge-critical";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Activity size={18} color="#818cf8" />
          <span>Scholar Verified State Summary</span>
        </div>
        <span className="badge badge-neutral" style={{ textTransform: "none", fontFamily: "var(--font-mono)" }}>
          ID: {state.student_id}
        </span>
      </div>

      <div className="grid-3">
        {/* Metric 1: False Progress Status */}
        <div className="metric-box">
          <div className="metric-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>False Progress Diagnostic</span>
            {state.false_progress.detected ? (
              <AlertTriangle size={14} color="#f87171" />
            ) : (
              <ShieldCheck size={14} color="#34d399" />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span className={`badge ${getSeverityBadgeClass(state.false_progress.severity)}`}>
              {state.false_progress.severity} (FPI: {state.false_progress.index.toFixed(1)})
            </span>
          </div>
          <div className="metric-sub">
            {state.false_progress.detected
              ? `Signals: ${state.false_progress.triggers.join(", ")}`
              : "No false-progress triggers detected"}
          </div>
        </div>

        {/* Metric 2: Readiness Status */}
        <div className="metric-box">
          <div className="metric-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Verified Readiness Status</span>
            <Target size={14} color="#818cf8" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span className={`badge ${getReadinessBadgeClass(state.capability.readiness_status)}`}>
              {state.capability.readiness_status}
            </span>
            <span className="metric-value" style={{ fontSize: "1.1rem" }}>
              {state.capability.verified_capability_score.toFixed(1)}
            </span>
          </div>
          <div className="metric-sub">
            Standard: {state.capability.standard_readiness_score.toFixed(1)} | Multiplier: {state.capability.mastery_confidence_multiplier.toFixed(2)}x
          </div>
        </div>

        {/* Metric 3: Mastery & Roadmap State */}
        <div className="metric-box">
          <div className="metric-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Mastery & Roadmap Status</span>
            <Navigation size={14} color="#a78bfa" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span className="badge badge-info">
              {state.roadmap.action}
            </span>
            {state.roadmap.topic && (
              <span className="action-topic" style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}>
                {state.roadmap.topic}
              </span>
            )}
          </div>
          <div className="metric-sub">
            Mastery Record: {state.mastery.decision || state.mastery.status}
            {state.mastery.conceptual_score !== null && ` (${state.mastery.conceptual_score}%)`}
          </div>
        </div>
      </div>
    </div>
  );
};
