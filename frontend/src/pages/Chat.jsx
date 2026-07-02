import { useState, useRef, useEffect } from "react";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import ReactMarkdown from "react-markdown";

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const historyForRequest = messages
      .filter((m) => !m.isError)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/chat", { message: text, history: historyForRequest });
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
          content: err.response?.data?.message || "Something went wrong.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-shell">
      <Sidebar />
      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-dot" />
          <span className="chat-header-title">AI Research Assistant</span>
          <span className="chat-header-sub">Searches your documents · web · calculator</span>
        </div>

        <div className="chat-window">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">💬</div>
              <div className="chat-empty-title">Ask anything</div>
              <div className="chat-empty-sub">
                Ask a question about your uploaded documents. The AI will search your knowledge base, the web, or calculate — whatever the question needs.
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`bubble-row ${m.role}`}>
              <div className={`bubble ${m.role} ${m.isError ? "error-bubble" : ""}`}>
                <ReactMarkdown>{m.content}</ReactMarkdown>

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
                    <span className="sources-label">Sources</span>
                    {m.sources.map((s) => (
                      <span key={s.id} className="source-chip">
                        [{s.id}] {s.sourceDocument} · {s.score.toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}

                {m.modelUsed && <p className="model-used">via {m.modelUsed}</p>}
              </div>
            </div>
          ))}

          {loading && (
            <div className="bubble-row assistant">
              <div className="bubble loading">Thinking…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-bar">
          <form onSubmit={handleSend}>
            <div className="chat-input-row">
              <input
                className="chat-input-field"
                type="text"
                placeholder="Ask about your documents…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button className="chat-send-btn" type="submit" disabled={loading || !input.trim()}>
                <IconSend />
              </button>
            </div>
          </form>
          <p className="chat-hint">The AI can search your documents, look up the web, or calculate.</p>
        </div>
      </div>
    </div>
  );
}