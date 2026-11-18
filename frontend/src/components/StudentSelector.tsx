import React, { useState } from "react";
import { User, RefreshCw } from "lucide-react";

interface Props {
  currentStudentId: string;
  onSelectStudent: (id: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export const StudentSelector: React.FC<Props> = ({
  currentStudentId,
  onSelectStudent,
  isLoading,
  onRefresh,
}) => {
  const [customId, setCustomId] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customId.trim()) {
      onSelectStudent(customId.trim());
      setCustomId("");
      setShowCustom(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <User size={16} color="#9ca3af" />
        <select
          value={currentStudentId}
          onChange={(e) => {
            if (e.target.value === "__custom__") {
              setShowCustom(true);
            } else {
              setShowCustom(false);
              onSelectStudent(e.target.value);
            }
          }}
          style={{
            background: "#1f2937",
            color: "#f9fafb",
            border: "1px solid #374151",
            borderRadius: "6px",
            padding: "0.45rem 0.75rem",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          <option value="student_alex">Alex Sharma (False Progress Archetype)</option>
          <option value="student_priya">Priya Mehta (Genuine Mastery Archetype)</option>
          <option value="student_marcus">Marcus Vance (Sparse Telemetry Archetype)</option>
          <option value="__custom__">Custom Student ID...</option>
        </select>
      </div>

      {showCustom && (
        <form onSubmit={handleCustomSubmit} style={{ display: "flex", gap: "0.4rem" }}>
          <input
            type="text"
            placeholder="Enter student ID"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", width: "160px" }}
          />
          <button type="submit" className="btn-secondary" style={{ padding: "0.4rem 0.7rem", fontSize: "0.8rem" }}>
            Load
          </button>
        </form>
      )}

      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="btn-secondary"
        title="Refresh live data from backend"
        style={{ padding: "0.45rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem" }}
      >
        <RefreshCw size={14} className={isLoading ? "spinner" : ""} />
        <span>Refresh</span>
      </button>
    </div>
  );
};
