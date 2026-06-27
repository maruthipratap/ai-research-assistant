import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const { user, logout } = useAuth();

  const fetchDocs = async () => {
    const { data } = await api.get("/documents");
    setDocs(data);
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setMessage("");
    try {
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Uploaded! Text extraction complete.");
      setFile(null);
      fetchDocs();
    } catch (err) {
      setMessage(err.response?.data?.message || "Upload failed");
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
    } catch (err) {
      setMessage(err.response?.data?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="dashboard">
      <header>
        <h2>Welcome, {user?.name}</h2>
        <button onClick={logout}>Log out</button>
      </header>

      <section className="upload-box">
        <h3>Upload a document (PDF or TXT)</h3>
        <form onSubmit={handleUpload}>
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button type="submit" disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
        {message && <p>{message}</p>}
      </section>

      <section className="upload-box">
        <h3>Semantic search across your documents</h3>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder='Try: "what happened in chapter 5" or any topic in your doc'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={searching || !query.trim()}>
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map((r, i) => (
              <li key={i}>
                <p className="chunk-text">{r.text}</p>
                <p className="chunk-meta">
                  Source: {r.sourceDocument} · chunk #{r.chunkIndex} · score{" "}
                  {r.score.toFixed(3)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>Your documents</h3>
        <ul>
          {docs.map((doc) => (
            <li key={doc._id}>
              {doc.originalName} — <span className="status">{doc.status}</span> ·{" "}
              {doc.chunkCount ?? 0} chunks
              {doc.status === "failed" && doc.processingError && (
                <p className="chunk-meta">⚠ {doc.processingError}</p>
              )}
            </li>
          ))}
        </ul>
        {docs.length === 0 && <p>No documents yet. Upload one above.</p>}
      </section>
    </div>
  );
}
