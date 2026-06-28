import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Chat() {
  const [messages, setMessages] = useState([]); // {role, content, sources?}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    // Snapshot the conversation BEFORE adding this new message - this is
    // what gets sent as "history" so the backend knows what was already
    // discussed. Capped to the last 10 turns to keep requests reasonably
    // sized; error bubbles are excluded since they're not real conversation.
    const historyForRequest = messages
      .filter((m) => !m.isError)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/chat", {
        message: text,
        history: historyForRequest,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          toolsUsed: data.toolsUsed,
          modelUsed: data.modelUsed,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err.response?.data?.message ||
            "Something went wrong - check that GEMINI_API_KEY is set correctly in backend/.env",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-page">
      <header>
        <h2>Chat — {user?.name}</h2>
        <div>
          <Link to="/dashboard">Documents</Link>
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      <div className="chat-window">
        {messages.length === 0 && (
          <p className="chat-empty">
            Ask a question about a document you've uploaded.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role} ${m.isError ? "error-bubble" : ""}`}>
            <p>{m.content}</p>
            {m.toolsUsed && m.toolsUsed.length > 0 && (
              <div className="tools-used">
                {m.toolsUsed.map((t, j) => (
                  <details key={j} className="tool-chip">
                    <summary>
                      🔧 {t.name}
                      {t.args?.query ? `: "${t.args.query}"` : ""}
                      {t.args?.expression ? `: ${t.args.expression}` : ""}
                    </summary>
                    <pre className="tool-result-text">{t.result}</pre>
                  </details>
                ))}
              </div>
            )}
            {m.sources && m.sources.length > 0 && (
              <div className="sources">
                <span className="sources-label">Sources:</span>
                {m.sources.map((s) => (
                  <span key={s.id} className="source-chip">
                    [{s.id}] {s.sourceDocument} · chunk #{s.chunkIndex} · {s.score.toFixed(2)}
                  </span>
                ))}
              </div>
            )}
            {m.modelUsed && <p className="model-used">via {m.modelUsed}</p>}
          </div>
        ))}

        {loading && <div className="bubble assistant loading">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input">
        <input
          type="text"
          placeholder="Ask about your documents..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}