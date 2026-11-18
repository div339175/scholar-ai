import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Bot, User } from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: "user" | "scholar";
  text: string;
  intent?: string;
  target_topic?: string | null;
  evidence_sources?: string[];
  action?: string | null;
  requires_action?: boolean;
}

interface Props {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  targetTopic: string | null;
}

export const ScholarChatPanel: React.FC<Props> = ({
  messages,
  onSendMessage,
  isLoading,
  targetTopic,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const msg = inputText.trim();
    setInputText("");
    await onSendMessage(msg);
  };

  const handleQuickPrompt = (prompt: string) => {
    if (!isLoading) {
      onSendMessage(prompt);
    }
  };

  return (
    <div className="card chat-window">
      <div className="card-header">
        <div className="card-title">
          <MessageSquare size={18} color="#6366f1" />
          <span>Scholar Evidence-Grounded Conversation</span>
        </div>
        <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
          Deterministic Engine
        </span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", margin: "auto", fontSize: "0.9rem" }}>
            <p>Ask Scholar about your current action, mastery status, readiness, or topic explanations.</p>
            <p style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}>
              All responses are deterministically bounded by verified learning telemetry.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`message-bubble ${m.sender === "user" ? "message-user" : "message-scholar"}`}
            >
              <div className="message-meta">
                {m.sender === "user" ? (
                  <>
                    <User size={12} />
                    <span>You</span>
                  </>
                ) : (
                  <>
                    <Bot size={12} color="#818cf8" />
                    <span>Scholar AI</span>
                    {m.intent && (
                      <span className="badge badge-neutral" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                        Intent: {m.intent}
                      </span>
                    )}
                    {m.action && (
                      <span className="badge badge-info" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                        Action: {m.action}
                      </span>
                    )}
                    {m.target_topic && (
                      <span className="action-topic" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                        Topic: {m.target_topic}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div>{m.text}</div>

              {m.evidence_sources && m.evidence_sources.length > 0 && (
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  <span>Evidence:</span>
                  {m.evidence_sources.map((src) => (
                    <span key={src} style={{ background: "rgba(255,255,255,0.05)", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                      {src}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="message-bubble message-scholar" style={{ opacity: 0.85 }}>
            <div className="message-meta">
              <Bot size={12} color="#818cf8" />
              <span>Scholar API Request</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <div className="spinner" />
              <span>Querying verified state and deterministic policies...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Prompts */}
      <div className="quick-prompts">
        <button
          type="button"
          className="quick-btn"
          onClick={() => handleQuickPrompt("What should I do next?")}
          disabled={isLoading}
        >
          What should I do next?
        </button>
        <button
          type="button"
          className="quick-btn"
          onClick={() => handleQuickPrompt("Why are you asking me to do this?")}
          disabled={isLoading}
        >
          Why this action?
        </button>
        {targetTopic ? (
          <button
            type="button"
            className="quick-btn"
            onClick={() => handleQuickPrompt(`Explain ${targetTopic}`)}
            disabled={isLoading}
          >
            Explain {targetTopic}
          </button>
        ) : (
          <button
            type="button"
            className="quick-btn"
            onClick={() => handleQuickPrompt("Explain this topic")}
            disabled={isLoading}
          >
            Explain topic
          </button>
        )}
        <button
          type="button"
          className="quick-btn"
          onClick={() => handleQuickPrompt("Did I master this?")}
          disabled={isLoading}
        >
          Check mastery status
        </button>
        <button
          type="button"
          className="quick-btn"
          onClick={() => handleQuickPrompt("What is my readiness?")}
          disabled={isLoading}
        >
          View readiness
        </button>
        <button
          type="button"
          className="quick-btn"
          onClick={() => handleQuickPrompt("Where am I on my roadmap?")}
          disabled={isLoading}
        >
          View roadmap status
        </button>
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask Scholar (e.g. 'What next?', 'Why this?', 'Explain Sliding Window')..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="btn-primary" disabled={isLoading || !inputText.trim()}>
          <Send size={15} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
