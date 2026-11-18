import React, { useState } from "react";
import { BrainCircuit, Lock, Mail, ArrowRight, X, UserCheck, ShieldAlert } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  onSelectDemoStudent: (studentId: string) => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  onSelectDemoStudent,
}) => {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("student@stepcode.dev");
  const [password, setPassword] = useState<string>("••••••••");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess(email || "student@stepcode.dev");
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
          maxWidth: "460px",
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
            color: "var(--text-muted)",
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
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
            {isSignUp ? "Create your Scholar AI Account" : "Welcome to Scholar AI"}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Your personalized competence mentor
          </p>
        </div>

        {/* Prototype notice badge */}
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
          }}
        >
          <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
          <span>
            <strong>Prototype Demo Mode:</strong> Click below to proceed with local onboarding or quick-load benchmark evaluation profiles.
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Email address
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={16} color="#6b7280" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.4rem" }}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} color="#6b7280" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.4rem" }}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: "0.75rem",
              marginTop: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontSize: "0.95rem",
            }}
          >
            <span>{isSignUp ? "Create Account & Onboard" : "Sign In to Scholar AI"}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: "transparent", fontSize: "0.82rem", color: "#818cf8" }}
          >
            {isSignUp ? "Already have an account? Sign in" : "New to Scholar AI? Create account"}
          </button>
        </div>

        {/* Quick Demo Access for Evaluators */}
        <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", marginBottom: "0.75rem" }}>
            Quick Evaluator Profiles
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => {
                onSelectDemoStudent("student_alex");
                onClose();
              }}
              className="btn-secondary"
              style={{ flex: 1, fontSize: "0.78rem", padding: "0.5rem 0.3rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
            >
              <UserCheck size={13} color="#f87171" />
              <span>Alex (False Progress)</span>
            </button>
            <button
              onClick={() => {
                onSelectDemoStudent("student_priya");
                onClose();
              }}
              className="btn-secondary"
              style={{ flex: 1, fontSize: "0.78rem", padding: "0.5rem 0.3rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
            >
              <UserCheck size={13} color="#34d399" />
              <span>Priya (Autonomous)</span>
            </button>
            <button
              onClick={() => {
                onSelectDemoStudent("student_marcus");
                onClose();
              }}
              className="btn-secondary"
              style={{ flex: 1, fontSize: "0.78rem", padding: "0.5rem 0.3rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
            >
              <UserCheck size={13} color="#38bdf8" />
              <span>Marcus (Sparse)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
