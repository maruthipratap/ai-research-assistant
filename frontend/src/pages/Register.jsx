import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      login(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-left">
        <div className="auth-brand">Research AI</div>
        <h1 className="auth-headline">Ask your documents<br />anything.</h1>
        <p className="auth-tagline">
          Upload a PDF or research paper, then chat with it.
          Powered by RAG, semantic vector search, and an AI agent that knows when to search the web.
        </p>
      </div>

      <div className="auth-right">
        <div className="auth-form-box">
          <h2 className="auth-form-title">Create an account</h2>
          <p className="auth-form-sub">Free to use, no credit card needed</p>

          <form onSubmit={handleSubmit}>
            <div>
              <label className="input-label">Full name</label>
              <input className="input" name="name" placeholder="Your name" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input className="input" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input className="input" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              {loading ? "Creating account…" : "Get started"}
            </button>
          </form>

          {error && <div className="auth-error">{error}</div>}

          <p className="auth-footer-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}