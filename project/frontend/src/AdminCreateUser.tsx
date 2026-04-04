import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./Login.css";

type Role = "ADMIN" | "SECURITY_ENGINEER" | "ANALYST" | "AUDITOR";

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "ADMIN", label: "Administrator" },
  { value: "SECURITY_ENGINEER", label: "Security Engineer" },
  { value: "ANALYST", label: "Analyst" },
  { value: "AUDITOR", label: "Auditor" },
];

export default function AdminCreateUser() {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("ANALYST");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleAdminVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          role: "ADMIN",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Administrator verification failed.");
      }

      setIsAdminVerified(true);
      setSuccessMessage("Administrator verified. You can now create a new account.");
    } catch (error) {
      setIsAdminVerified(false);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The backend could not be reached."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("http://localhost:8000/users/admin-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          admin_email: adminEmail,
          admin_password: adminPassword,
          new_user_email: newUserEmail,
          new_user_password: newUserPassword,
          new_user_role: newUserRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Account creation failed.");
      }

      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("ANALYST");
      setSuccessMessage(
        `Account created for ${data.user.email}. Password was stored encrypted in the database.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The backend could not be reached."
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-card glass-card-wide"
      >
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </div>
        </div>

        <h2 className="login-title">Provision New Account</h2>
        <p className="login-subtitle">
          First verify an administrator account, then register the new operator.
        </p>

        <div className="step-indicator">
          <span className={isAdminVerified ? "step-pill is-complete" : "step-pill is-active"}>
            1. Admin Verification
          </span>
          <span className={isAdminVerified ? "step-pill is-active" : "step-pill"}>
            2. Create Account
          </span>
        </div>

        {!isAdminVerified ? (
          <form onSubmit={handleAdminVerification}>
            <div className="input-group">
              <label className="input-label">Administrator Email</label>
              <input
                type="text"
                className="auth-input"
                placeholder="admin@local.dev"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Administrator Password</label>
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="auth-btn" disabled={isVerifying}>
              {isVerifying ? "Verifying..." : "Verify Administrator"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateUser}>
            <div className="verified-banner">
              Administrator `{adminEmail}` verified successfully.
            </div>

            <div className="input-group">
              <label className="input-label">New User Email</label>
              <input
                type="text"
                className="auth-input"
                placeholder="operator@local.dev"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label">New User Password</label>
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Role</label>
              <select
                className="auth-input"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as Role)}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setIsAdminVerified(false);
                  setSuccessMessage("");
                }}
              >
                Change Admin
              </button>
              <button type="submit" className="auth-btn" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        )}

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
        {successMessage ? <p className="auth-success">{successMessage}</p> : null}
        {successMessage && isAdminVerified ? (
          <div className="back-link-container">
            <Link to="/login" className="success-link-btn">
              Go To Login
            </Link>
          </div>
        ) : null}

        <div className="back-link-container">
          <Link to="/login" className="back-link">
            ← Return to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
