from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
from app.models.problem import CodingTelemetry, Problem
from app.schemas.telemetry import TelemetryCreate

class TelemetryService:
    @staticmethod
    def log_telemetry(db: Session, student_id: str, data: TelemetryCreate) -> CodingTelemetry:
        telemetry = CodingTelemetry(
            id=f"telem_{uuid.uuid4().hex[:12]}",
            student_id=student_id,
            problem_id=data.problem_id,
            topic=data.topic,
            difficulty=data.difficulty,
            submission_count=data.submission_count,
            successful=data.successful,
            first_attempt_pass=data.first_attempt_pass,
            hints_requested=data.hints_requested,
            active_coding_duration_seconds=data.active_coding_duration_seconds,
            timestamp=data.timestamp or datetime.now(timezone.utc),
        )
        db.add(telemetry)

        # Update student activity streak if successful
        if data.successful:
            from app.models.student import Student
            student = db.query(Student).filter(Student.id == student_id).first()
            if student and student.current_streak == 0:
                student.current_streak = 1

        db.commit()
        db.refresh(telemetry)
        return telemetry

    @staticmethod
    def get_student_telemetry(db: Session, student_id: str, limit: int = 100) -> List[CodingTelemetry]:
        return (
            db.query(CodingTelemetry)
            .filter(CodingTelemetry.student_id == student_id)
            .order_by(CodingTelemetry.timestamp.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_telemetry_metrics(db: Session, student_id: str) -> Dict[str, Any]:
        records = (
            db.query(CodingTelemetry)
            .filter(CodingTelemetry.student_id == student_id)
            .all()
        )
        total_problems = len(records)
        if total_problems == 0:
            return {
                "total_events": 0,
                "first_attempt_pass_rate": 0.0,
                "hint_dependency_rate": 0.0,
                "average_duration_seconds": 0.0,
                "multi_attempt_count": 0,
                "topic_breakdown": {},
            }

        first_attempts = sum(1 for r in records if r.first_attempt_pass)
        hint_heavy = sum(1 for r in records if r.hints_requested > 0)
        multi_attempts = sum(1 for r in records if r.submission_count > 1)
        total_duration = sum(r.active_coding_duration_seconds for r in records)

        topic_breakdown = {}
        for r in records:
            if r.topic not in topic_breakdown:
                topic_breakdown[r.topic] = {
                    "total": 0,
                    "first_attempt_passes": 0,
                    "hints_used": 0,
                    "avg_submissions": 0,
                    "total_submissions": 0,
                }
            topic_breakdown[r.topic]["total"] += 1
            if r.first_attempt_pass:
                topic_breakdown[r.topic]["first_attempt_passes"] += 1
            topic_breakdown[r.topic]["hints_used"] += r.hints_requested
            topic_breakdown[r.topic]["total_submissions"] += r.submission_count

        for topic, stats in topic_breakdown.items():
            stats["avg_submissions"] = round(stats["total_submissions"] / max(stats["total"], 1), 2)

        return {
            "total_events": total_problems,
            "first_attempt_pass_rate": round(first_attempts / total_problems, 3),
            "hint_dependency_rate": round(hint_heavy / total_problems, 3),
            "average_duration_seconds": round(total_duration / total_problems, 1),
            "multi_attempt_count": multi_attempts,
            "topic_breakdown": topic_breakdown,
        }
