import React from "react";
import {
  BrainCircuit,
  Compass,
  Award,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
} from "lucide-react";

interface Props {
  onGetStarted: () => void;
  onExploreDemo: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<Props> = ({
  onGetStarted,
  onExploreDemo,
  onLogin,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Navigation Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.2rem 2.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(11, 15, 25, 0.9)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <BrainCircuit size={26} color="#818cf8" />
          <span style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            StepCode
          </span>
          <span className="badge badge-info" style={{ fontSize: "0.72rem", marginLeft: "0.4rem" }}>
            SCHOLAR AI
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={onExploreDemo}
            className="btn-secondary"
            style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Play size={14} color="#818cf8" />
            <span>Evaluator Demo Mode</span>
          </button>
          <button
            onClick={onLogin}
            className="btn-secondary"
            style={{ fontSize: "0.85rem" }}
          >
            Sign In
          </button>
          <button
            onClick={onGetStarted}
            className="btn-primary"
            style={{ fontSize: "0.85rem", padding: "0.55rem 1.1rem" }}
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: "4.5rem 2rem 3rem",
          maxWidth: "1050px",
          margin: "0 auto",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.35rem 0.85rem",
            borderRadius: "9999px",
            background: "rgba(99, 102, 241, 0.12)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            fontSize: "0.82rem",
            color: "#a5b4fc",
            fontWeight: 500,
          }}
        >
          <ShieldCheck size={15} />
          <span>Evidence-Based Learning & Competence Gating</span>
        </div>

        <h1
          style={{
            fontSize: "3.2rem",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            maxWidth: "850px",
            color: "#f9fafb",
          }}
        >
          Learn beyond completion.
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #818cf8 0%, #c084fc 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Build verified competence.
          </span>
        </h1>

        <p
          style={{
            fontSize: "1.15rem",
            color: "var(--text-secondary)",
            maxWidth: "680px",
            lineHeight: 1.6,
          }}
        >
          Scholar AI tracks how you solve problems, identifies where platform activity does not
          reflect independent understanding, verifies conceptual mastery, and adapts your learning roadmap.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginTop: "1rem" }}>
          <button
            onClick={onGetStarted}
            className="btn-primary"
            style={{
              fontSize: "1rem",
              padding: "0.85rem 1.75rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
            }}
          >
            <span>Get Started</span>
            <ArrowRight size={17} />
          </button>
          <button
            onClick={onExploreDemo}
            className="btn-secondary"
            style={{
              fontSize: "1rem",
              padding: "0.85rem 1.75rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Compass size={17} />
            <span>See How It Works</span>
          </button>
        </div>
      </section>

      {/* Core Design Thesis Comparison Section */}
      <section
        style={{
          padding: "3rem 2rem",
          maxWidth: "960px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          className="card"
          style={{
            background: "linear-gradient(180deg, rgba(24, 34, 52, 0.9) 0%, rgba(17, 24, 39, 0.95) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            padding: "2rem",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <span
              style={{
                fontSize: "0.78rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#818cf8",
                fontWeight: 700,
              }}
            >
              The Core Product Thesis
            </span>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.35rem" }}>
              Why traditional activity metrics fail in placement interviews
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* Left: Activity ≠ Competence */}
            <div
              style={{
                background: "rgba(11, 15, 25, 0.6)",
                padding: "1.5rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f87171", marginBottom: "0.75rem" }}>
                <AlertTriangle size={18} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Activity ≠ Competence</h3>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                Solving 40 problems by clicking hints or spamming retry submissions gives a false impression of mastery.
                High activity volume often masks an inability to solve problems autonomously on a whiteboard.
              </p>
            </div>

            {/* Right: Completion ≠ Mastery */}
            <div
              style={{
                background: "rgba(11, 15, 25, 0.6)",
                padding: "1.5rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#34d399", marginBottom: "0.75rem" }}>
                <CheckCircle2 size={18} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Completion ≠ Mastery</h3>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                Completing 70% of a syllabus does not guarantee interview readiness. Scholar AI verifies your
                conceptual understanding through server-evaluated transfer checks before unlocking advanced topics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Product Capabilities */}
      <section
        style={{
          padding: "2rem 2rem 4rem",
          maxWidth: "1050px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            How Scholar AI Mentors Your Learning
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.35rem" }}>
            Four evidence-grounded capabilities working together in real time
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {/* Capability 1 */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(239, 68, 68, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f87171",
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Detect Learning Gaps</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Continuously monitors your coding telemetry—like hint requests and submission counts—to identify where you struggle independently.
            </p>
          </div>

          {/* Capability 2 */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#34d399",
              }}
            >
              <Award size={20} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Verify Mastery</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Requires server-evaluated conceptual transfer diagnostics. Correct answers are kept secure so genuine competence is proven.
            </p>
          </div>

          {/* Capability 3 */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(139, 92, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#a78bfa",
              }}
            >
              <Layers size={20} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Adapt Your Roadmap</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Pauses forward progression when you need remediation and unlocks new modules only when verified capability is demonstrated.
            </p>
          </div>

          {/* Capability 4 */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(99, 102, 241, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#818cf8",
              }}
            >
              <Compass size={20} />
            </div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>Actionable Guidance</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Provides a single, unambiguous next action every time you log in, backed by transparent reasons from your actual problem attempts.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: "auto",
          padding: "2rem",
          borderTop: "1px solid var(--border-subtle)",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
        }}
      >
        <p>StepCode Scholar AI Prototype — Evidence-Grounded Competence Mentor</p>
        <p style={{ marginTop: "0.35rem", fontSize: "0.8rem" }}>
          Built with deterministic Python FastAPI services, React 19, TypeScript, and SQLite.
        </p>
      </footer>
    </div>
  );
};
