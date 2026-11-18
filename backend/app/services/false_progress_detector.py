"""
False Progress Detection Engine (FPDE)
Core Thesis: "Student activity is not the same as student competence."

This service evaluates granular learning telemetry against deterministic behavioral
heuristics to detect when high platform activity masks shallow conceptual mastery.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.problem import CodingTelemetry
from app.schemas.scholar import DiagnosticEvidence, FalseProgressDiagnosticResponse

# ---------------------------------------------------------------------------
# Configurable Weights & Thresholds
# ---------------------------------------------------------------------------
WEIGHT_LOW_INDEPENDENCE = 0.25
WEIGHT_HINT_DEPENDENCY = 0.20
WEIGHT_CONCEPT_BLINDSPOT = 0.20
WEIGHT_BRUTE_FORCE = 0.15
WEIGHT_TIME_ANOMALY = 0.10
WEIGHT_VELOCITY_DEPTH = 0.10

THRESHOLD_HINT_DEPENDENCY = 0.50
THRESHOLD_UNASSISTED_PASS = 0.40
THRESHOLD_BRUTE_FORCE_SUBMISSIONS = 5
THRESHOLD_MULTI_ATTEMPT_RATE = 0.45
THRESHOLD_TIME_ANOMALY_MULTIPLIER = 2.5
THRESHOLD_VELOCITY_ROADMAP_PCT = 60.0
THRESHOLD_VELOCITY_PASS_PCT = 0.50
THRESHOLD_CONSISTENCY_STREAK = 7
MIN_PROBLEMS_FOR_EVALUATION = 5

EXPECTED_DURATION_SECONDS = {
    "Easy": 1200,    # 20 minutes
    "Medium": 1800,  # 30 minutes
    "Hard": 2700,    # 45 minutes
}

class FalseProgressDetector:
    """
    Deterministic, explainable behavioral detection engine for False Progress.
    """

    @classmethod
    def analyze_student(cls, db: Session, student_id: str) -> FalseProgressDiagnosticResponse:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return cls._empty_response(student_id, "Student not found in system.")

        telemetry: List[CodingTelemetry] = (
            db.query(CodingTelemetry)
            .filter(CodingTelemetry.student_id == student_id)
            .order_by(CodingTelemetry.timestamp.asc())
            .all()
        )

        total_problems = len(telemetry)
        if total_problems < MIN_PROBLEMS_FOR_EVALUATION:
            return cls._empty_response(
                student_id=student_id,
                diagnosis=f"Insufficient behavioural evidence: {total_problems}/{MIN_PROBLEMS_FOR_EVALUATION} problems completed. Need at least 5 submissions for accurate diagnostic assessment.",
                recommended_action="Continue practicing problems independently to build a reliable telemetry baseline.",
            )

        trigger_codes: List[str] = []
        evidence_list: List[DiagnosticEvidence] = []
        affected_topics: List[str] = []

        # -------------------------------------------------------------------
        # Signal A: Hint Crutch (Excessive Hint Reliance)
        # -------------------------------------------------------------------
        problems_with_hints = sum(1 for e in telemetry if e.hints_requested > 0)
        hint_dependency = round(problems_with_hints / total_problems, 3)
        total_hints = sum(e.hints_requested for e in telemetry)

        if hint_dependency > THRESHOLD_HINT_DEPENDENCY:
            trigger_codes.append("FP_HINT_CRUTCH")
            evidence_list.append(
                DiagnosticEvidence(
                    trigger_code="FP_HINT_CRUTCH",
                    metric="hint_dependency_rate",
                    observed_value=hint_dependency,
                    threshold=THRESHOLD_HINT_DEPENDENCY,
                    interpretation=(
                        f"You are completing problems, but {round(hint_dependency * 100, 1)}% of recent solutions "
                        f"depend on hints ({total_hints} hints total). This suggests the current completion rate "
                        "may overstate independent mastery."
                    ),
                )
            )

        # -------------------------------------------------------------------
        # Signal B: Trial-and-Error / Brute Force Submissions
        # -------------------------------------------------------------------
        brute_force_events = [e for e in telemetry if e.submission_count >= THRESHOLD_BRUTE_FORCE_SUBMISSIONS and e.successful]
        multi_attempt_events = [e for e in telemetry if e.submission_count > 1]
        multi_attempt_rate = round(len(multi_attempt_events) / total_problems, 3)

        if len(brute_force_events) > 0 or multi_attempt_rate > THRESHOLD_MULTI_ATTEMPT_RATE:
            trigger_codes.append("FP_BRUTE_FORCE")
            evidence_list.append(
                DiagnosticEvidence(
                    trigger_code="FP_BRUTE_FORCE",
                    metric="multi_attempt_rate",
                    observed_value=multi_attempt_rate,
                    threshold=THRESHOLD_MULTI_ATTEMPT_RATE,
                    interpretation=(
                        f"{len(multi_attempt_events)} of {total_problems} problems ({round(multi_attempt_rate * 100, 1)}%) "
                        f"required repeated retry submissions before passing ({len(brute_force_events)} required >= 5 attempts). "
                        "This indicates trial-and-error debugging rather than confident algorithmic formulation."
                    ),
                )
            )

        # -------------------------------------------------------------------
        # Signal C: Low Unassisted Pass Rate (Core Independence Signal)
        # -------------------------------------------------------------------
        first_attempt_passes = sum(1 for e in telemetry if e.first_attempt_pass)
        unassisted_pass_ratio = round(first_attempt_passes / total_problems, 3)

        if unassisted_pass_ratio < THRESHOLD_UNASSISTED_PASS:
            trigger_codes.append("FP_LOW_INDEPENDENCE")
            evidence_list.append(
                DiagnosticEvidence(
                    trigger_code="FP_LOW_INDEPENDENCE",
                    metric="unassisted_pass_ratio",
                    observed_value=unassisted_pass_ratio,
                    threshold=THRESHOLD_UNASSISTED_PASS,
                    interpretation=(
                        f"Only {first_attempt_passes} of {total_problems} problems ({round(unassisted_pass_ratio * 100, 1)}%) "
                        "were solved independently on the first attempt without prior failures or hint intervention."
                    ),
                )
            )

        # -------------------------------------------------------------------
        # Signal D: Time Anomaly (Duration Anomaly + Retry Struggle)
        # -------------------------------------------------------------------
        time_anomalies = []
        for e in telemetry:
            expected = EXPECTED_DURATION_SECONDS.get(e.difficulty, 1800)
            if e.active_coding_duration_seconds > (expected * THRESHOLD_TIME_ANOMALY_MULTIPLIER) and e.submission_count > 1:
                time_anomalies.append(e)

        time_anomaly_rate = round(len(time_anomalies) / total_problems, 3)
        if len(time_anomalies) >= 2 or time_anomaly_rate > 0.10:
            trigger_codes.append("FP_TIME_ANOMALY")
            evidence_list.append(
                DiagnosticEvidence(
                    trigger_code="FP_TIME_ANOMALY",
                    metric="time_anomaly_rate",
                    observed_value=time_anomaly_rate,
                    threshold=0.10,
                    interpretation=(
                        f"{len(time_anomalies)} problem sessions took > 2.5x the baseline expected duration "
                        "while requiring multiple retries, indicating prolonged struggle and trial-and-error."
                    ),
                )
            )

        # -------------------------------------------------------------------
        # Signal E: Repeated Concept Blindspot (Topic-Level Breakdown)
        # -------------------------------------------------------------------
        topic_groups: Dict[str, List[CodingTelemetry]] = {}
        for e in telemetry:
            topic_groups.setdefault(e.topic, []).append(e)

        for topic, topic_events in topic_groups.items():
            if len(topic_events) >= 3:
                topic_passes = sum(1 for te in topic_events if te.first_attempt_pass)
                topic_hints = sum(1 for te in topic_events if te.hints_requested > 0)
                topic_pass_ratio = topic_passes / len(topic_events)
                topic_hint_ratio = topic_hints / len(topic_events)

                if topic_pass_ratio < 0.40 or topic_hint_ratio > 0.50:
                    affected_topics.append(topic)

        if affected_topics:
            trigger_codes.append("FP_CONCEPT_BLINDSPOT")
            evidence_list.append(
                DiagnosticEvidence(
                    trigger_code="FP_CONCEPT_BLINDSPOT",
                    metric="blindspot_topic_count",
                    observed_value=float(len(affected_topics)),
                    threshold=1.0,
                    interpretation=(
                        f"Repeated conceptual friction identified across core topics: {', '.join(affected_topics)}. "
                        "These areas show consistent hint reliance and low unassisted problem resolution."
                    ),
                )
            )

        # -------------------------------------------------------------------
        # Signal F: Velocity vs. Mastery Decay
        # -------------------------------------------------------------------
        if student.roadmap_completion >= THRESHOLD_VELOCITY_ROADMAP_PCT and unassisted_pass_ratio < THRESHOLD_VELOCITY_PASS_PCT:
            trigger_codes.append("FP_VELOCITY_DECAY")
            evidence_list.append(
                DiagnosticEvidence(
                    trigger_code="FP_VELOCITY_DECAY",
                    metric="velocity_mastery_divergence",
                    observed_value=round(student.roadmap_completion / 100.0 - unassisted_pass_ratio, 2),
                    threshold=0.20,
                    interpretation=(
                        f"Roadmap progress ({student.roadmap_completion}%) is moving faster than demonstrated "
                        f"independent mastery ({round(unassisted_pass_ratio * 100, 1)}% unassisted pass rate). "
                        "Completion status may create an illusion of readiness."
                    ),
                )
            )

        # -------------------------------------------------------------------
        # Signal G: Shallow Consistency (Streak vs. Depth)
        # -------------------------------------------------------------------
        if student.current_streak >= THRESHOLD_CONSISTENCY_STREAK and unassisted_pass_ratio < THRESHOLD_UNASSISTED_PASS:
            trigger_codes.append("FP_SHALLOW_CONSISTENCY")
            evidence_list.append(
                DiagnosticEvidence(
                    trigger_code="FP_SHALLOW_CONSISTENCY",
                    metric="streak_depth_ratio",
                    observed_value=float(student.current_streak),
                    threshold=float(THRESHOLD_CONSISTENCY_STREAK),
                    interpretation=(
                        f"You are consistently active with a {student.current_streak}-day streak, but the depth "
                        "of independent learning is not keeping pace with your platform activity."
                    ),
                )
            )

        # -------------------------------------------------------------------
        # Score Aggregation: False Progress Index (0–100)
        # -------------------------------------------------------------------
        sub_independence = max(0.0, min(100.0, (1.0 - unassisted_pass_ratio) * 100))
        sub_hints = min(100.0, (hint_dependency / 0.70) * 100)
        sub_blindspots = min(100.0, (len(affected_topics) / 2.0) * 100)
        sub_brute = min(100.0, (multi_attempt_rate / 0.50) * 100)
        sub_time = min(100.0, (time_anomaly_rate / 0.25) * 100)
        
        mismatch_triggers = sum(1 for c in ("FP_VELOCITY_DECAY", "FP_SHALLOW_CONSISTENCY") if c in trigger_codes)
        sub_velocity_depth = 100.0 if mismatch_triggers == 2 else (50.0 if mismatch_triggers == 1 else 0.0)

        fp_index = round(
            (sub_independence * WEIGHT_LOW_INDEPENDENCE) +
            (sub_hints * WEIGHT_HINT_DEPENDENCY) +
            (sub_blindspots * WEIGHT_CONCEPT_BLINDSPOT) +
            (sub_brute * WEIGHT_BRUTE_FORCE) +
            (sub_time * WEIGHT_TIME_ANOMALY) +
            (sub_velocity_depth * WEIGHT_VELOCITY_DEPTH),
            1,
        )
        fp_index = max(0.0, min(100.0, fp_index))

        # Severity determination
        if fp_index >= 75.0:
            severity = "CRITICAL"
        elif fp_index >= 50.0:
            severity = "HIGH"
        elif fp_index >= 25.0:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        # Classification decision
        is_false_progress = (fp_index >= 50.0) or (fp_index >= 35.0 and len(trigger_codes) >= 3)
        confidence = round(min(0.98, 0.60 + (total_problems / 100.0) * 0.40), 2)

        # Explainable mentorship synthesis
        diagnosis = cls._synthesize_diagnosis(
            student=student,
            is_false_progress=is_false_progress,
            fp_index=fp_index,
            hint_dependency=hint_dependency,
            unassisted_pass_ratio=unassisted_pass_ratio,
            affected_topics=affected_topics,
            trigger_codes=trigger_codes,
        )

        recommended_action = cls._recommend_action(is_false_progress, affected_topics)

        return FalseProgressDiagnosticResponse(
            student_id=student.id,
            is_false_progress=is_false_progress,
            false_progress_index=fp_index,
            severity=severity,
            confidence=confidence,
            trigger_codes=trigger_codes,
            affected_topics=affected_topics,
            evidence=evidence_list,
            diagnosis=diagnosis,
            recommended_action=recommended_action,
        )

    @classmethod
    def _synthesize_diagnosis(
        cls,
        student: Student,
        is_false_progress: bool,
        fp_index: float,
        hint_dependency: float,
        unassisted_pass_ratio: float,
        affected_topics: List[str],
        trigger_codes: List[str],
    ) -> str:
        if not is_false_progress:
            return (
                f"Your learning telemetry reflects verified autonomous progress without active false-progress flags. With a {student.current_streak}-day streak "
                f"and {round(unassisted_pass_ratio * 100, 1)}% independent first-attempt solves, your roadmap progression "
                f"({student.roadmap_completion}%) is supported by autonomous problem-solving telemetry."
            )

        topics_str = ", ".join(affected_topics) if affected_topics else "recent algorithmic patterns"
        return (
            f"Your activity level looks strong: {student.roadmap_completion}% roadmap completion and a "
            f"{student.current_streak}-day active streak. However, your problem-solving telemetry suggests that "
            f"this progress is not translating into independent mastery. You have a {round(hint_dependency * 100, 1)}% "
            f"hint dependency rate and only {round(unassisted_pass_ratio * 100, 1)}% first-attempt independent solves, "
            f"with persistent friction in {topics_str}. Scholar AI recommends a targeted conceptual diagnostic "
            "before you proceed to advanced modules."
        )

    @classmethod
    def _recommend_action(cls, is_false_progress: bool, affected_topics: List[str]) -> str:
        if not is_false_progress:
            return "Continue advancing through the current roadmap track."
        
        primary_topic = affected_topics[0] if affected_topics else "algorithmic state transitions"
        return (
            f"Execute a 2-minute conceptual mastery diagnostic on {primary_topic}. "
            f"Pause downstream unlocking and insert a remediation sprint targeting independent derivation."
        )

    @staticmethod
    def _empty_response(student_id: str, diagnosis: str, recommended_action: str = "N/A") -> FalseProgressDiagnosticResponse:
        return FalseProgressDiagnosticResponse(
            student_id=student_id,
            is_false_progress=False,
            false_progress_index=0.0,
            severity="LOW",
            confidence=0.0,
            trigger_codes=[],
            affected_topics=[],
            evidence=[],
            diagnosis=diagnosis,
            recommended_action=recommended_action,
        )
