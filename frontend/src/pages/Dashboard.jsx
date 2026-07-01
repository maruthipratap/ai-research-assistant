import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";

const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const IconUpload = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);

function statusBadge(status) {
  const map = {
    ready:      "badge badge-ready",
    failed:     "badge badge-failed",
    processing: "badge badge-processing",
    uploaded:   "badge badge-uploaded",
  };
  return <span className={map[status] || "badge"}>{status}</span>;
}

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef(null);

  const fetchDocs = async () => {
    const { data } = await api.get("/documents");
    setDocs(data);
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadMsg(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setUploadMsg(null);
    try {
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadMsg({ type: "ok", text: "Uploaded and processed successfully." });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocs();
    } catch (err) {
      setUploadMsg({ type: "error", text: err.response?.data?.message || "Upload failed." });
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data } = await api.post("/search/semantic", { query, limit: 5 });
      setSearchResults(data);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <h1 className="page-title">Documents</h1>
        <p className="page-sub">Upload files to build your knowledge base, then chat with them.</p>

        {/* Upload */}
        <div className="card">
          <div className="card-title">Add a document</div>
          <label className="upload-zone" onClick={() => fileInputRef.current?.click()}>
            <IconUpload />
            <p className="upload-zone-text">{file ? file.name : "Click to choose a file"}</p>
            <p className="upload-zone-sub">PDF or TXT · max 20 MB</p>
            <input ref={fileInputRef} type="file" accept=".pdf,.txt" onChange={handleFileChange} style={{ display: "none" }} />
          </label>

          {file && (
            <div className="upload-selected">
              <span>📄 {file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? "Processing…" : "Upload"}
              </button>
            </div>
          )}

          {uploadMsg && (
            <p className={`inline-msg ${uploadMsg.type === "ok" ? "ok" : "error"}`}>
              {uploadMsg.type === "ok" ? "✓" : "⚠"} {uploadMsg.text}
            </p>
          )}
        </div>

        {/* Semantic search */}
        <div className="card">
          <div className="card-title">Semantic search</div>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: 10 }}>
            <input
              className="input"
              type="text"
              placeholder="Search across your documents by meaning…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={searching || !query.trim()}>
              {searching ? "…" : "Search"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="search-result-list">
              {searchResults.map((r, i) => (
                <div className="search-result" key={i}>
                  <p className="search-result-text">{r.text}</p>
                  <div className="search-result-meta">
                    <span>📄 {r.sourceDocument}</span>
                    <span>Chunk #{r.chunkIndex}</span>
                    <span className="score-pill">Score {r.score.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document list */}
        <div className="card">
          <div className="card-title">Your library ({docs.length})</div>
          {docs.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>
              No documents yet — upload one above to get started.
            </p>
          )}
          <div className="doc-list">
            {docs.map((doc) => (
              <div className="doc-row" key={doc._id}>
                <div className="doc-icon"><IconFile /></div>
                <div className="doc-info">
                  <div className="doc-name">{doc.originalName}</div>
                  <div className="doc-meta">
                    {doc.chunkCount ?? 0} chunks · {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                  {doc.status === "failed" && doc.processingError && (
                    <div className="doc-error">⚠ {doc.processingError}</div>
                  )}
                </div>
                {statusBadge(doc.status)}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}