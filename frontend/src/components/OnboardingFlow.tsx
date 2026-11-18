import React, { useState } from "react";
import { Compass, CheckCircle2, ArrowRight, ArrowLeft, Target, Clock, Zap, User, AlertCircle, Loader2 } from "lucide-react";
import { scholarApi, ApiError } from "../api/scholarApi";
import { StudentProfile } from "../types/scholar";

export interface OnboardingData {
  name: string;
  goal: string;
  experienceLevel: string;
  weeklyHours: string;
}

interface Props {
  onComplete: (student: StudentProfile, data: OnboardingData) => void;
  onCancel: () => void;
}

export const OnboardingFlow: React.FC<Props> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>("");
  const [goal, setGoal] = useState<string>("Full-Stack Developer");
  const [experienceLevel, setExperienceLevel] = useState<string>("Intermediate");
  const [weeklyHours, setWeeklyHours] = useState<string>("10 hours/week");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    { id: "5 hours/week", label: "5 hours / week", hours: 5.0, desc: "Light, steady learning pace alongside coursework or job." },
    { id: "10 hours/week", label: "10 hours / week", hours: 10.0, desc: "Recommended pace: 1–2 hours daily for continuous momentum." },
    { id: "15 hours/week", label: "15 hours / week", hours: 15.0, desc: "Accelerated track for upcoming placement season deadlines." },
    { id: "20+ hours/week", label: "20+ hours / week", hours: 20.0, desc: "Intensive immersive preparation and rapid roadmap completion." },
  ];

  const handleFinish = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter your name to personalize your student profile.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const numericHours = parseFloat(weeklyHours) || 10.0;

    try {
      const createdStudent = await scholarApi.createStudent({
        name: trimmedName,
        career_goal: goal,
        weekly_hours: numericHours,
        baseline_level: experienceLevel,
      });

      onComplete(createdStudent, {
        name: trimmedName,
        goal,
        experienceLevel,
        weeklyHours,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to create student in database. Please check backend connection.");
      }
      setIsSubmitting(false);
    }
  };

  const handleStepNext = () => {
    if (step === 1 && !name.trim()) {
      setErrorMessage("Please enter your name to proceed.");
      return;
    }
    setErrorMessage(null);
    setStep(step + 1);
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
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

        {/* Error notification if any */}
        {errorMessage && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-sm)",
              color: "#fca5a5",
              fontSize: "0.88rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Student Name */}
        {step === 1 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <User size={20} color="#818cf8" />
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>What is your name?</h2>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Scholar AI will create a distinct, persistent profile in the SQLite database with your own personalized roadmap.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    handleStepNext();
                  }
                }}
                placeholder="e.g., Divakar Maurya"
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  color: "#f9fafb",
                  fontSize: "1rem",
                  outline: "none",
                }}
              />
            </div>
          </div>
        )}

        {/* Step 2: Goal */}
        {step === 2 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Target size={20} color="#818cf8" />
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>What is your primary career goal?</h2>
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

        {/* Step 3: Experience */}
        {step === 3 && (
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

        {/* Step 4: Commitment & Launch Summary */}
        {step === 4 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Clock size={20} color="#818cf8" />
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Weekly commitment & verification</h2>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Scholar AI balances your weekly practice pace and monitors true conceptual retention.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
              {commitmentLevels.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setWeeklyHours(c.id)}
                  style={{
                    padding: "0.8rem 1rem",
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
                    <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{c.label}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>{c.desc}</div>
                  </div>
                  {weeklyHours === c.id && <CheckCircle2 size={18} color="#818cf8" />}
                </div>
              ))}
            </div>

            <div
              style={{
                background: "rgba(11, 15, 25, 0.7)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                lineHeight: 1.45,
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <CheckCircle2 size={15} color="#818cf8" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                <span>
                  <strong>Database-Backed Student:</strong> Creating a persistent record for <strong>{name || "Student"}</strong> in SQLite with clean 0% initial roadmap progress.
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <CheckCircle2 size={15} color="#818cf8" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
                <span>
                  <strong>Zero Benchmark Contamination:</strong> Demo profiles (Alex, Priya, Marcus) remain strictly isolated in Evaluator Demo Mode.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem" }}>
          {step > 1 ? (
            <button
              onClick={() => {
                setErrorMessage(null);
                setStep(step - 1);
              }}
              className="btn-secondary"
              disabled={isSubmitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.88rem" }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="btn-secondary"
              disabled={isSubmitting}
              style={{ fontSize: "0.88rem" }}
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={handleStepNext}
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
              disabled={isSubmitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.88rem", padding: "0.65rem 1.25rem" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Registering in SQLite...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Launch Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
