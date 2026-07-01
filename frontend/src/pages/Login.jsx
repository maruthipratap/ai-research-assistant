import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
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
      const { data } = await api.post("/auth/login", form);
      login(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-left">
        <div className="auth-brand">Research AI</div>
        <h1 className="auth-headline">Your documents,<br />finally answerable.</h1>
        <p className="auth-tagline">
          Upload PDFs, research papers, or notes — then ask anything.
          An AI agent searches your knowledge base, the web, and reasons across all of it.
        </p>
      </div>

      <div className="auth-right">
        <div className="auth-form-box">
          <h2 className="auth-form-title">Welcome back</h2>
          <p className="auth-form-sub">Sign in to your account</p>

          <form onSubmit={handleSubmit}>
            <div>
              <label className="input-label">Email</label>
              <input className="input" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input className="input" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {error && <div className="auth-error">{error}</div>}

          <p className="auth-footer-text">
            No account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}