from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from app.models.roadmap import RoadmapNode, NodeType, NodeStatus
from app.schemas.roadmap import RoadmapNodeCreate

class RoadmapService:
    @staticmethod
    def get_roadmap_for_student(db: Session, student_id: str) -> List[RoadmapNode]:
        from app.services.roadmap_adaptation_service import RoadmapAdaptationService
        RoadmapAdaptationService.apply_adaptation_to_nodes(db, student_id)
        return (
            db.query(RoadmapNode)
            .filter(RoadmapNode.student_id == student_id)
            .order_by(RoadmapNode.sequence.asc())
            .all()
        )

    @staticmethod
    def add_node(db: Session, student_id: str, data: RoadmapNodeCreate) -> RoadmapNode:
        node = RoadmapNode(
            id=f"node_{uuid.uuid4().hex[:12]}",
            student_id=student_id,
            title=data.title,
            topic=data.topic,
            status=data.status,
            sequence=data.sequence,
            estimated_minutes=data.estimated_minutes,
            is_locked=data.is_locked,
            node_type=data.node_type,
        )
        db.add(node)
        db.commit()
        db.refresh(node)
        return node
