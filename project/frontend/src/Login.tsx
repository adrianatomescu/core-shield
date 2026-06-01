import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "./Login.css";

type Role = "ADMIN" | "MANAGER" | "SECURITY_ENGINEER" | "ANALYST" | "AUDITOR";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("ADMIN");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const copy = {
    title: "Access Portal",
    subtitle: "Identify yourself to access the engine.",
    email: "Email Address",
    password: "Password",
    role: "Role",
    admin: "Administrator",
    manager: "Manager",
    engineer: "Security Engineer",
    analyst: "Analyst",
    auditor: "Auditor",
    authenticate: "Authenticate",
    authenticating: "Authenticating...",
    helper:
      "Need to provision a new operator? Use the add-account icon above and verify with an administrator account first.",
    back: "← Return to Homepage",
  };

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

      const data = await response.json().catch(() => ({
        detail: "The backend returned an unreadable response.",
      }));

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      window.sessionStorage.setItem("coreshieldUser", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof TypeError
          ? "The backend could not be reached. Make sure the API is running on port 8000."
          : error instanceof Error
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
        <Link
          to="/admin-create-user"
          className="create-account-link"
          aria-label="Create account"
          title="Create account"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
        </Link>

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

        <h2 className="login-title">{copy.title}</h2>
        <p className="login-subtitle">{copy.subtitle}</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">{copy.email}</label>
            <input
              type="text"
              className="auth-input"
              placeholder="operator@local.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label className="input-label">{copy.password}</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                className="auth-input auth-input-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.92-2.6 2.62-4.82 4.87-6.32" />
                    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.8 11.8 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">{copy.role}</label>
            <select
              className="auth-input"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="ADMIN">{copy.admin}</option>
              <option value="MANAGER">{copy.manager}</option>
              <option value="SECURITY_ENGINEER">{copy.engineer}</option>
              <option value="ANALYST">{copy.analyst}</option>
              <option value="AUDITOR">{copy.auditor}</option>
            </select>
          </div>

          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? copy.authenticating : copy.authenticate}
          </button>
        </form>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <p className="helper-copy">
          {copy.helper}
        </p>

        <div className="back-link-container">
          <Link to="/" className="back-link">
            {copy.back}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
