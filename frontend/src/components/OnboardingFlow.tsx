import React, { useState } from "react";
import { Compass, CheckCircle2, ArrowRight, ArrowLeft, Target, Clock, Zap, BookOpen } from "lucide-react";

export interface OnboardingData {
  goal: string;
  experienceLevel: string;
  weeklyHours: string;
}

interface Props {
  onComplete: (data: OnboardingData) => void;
  onCancel: () => void;
}

export const OnboardingFlow: React.FC<Props> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<number>(1);
  const [goal, setGoal] = useState<string>("Full-Stack Developer");
  const [experienceLevel, setExperienceLevel] = useState<string>("Intermediate");
  const [weeklyHours, setWeeklyHours] = useState<string>("10 hours/week");

  const goals = [
    { id: "Full-Stack Developer", label: "Full-Stack Developer", desc: "Build modern web services, frontend dashboards, and robust APIs." },
    { id: "AI/ML Engineer", label: "AI/ML Engineer", desc: "Master algorithmic data pipelines, modeling, and deep learning architectures." },
    { id: "Coding Interview Preparation", label: "Coding Interview Preparation", desc: "Master Data Structures & Algorithms for technical placement seasons." },
    { id: "Project Builder", label: "Project Builder", desc: "Focus on hands-on full-stack projects, architecture, and microservices." },
    { id: "Other", label: "Other Technical Goal", desc: "Customized algorithmic foundations and computer science breadth." },
  ];

  const experienceLevels = [
    { id: "Beginner", label: "Beginner", desc: "Comfortable with syntax, learning basic data structures and loops." },
    { id: "Intermediate", label: "Intermediate", desc: "Familiar with arrays, hash maps, two pointers, and basic recursion." },
    { id: "Advanced", label: "Advanced", desc: "Practicing dynamic programming, graph algorithms, and system design." },
  ];

  const commitmentLevels = [
    { id: "5 hours/week", label: "5 hours / week", desc: "Light, steady learning pace alongside coursework or job." },
    { id: "10 hours/week", label: "10 hours / week", desc: "Recommended pace: 1–2 hours daily for continuous momentum." },
    { id: "15 hours/week", label: "15 hours / week", desc: "Accelerated track for upcoming placement season deadlines." },
    { id: "20+ hours/week", label: "20+ hours / week", desc: "Intensive immersive preparation and rapid roadmap completion." },
  ];

  const handleFinish = () => {
    onComplete({
      goal,
      experienceLevel,
      weeklyHours,
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        background: "var(--bg-primary)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "620px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          padding: "2.5rem 2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Progress indicators */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Compass size={20} color="#818cf8" />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#818cf8" }}>
              Scholar AI Onboarding
            </span>
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Step {step} of 4
          </span>
        </div>

        {/* Step bar */}
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "2rem" }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                background: s <= step ? "#6366f1" : "var(--border-subtle)",
                transition: "background 0.2s ease",
              }}
            />
          ))}
        </div>

        {/* Step 1: Goal */}
        {step === 1 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Target size={20} color="#818cf8" />
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>What is your primary goal?</h2>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Scholar AI will calibrate roadmap milestones and competence thresholds to match your trajectory.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {goals.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  style={{
                    padding: "0.9rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${goal === g.id ? "#6366f1" : "var(--border-subtle)"}`,
                    background: goal === g.id ? "rgba(99, 102, 241, 0.12)" : "var(--bg-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: goal === g.id ? "#f9fafb" : "var(--text-secondary)" }}>
                      {g.label}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      {g.desc}
                    </div>
                  </div>
                  {goal === g.id && <CheckCircle2 size={18} color="#818cf8" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Zap size={20} color="#818cf8" />
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>What is your current experience level?</h2>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              This helps establish your initial diagnostic baseline before telemetry evidence is recorded.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {experienceLevels.map((lvl) => (
                <div
                  key={lvl.id}
                  onClick={() => setExperienceLevel(lvl.id)}
                  style={{
                    padding: "1rem",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${experienceLevel === lvl.id ? "#6366f1" : "var(--border-subtle)"}`,
                    background: experienceLevel === lvl.id ? "rgba(99, 102, 241, 0.12)" : "var(--bg-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{lvl.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{lvl.desc}</div>
                  </div>
                  {experienceLevel === lvl.id && <CheckCircle2 size={18} color="#818cf8" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Commitment */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Clock size={20} color="#818cf8" />
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>How much time can you commit weekly?</h2>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Scholar AI uses your commitment to balance practice sprint lengths and prevent burnout.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {commitmentLevels.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setWeeklyHours(c.id)}
                  style={{
                    padding: "1rem",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${weeklyHours === c.id ? "#6366f1" : "var(--border-subtle)"}`,
                    background: weeklyHours === c.id ? "rgba(99, 102, 241, 0.12)" : "var(--bg-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{c.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{c.desc}</div>
                  </div>
                  {weeklyHours === c.id && <CheckCircle2 size={18} color="#818cf8" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Baseline Assessment Explanation */}
        {step === 4 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <BookOpen size={20} color="#818cf8" />
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Let's establish your starting point</h2>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Scholar AI continuously verifies your learning from actual problem submissions rather than activity volume alone.
            </p>

            <div
              style={{
                background: "rgba(11, 15, 25, 0.7)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <CheckCircle2 size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                <span>
                  <strong>Evidence-Driven Personalization:</strong> Your initial roadmap will feature foundational modules (Arrays, Sliding Window) to evaluate your independent solve patterns.
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <CheckCircle2 size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                <span>
                  <strong>Active Competence Mentoring:</strong> If you use hints frequently or struggle with retries, Scholar AI will pause advancement and guide you through focused micro-sprints.
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <CheckCircle2 size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                <span>
                  <strong>Prototype Demonstration Notice:</strong> Onboarding preferences are stored locally in your browser session for this prototype.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem" }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.88rem" }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="btn-secondary"
              style={{ fontSize: "0.88rem" }}
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.88rem", padding: "0.65rem 1.25rem" }}
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.88rem", padding: "0.65rem 1.25rem" }}
            >
              <span>Launch My Student Dashboard</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
