"""
Scholar AI Intervention Engine
Core Principle: "Completion does not equal competence."

Converts False Progress Detection Engine (FPDE) diagnostics into concrete,
deterministic, and explainable intervention plans.
"""

from typing import List, Optional
from app.models.student import Student
from app.models.problem import CodingTelemetry
from app.models.roadmap import RoadmapNode
from app.schemas.scholar import (
    FalseProgressDiagnosticResponse,
    InterventionPlan,
    InterventionStep,
    ActionType,
    InterventionType,
    RoadmapAction,
    PriorityLevel,
)

class InterventionService:
    """
    Deterministic, explainable intervention engine for Scholar AI.
    Consumes student profile, telemetry, roadmap state, and FPDE diagnostic.
    """

    @classmethod
    def generate_intervention(
        cls,
        student: Student,
        diagnostic: FalseProgressDiagnosticResponse,
        telemetry: List[CodingTelemetry],
        roadmap: List[RoadmapNode],
    ) -> InterventionPlan:
        # -------------------------------------------------------------------
        # Rule A: No False Progress (Genuine Mastery / Normal Progress)
        # -------------------------------------------------------------------
        if not diagnostic.is_false_progress:
            step = InterventionStep(
                step_number=1,
                title="Continue Roadmap Progression",
                description="Maintain current steady pace and continue solving problems unassisted.",
                action_type=ActionType.CONTINUE.value,
                target_topic="General",
                estimated_minutes=30,
                success_condition="Maintain first-attempt solve rate above 75%.",
            )
            return InterventionPlan(
                student_id=student.id,
                intervention_required=False,
                intervention_type=InterventionType.CONTINUE_NORMAL.value,
                priority=PriorityLevel.LOW.value,
                headline="Your current progress is supported by strong independent problem-solving.",
                diagnosis_summary=diagnostic.diagnosis,
                target_topics=[],
                steps=[step],
                mastery_check_required=False,
                mastery_check_topic=None,
                roadmap_action=RoadmapAction.CONTINUE.value,
                success_criteria="Maintain independent solve rate and low hint reliance across upcoming topics.",
            )

        # -------------------------------------------------------------------
        # Rule B: False Progress Detected
        # -------------------------------------------------------------------
        # Determine Priority & Roadmap Action from Severity
        if diagnostic.severity == "CRITICAL":
            priority = PriorityLevel.HIGH.value
            roadmap_action = RoadmapAction.PAUSE_ADVANCEMENT.value
            mastery_check_required = True
        elif diagnostic.severity == "HIGH":
            priority = PriorityLevel.HIGH.value
            roadmap_action = RoadmapAction.INSERT_REMEDIATION.value
            mastery_check_required = True
        elif diagnostic.severity == "MEDIUM":
            priority = PriorityLevel.MEDIUM.value
            roadmap_action = RoadmapAction.INSERT_REMEDIATION.value
            mastery_check_required = True
        else:  # LOW or NONE
            priority = PriorityLevel.LOW.value
            roadmap_action = RoadmapAction.CONTINUE.value
            mastery_check_required = False

        # If velocity decay is triggered, enforce pause
        if "FP_VELOCITY_DECAY" in diagnostic.trigger_codes:
            roadmap_action = RoadmapAction.PAUSE_ADVANCEMENT.value

        # Select primary intervention topic (first in affected_topics, dynamic)
        target_topics = diagnostic.affected_topics if diagnostic.affected_topics else ["Algorithmic Foundations"]
        primary_topic = target_topics[0]
        mastery_check_topic = primary_topic if mastery_check_required else None

        # Build explainable headline and summary
        headline = "Your activity is strong, but your independent mastery is not keeping pace."
        
        # Extract observed metrics from evidence if present
        unassisted_ratio = None
        hint_dep = None
        for ev in diagnostic.evidence:
            if ev.metric == "unassisted_pass_ratio":
                unassisted_ratio = ev.observed_value
            elif ev.metric == "hint_dependency_rate":
                hint_dep = ev.observed_value

        if unassisted_ratio is not None:
            diagnosis_summary = (
                f"Your roadmap is {student.roadmap_completion}% complete, but only "
                f"{round(unassisted_ratio * 100, 1)}% of recent problems were solved independently. "
                f"Scholar AI is { 'pausing advancement temporarily' if roadmap_action == RoadmapAction.PAUSE_ADVANCEMENT.value else 'inserting a remediation focus' } "
                f"so we can verify your {primary_topic} mastery."
            )
        else:
            diagnosis_summary = diagnostic.diagnosis

        # -------------------------------------------------------------------
        # Generate Actionable Steps (Personalized by Trigger Codes)
        # -------------------------------------------------------------------
        steps: List[InterventionStep] = []

        # Step 1: Concept Review
        step1_desc = f"Review the core invariant of {primary_topic} and derive the pattern logic on paper before writing code."
        if "FP_CONCEPT_BLINDSPOT" in diagnostic.trigger_codes:
            step1_desc += f" Focus specifically on why recent {primary_topic} edge-case submissions failed."
        if "FP_TIME_ANOMALY" in diagnostic.trigger_codes:
            step1_desc += " Slow down before coding and write the intended approach first."

        steps.append(
            InterventionStep(
                step_number=1,
                title="Rebuild the concept",
                description=step1_desc,
                action_type=ActionType.CONCEPT_REVIEW.value,
                target_topic=primary_topic,
                estimated_minutes=10,
                success_condition="Student can explain the core pattern without using a solution.",
            )
        )

        # Step 2: Guided Practice
        step2_desc = f"Work through one standard {primary_topic} problem."
        if "FP_HINT_CRUTCH" in diagnostic.trigger_codes:
            step2_desc += " Reduce hint dependency. Attempt the next problem before requesting assistance."
        if "FP_BRUTE_FORCE" in diagnostic.trigger_codes:
            step2_desc += " Formulate the algorithm before submitting code. Avoid repeated trial-and-error submissions."

        steps.append(
            InterventionStep(
                step_number=2,
                title="Practice with guidance",
                description=step2_desc,
                action_type=ActionType.GUIDED_PRACTICE.value,
                target_topic=primary_topic,
                estimated_minutes=15,
                success_condition="Student reaches the correct approach with limited or no hints.",
            )
        )

        # Step 3: Independent Problem
        step3_desc = f"Solve an unseen {primary_topic} problem independently with no hints."
        if "FP_LOW_INDEPENDENCE" in diagnostic.trigger_codes:
            step3_desc += " Verify your approach with dry runs before first submission."
        if "FP_SHALLOW_CONSISTENCY" in diagnostic.trigger_codes:
            step3_desc += " Activity streaks are useful, but the next goal is depth of understanding."

        steps.append(
            InterventionStep(
                step_number=3,
                title="Prove independent understanding",
                description=step3_desc,
                action_type=ActionType.INDEPENDENT_PROBLEM.value,
                target_topic=primary_topic,
                estimated_minutes=20,
                success_condition="Student solves the problem independently.",
            )
        )

        # Step 4: Mastery Check
        if mastery_check_required:
            steps.append(
                InterventionStep(
                    step_number=4,
                    title="Mastery check",
                    description=f"Use a conceptually similar but structurally different {primary_topic} problem to verify transfer.",
                    action_type=ActionType.MASTERY_CHECK.value,
                    target_topic=primary_topic,
                    estimated_minutes=5,
                    success_condition="Student independently solves or correctly explains the underlying pattern.",
                )
            )

        success_criteria = (
            f"Solve 1 unassisted problem in {primary_topic} and pass the 2-minute "
            "conceptual transfer check with score >= 80%."
        )

        return InterventionPlan(
            student_id=student.id,
            intervention_required=True,
            intervention_type=InterventionType.FALSE_PROGRESS_REMEDIATION.value,
            priority=priority,
            headline=headline,
            diagnosis_summary=diagnosis_summary,
            target_topics=target_topics,
            steps=steps,
            mastery_check_required=mastery_check_required,
            mastery_check_topic=mastery_check_topic,
            roadmap_action=roadmap_action,
            success_criteria=success_criteria,
        )
