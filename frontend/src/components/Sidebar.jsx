import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const IconDocs = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

export default function Sidebar() {
  const { user, logout } = useAuth();
  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>Research AI</span>
        <small>Document intelligence</small>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          <IconDocs /> Documents
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          <IconChat /> Chat
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-row">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={logout}>Sign out</button>
      </div>
    </aside>
  );
}