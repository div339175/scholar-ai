import enum
import uuid
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class NodeType(str, enum.Enum):
    NORMAL = "NORMAL"
    REMEDIATION = "REMEDIATION"
    MASTERY_CHECK = "MASTERY_CHECK"

class NodeStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    IN_PROGRESS = "IN_PROGRESS"
    LOCKED = "LOCKED"
    PENDING = "PENDING"

class RoadmapNode(Base):
    __tablename__ = "roadmap_nodes"

    id = Column(String(64), primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String(64), ForeignKey("students.id"), nullable=False, index=True)
    title = Column(String(256), nullable=False)
    topic = Column(String(128), nullable=False, index=True)
    status = Column(String(32), default=NodeStatus.PENDING.value, nullable=False)
    sequence = Column(Integer, default=1, nullable=False)
    estimated_minutes = Column(Integer, default=60, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    node_type = Column(String(32), default=NodeType.NORMAL.value, nullable=False)

    student = relationship("Student", back_populates="roadmap_nodes")
