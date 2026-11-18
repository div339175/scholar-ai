import React, { useState } from "react";
import {
  BrainCircuit,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  X,
  User,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (studentId: string) => void;
  onSelectDemoStudent: (studentId: string) => void;
  onStartOnboarding?: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  onSelectDemoStudent,
  onStartOnboarding,
}) => {
  const [customStudentId, setCustomStudentId] = useState<string>("");
  const storedStudentId = localStorage.getItem("stepcode_active_student_id");

  if (!isOpen) return null;

  const handleResumeStored = () => {
    if (storedStudentId) {
      if (onSuccess) onSuccess(storedStudentId);
      else onSelectDemoStudent(storedStudentId);
      onClose();
    }
  };

  const handleLoadCustomId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStudentId.trim()) return;
    const targetId = customStudentId.trim();
    if (onSuccess) onSuccess(targetId);
    else onSelectDemoStudent(targetId);
    onClose();
  };

  const handleCreateNew = () => {
    onClose();
    if (onStartOnboarding) {
      onStartOnboarding();
    } else if (onSuccess) {
      onSuccess("");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          padding: "2rem",
          position: "relative",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1.25rem",
            right: "1.25rem",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(99, 102, 241, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#818cf8",
              margin: "0 auto 0.75rem",
            }}
          >
            <BrainCircuit size={24} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700 }}>
            Scholar AI Session Switcher
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Real SQLite student state & benchmark profiles
          </p>
        </div>

        {/* Prototype architecture notice */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            padding: "0.65rem 0.85rem",
            background: "rgba(30, 58, 95, 0.35)",
            border: "1px solid rgba(37, 99, 235, 0.4)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.78rem",
            color: "#93c5fd",
            marginBottom: "1.25rem",
            lineHeight: 1.4,
          }}
        >
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
          <span>
            <strong>Deterministic State Persistence:</strong> All telemetry, false progress diagnostics, roadmap adaptations, and mastery records are backed by local SQLite.
          </span>
        </div>

        {/* Option 1: Resume Active Stored Session */}
        {storedStudentId && (
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "#818cf8", fontWeight: 600, textTransform: "uppercase" }}>
                Active Stored Session
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#f9fafb" }}>
                {storedStudentId}
              </div>
            </div>
            <button
              onClick={handleResumeStored}
              className="btn-primary"
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
            >
              <RotateCcw size={13} />
              <span>Resume</span>
            </button>
          </div>
        )}

        {/* Option 2: Load any Student by ID */}
        <form onSubmit={handleLoadCustomId} style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
            Load student profile by ID
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <User size={16} color="#6b7280" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={customStudentId}
                onChange={(e) => setCustomStudentId(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.4rem", fontSize: "0.85rem" }}
                placeholder="e.g. student_alex, student_priya..."
              />
            </div>
            <button
              type="submit"
              disabled={!customStudentId.trim()}
              className="btn-secondary"
              style={{ fontSize: "0.82rem", padding: "0.5rem 0.9rem" }}
            >
              Load
            </button>
          </div>
        </form>

        {/* Option 3: Quick Evaluator Benchmark Archetypes */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
            Benchmark Evaluation Archetypes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <button
              onClick={() => {
                onSelectDemoStudent("student_alex");
                onClose();
              }}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.85rem",
                fontSize: "0.82rem",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <UserCheck size={14} color="#f87171" />
                <strong>Alex Sharma</strong>
              </div>
              <span className="badge badge-danger" style={{ fontSize: "0.7rem" }}>
                False Progress (FPI: 85%)
              </span>
            </button>

            <button
              onClick={() => {
                onSelectDemoStudent("student_priya");
                onClose();
              }}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.85rem",
                fontSize: "0.82rem",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <UserCheck size={14} color="#34d399" />
                <strong>Priya Mehta</strong>
              </div>
              <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                Genuine Mastery (Autonomous)
              </span>
            </button>

            <button
              onClick={() => {
                onSelectDemoStudent("student_marcus");
                onClose();
              }}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.85rem",
                fontSize: "0.82rem",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <UserCheck size={14} color="#38bdf8" />
                <strong>Marcus Vance</strong>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                Sparse Telemetry (Baseline)
              </span>
            </button>
          </div>
        </div>

        {/* Option 4: Fresh Student Onboarding */}
        <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
          <button
            onClick={handleCreateNew}
            className="btn-primary"
            style={{
              width: "100%",
              padding: "0.7rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontSize: "0.9rem",
            }}
          >
            <Sparkles size={16} />
            <span>Create New Student Profile (Onboarding)</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
