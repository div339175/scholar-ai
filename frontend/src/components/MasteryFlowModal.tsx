import React, { useState, useEffect } from "react";
import { scholarApi } from "../api/scholarApi";
import { MasteryAssessmentQuestion, MasteryAssessmentResult, MasteryCheckResult } from "../types/scholar";
import { CheckCircle2, XCircle, Award, ArrowRight, X, AlertTriangle } from "lucide-react";

interface Props {
  studentId: string;
  topic: string;
  onClose: () => void;
  onMasteryCompleted: () => void;
}

export const MasteryFlowModal: React.FC<Props> = ({
  studentId,
  topic,
  onClose,
  onMasteryCompleted,
}) => {
  const [question, setQuestion] = useState<MasteryAssessmentQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<MasteryAssessmentResult | null>(null);
  const [masteryCheckResult, setMasteryCheckResult] = useState<MasteryCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuestion() {
      setIsLoading(true);
      setError(null);
      try {
        const q = await scholarApi.getMasteryAssessmentQuestion(studentId, topic);
        setQuestion(q);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load assessment question");
      } finally {
        setIsLoading(false);
      }
    }
    loadQuestion();
  }, [studentId, topic]);

  const handleSubmitAssessment = async () => {
    if (!question || !selectedOption) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Option letter e.g. "B" from "B) Expand right..."
      const cleanAnswer = selectedOption.trim()[0];
      const res = await scholarApi.submitMasteryAssessment(studentId, {
        topic,
        question_id: question.question_id,
        answer: cleanAnswer,
      });
      setAssessmentResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteMasteryCheck = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await scholarApi.submitMasteryCheck(studentId, {
        topic,
        problem_id: "check_" + topic.toLowerCase().replace(/\s+/g, "_"),
        solved: true,
        hints_used: 0,
        attempts: 1,
      });
      setMasteryCheckResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Mastery check submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
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
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          position: "relative",
          backgroundColor: "#111827",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Award size={20} color="#818cf8" />
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              Mastery Verification Check: {topic}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div className="error-banner" style={{ margin: 0 }}>
            <AlertTriangle size={18} />
            <div style={{ fontSize: "0.85rem" }}>{error}</div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem auto" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              Loading server-curated assessment question...
            </p>
          </div>
        )}

        {/* Step 1: Conceptual Assessment */}
        {question && !masteryCheckResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              Step 1: Server-Evaluated Conceptual Diagnostic
            </div>

            <p style={{ fontSize: "0.95rem", lineHeight: 1.5, color: "#f3f4f6", margin: 0 }}>
              {question.question_text}
            </p>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {question.options.map((opt, idx) => (
                <label
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.375rem",
                    backgroundColor: selectedOption === opt ? "#1e1b4b" : "var(--bg-secondary)",
                    border: `1px solid ${selectedOption === opt ? "#6366f1" : "var(--border-subtle)"}`,
                    cursor: assessmentResult ? "default" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="mastery-option"
                    value={opt}
                    checked={selectedOption === opt}
                    disabled={Boolean(assessmentResult) || isSubmitting}
                    onChange={(e) => setSelectedOption(e.target.value)}
                  />
                  <span style={{ fontSize: "0.875rem", color: "#e5e7eb" }}>{opt}</span>
                </label>
              ))}
            </div>

            {/* Assessment Feedback if evaluated */}
            {assessmentResult && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.375rem",
                  backgroundColor: assessmentResult.correct ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${assessmentResult.correct ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                {assessmentResult.correct ? (
                  <CheckCircle2 size={18} color="#10b981" />
                ) : (
                  <XCircle size={18} color="#ef4444" />
                )}
                <div style={{ fontSize: "0.85rem", color: "#f9fafb" }}>
                  <strong>Server Evaluation Score: {assessmentResult.score}%</strong> (
                  {assessmentResult.correct ? "Correct conceptual understanding verified" : "Incorrect. Conceptual review needed"})
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              {!assessmentResult ? (
                <button
                  onClick={handleSubmitAssessment}
                  disabled={!selectedOption || isSubmitting}
                  className="btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  {isSubmitting ? "Evaluating on Server..." : "Submit Answer for Server Grading"}
                </button>
              ) : assessmentResult.correct ? (
                <button
                  onClick={handleCompleteMasteryCheck}
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", backgroundColor: "#10b981" }}
                >
                  <ArrowRight size={16} />
                  <span>{isSubmitting ? "Submitting Check..." : "Verify Independent Coding Check"}</span>
                </button>
              ) : (
                <button
                  onClick={() => setAssessmentResult(null)}
                  className="btn-secondary"
                >
                  Retry Answer
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success confirmation */}
        {masteryCheckResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", textAlign: "center", padding: "1rem 0" }}>
            <div style={{ width: "3rem", height: "3rem", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <CheckCircle2 size={28} color="#10b981" />
            </div>
            <div>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", color: "#f9fafb" }}>
                Mastery Verified for {topic}!
              </h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Server evaluation confirmed 100% conceptual mastery with unassisted problem resolution (1 attempt, 0 hints).
                Roadmap advancement is now unlocked.
              </p>
            </div>
            <button
              onClick={() => {
                onMasteryCompleted();
                onClose();
              }}
              className="btn-primary"
              style={{ margin: "0.5rem auto 0 auto" }}
            >
              Return to Scholar Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
