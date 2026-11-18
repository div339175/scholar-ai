import React from "react";
import { CapabilitySummary, RoadmapSummary } from "../types/scholar";
import { ShieldCheck, MapPin, Gauge } from "lucide-react";

interface Props {
  capability: CapabilitySummary;
  roadmap: RoadmapSummary;
}

export const ReadinessRoadmapContext: React.FC<Props> = ({ capability, roadmap }) => {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <Gauge size={18} color="#38bdf8" />
          <span>Verified Capability & Roadmap Context</span>
        </div>
      </div>

      <div className="grid-2">
        {/* Readiness Decomposition */}
        <div className="metric-box">
          <div className="metric-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <ShieldCheck size={14} color="#38bdf8" />
            <span>Capability Verification Breakdown</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "0.5rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Verified Score</div>
              <div className="metric-value" style={{ color: "#38bdf8" }}>
                {capability.verified_capability_score.toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Standard Baseline</div>
              <div className="metric-value" style={{ fontSize: "1.1rem", color: "var(--text-secondary)" }}>
                {capability.standard_readiness_score.toFixed(1)}%
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            <span>Mastery Coverage: {(capability.mastery_coverage * 100).toFixed(0)}%</span>
            <span>Multiplier: {capability.mastery_confidence_multiplier.toFixed(2)}x</span>
          </div>
        </div>

        {/* Roadmap Adaptation State */}
        <div className="metric-box">
          <div className="metric-label" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <MapPin size={14} color="#f472b6" />
            <span>Roadmap Adaptation Policy</span>
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className="badge badge-info" style={{ fontSize: "0.8rem" }}>
                {roadmap.action}
              </span>
              {roadmap.topic && (
                <span className="action-topic" style={{ fontSize: "0.8rem" }}>
                  {roadmap.topic}
                </span>
              )}
            </div>
            <div className="metric-sub" style={{ marginTop: "0.5rem" }}>
              Evidence Status: <strong>{roadmap.evidence_status}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
