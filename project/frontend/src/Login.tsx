import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./Login.css";

type Role = "ADMIN" | "SECURITY_ENGINEER" | "ANALYST" | "AUDITOR";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("ADMIN");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt:", { email, role });

  };

  return (
    <div className="login-page">
      {/* Element decorativ de fundal (Glow) */}
      <div className="login-glow"></div>

      {/* Cardul Animat */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-card"
      >
        {/* Iconița de Lacăt */}
        <div className="icon-container">
          <div className="lock-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
        </div>

        <h2 className="login-title">Access Portal</h2>
        <p className="login-subtitle">Identify yourself to access the engine.</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="auth-input"
              placeholder="operator@core.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Role</label>
            <select
              className="auth-input"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="ADMIN">Administrator</option>
              <option value="ANALYST">Analyst</option>
            </select>
          </div>

          <button type="submit" className="auth-btn">
            Authenticate
          </button>
        </form>

        <div className="back-link-container">
          <Link to="/" className="back-link">
            ← Return to Homepage
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
