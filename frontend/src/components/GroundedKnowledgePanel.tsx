import React from "react";
import { ScholarKnowledgeRetrieval } from "../types/scholar";
import { BookMarked, CheckCircle2 } from "lucide-react";

interface Props {
  knowledge: ScholarKnowledgeRetrieval[];
  targetTopic: string | null;
}

export const GroundedKnowledgePanel: React.FC<Props> = ({ knowledge, targetTopic }) => {
  if (!knowledge || knowledge.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <BookMarked size={18} color="#a78bfa" />
            <span>Curated Scholar Knowledge</span>
          </div>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
          {targetTopic
            ? `No curated knowledge items retrieved for ${targetTopic}.`
            : "No conceptual review required for current verified action."}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <BookMarked size={18} color="#a78bfa" />
          <span>Curated Scholar Knowledge</span>
          {targetTopic && (
            <span className="badge badge-info" style={{ marginLeft: "0.5rem" }}>
              {targetTopic}
            </span>
          )}
        </div>
        <span className="badge badge-neutral">
          {knowledge.length} {knowledge.length === 1 ? "Concept" : "Concepts"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {knowledge.map((item) => (
          <div key={item.knowledge_id} className="knowledge-item">
            <div className="knowledge-title">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={16} color="#818cf8" />
                <span>{item.title}</span>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>
                {item.source_type === "CURATED_PROTOTYPE" ? "Curated Scholar Knowledge" : item.source_type}
              </span>
            </div>

            <p className="knowledge-content">{item.content}</p>

            {item.tags && item.tags.length > 0 && (
              <div className="knowledge-tags">
                {item.tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
