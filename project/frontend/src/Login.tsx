import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Login.css";

type Role = "ADMIN" | "SECURITY_ENGINEER" | "ANALYST" | "AUDITOR";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("ADMIN");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      window.sessionStorage.setItem("coreshieldUser", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The backend could not be reached."
      );
    } finally {
      setIsLoading(false);
    }
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
        {/* Iconita de Lacat */}
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
              placeholder="operator@local.dev"
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
              <option value="SECURITY_ENGINEER">Security Engineer</option>
              <option value="ANALYST">Analyst</option>
              <option value="AUDITOR">Auditor</option>
            </select>
          </div>

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? "Authenticating..." : "Authenticate"}
          </button>
        </form>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <div className="back-link-container">
          <Link to="/" className="back-link">
            ← Return to Homepage
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
