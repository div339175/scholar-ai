import React from "react";
import { ScholarNextAction } from "../types/scholar";
import { Compass, HelpCircle, ArrowRight, BookOpen, Award } from "lucide-react";

interface Props {
  nextAction: ScholarNextAction;
  onAskWhy: () => void;
  onExplainTopic: (topic: string) => void;
  isActionLoading: boolean;
  onStartMasteryCheck?: () => void;
}

export const CurrentActionBanner: React.FC<Props> = ({
  nextAction,
  onAskWhy,
  onExplainTopic,
  isActionLoading,
  onStartMasteryCheck,
}) => {
  const isRequired = nextAction.action !== "CONTINUE_LEARNING";

  return (
    <div className="action-banner">
      <div className="action-banner-top">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div className="action-tag">
            <Compass size={16} />
            <span>Scholar Next Action Policy</span>
          </div>
          {isRequired ? (
            <span className="badge badge-critical" style={{ fontSize: "0.75rem" }}>
              Action Required
            </span>
          ) : (
            <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
              Progression Unblocked
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {nextAction.action === "COMPLETE_MASTERY_CHECK" && onStartMasteryCheck && (
            <button
              onClick={onStartMasteryCheck}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem" }}
            >
              <Award size={14} />
              <span>Start Mastery Check</span>
            </button>
          )}
          <button
            onClick={onAskWhy}
            disabled={isActionLoading}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem" }}
          >
            <HelpCircle size={14} />
            <span>Why this action?</span>
          </button>
          {nextAction.target_topic && (
            <button
              onClick={() => onExplainTopic(nextAction.target_topic!)}
              disabled={isActionLoading}
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem" }}
            >
              <BookOpen size={14} />
              <span>Explain {nextAction.target_topic}</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "0.85rem", flexWrap: "wrap" }}>
        <h2 className="action-name">{nextAction.action}</h2>
        {nextAction.target_topic && (
          <span className="action-topic">
            <span>Target Topic:</span>
            <strong>{nextAction.target_topic}</strong>
          </span>
        )}
      </div>

      <p className="action-reason">{nextAction.reason}</p>

      {isRequired && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "#fca5a5", marginTop: "0.25rem" }}>
          <ArrowRight size={14} />
          <span>This verification check must be completed before normal roadmap progression can resume.</span>
        </div>
      )}
    </div>
  );
};
