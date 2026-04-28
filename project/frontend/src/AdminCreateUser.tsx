import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./Login.css";

type Role = "ADMIN" | "MANAGER" | "SECURITY_ENGINEER" | "ANALYST" | "AUDITOR";

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "ADMIN", label: "Administrator" },
  { value: "MANAGER", label: "Manager" },
  { value: "SECURITY_ENGINEER", label: "Security Engineer" },
  { value: "ANALYST", label: "Analyst" },
  { value: "AUDITOR", label: "Auditor" },
];

export default function AdminCreateUser({ language }: { language: "en" | "ro" }) {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserRole, setNewUserRole] = useState<Role | "">("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const copy = {
    en: {
      title: "Provision New Account",
      subtitle: "First verify an administrator account, then register the new operator.",
      stepOne: "1. Admin Verification",
      stepTwo: "2. Create Account",
      adminEmail: "Administrator Email",
      adminPassword: "Administrator Password",
      verify: "Verify Administrator",
      verifying: "Verifying...",
      verified: "Administrator verified. You can now create a new account.",
      roleRequired: "Please select a role for the new account.",
      created: "Account created for {email}. Password was stored encrypted in the database.",
      newUserEmail: "New User Email",
      newUserPassword: "New User Password",
      role: "Role",
      selectRole: "Select a role",
      changeAdmin: "Change Admin",
      create: "Create Account",
      creating: "Creating...",
      verifiedBanner: "Administrator `{email}` verified successfully.",
      goToLogin: "Go To Login",
      back: "← Return to Login",
    },
    ro: {
      title: "Creare Cont Nou",
      subtitle: "Mai întâi verifică un cont de administrator, apoi înregistrează noul operator.",
      stepOne: "1. Verificare Admin",
      stepTwo: "2. Creare Cont",
      adminEmail: "Email Administrator",
      adminPassword: "Parolă Administrator",
      verify: "Verifică Administratorul",
      verifying: "Se verifică...",
      verified: "Administrator verificat. Acum poți crea un cont nou.",
      roleRequired: "Te rog selectează un rol pentru noul cont.",
      created: "Cont creat pentru {email}. Parola a fost stocată criptat în baza de date.",
      newUserEmail: "Email Utilizator Nou",
      newUserPassword: "Parolă Utilizator Nou",
      role: "Rol",
      selectRole: "Selectează un rol",
      changeAdmin: "Schimbă Adminul",
      create: "Creează Cont",
      creating: "Se creează...",
      verifiedBanner: "Administratorul `{email}` a fost verificat cu succes.",
      goToLogin: "Mergi la Login",
      back: "← Înapoi la Login",
    },
  }[language];

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
      setSuccessMessage(copy.verified);
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

    if (!newUserRole) {
      setErrorMessage(copy.roleRequired);
      setIsCreating(false);
      return;
    }

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
      setNewUserRole("");
      setSuccessMessage(copy.created.replace("{email}", data.user.email));
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

        <h2 className="login-title">{copy.title}</h2>
        <p className="login-subtitle">{copy.subtitle}</p>

        <div className="step-indicator">
          <span className={isAdminVerified ? "step-pill is-complete" : "step-pill is-active"}>
            {copy.stepOne}
          </span>
          <span className={isAdminVerified ? "step-pill is-active" : "step-pill"}>
            {copy.stepTwo}
          </span>
        </div>

        {!isAdminVerified ? (
          <form onSubmit={handleAdminVerification}>
            <div className="input-group">
              <label className="input-label">{copy.adminEmail}</label>
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
              <label className="input-label">{copy.adminPassword}</label>
              <div className="password-field">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  className="auth-input auth-input-password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowAdminPassword((current) => !current)}
                  aria-label={showAdminPassword ? "Hide administrator password" : "Show administrator password"}
                  aria-pressed={showAdminPassword}
                  title={showAdminPassword ? "Hide password" : "Show password"}
                >
                  {showAdminPassword ? (
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

            <button type="submit" className="auth-btn" disabled={isVerifying}>
              {isVerifying ? copy.verifying : copy.verify}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateUser}>
            <div className="verified-banner">
              {copy.verifiedBanner.replace("{email}", adminEmail)}
            </div>

            <div className="input-group">
              <label className="input-label">{copy.newUserEmail}</label>
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
              <label className="input-label">{copy.newUserPassword}</label>
              <div className="password-field">
                <input
                  type={showNewUserPassword ? "text" : "password"}
                  className="auth-input auth-input-password"
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewUserPassword((current) => !current)}
                  aria-label={showNewUserPassword ? "Hide new user password" : "Show new user password"}
                  aria-pressed={showNewUserPassword}
                  title={showNewUserPassword ? "Hide password" : "Show password"}
                >
                  {showNewUserPassword ? (
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
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as Role | "")}
              >
                <option value="" disabled>
                  {copy.selectRole}
                </option>
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
                {copy.changeAdmin}
              </button>
              <button
                type="submit"
                className="auth-btn"
                disabled={isCreating || !newUserRole}
              >
                {isCreating ? copy.creating : copy.create}
              </button>
            </div>
          </form>
        )}

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
        {successMessage ? <p className="auth-success">{successMessage}</p> : null}
        {successMessage && isAdminVerified ? (
          <div className="back-link-container">
            <Link to="/login" className="success-link-btn">
              {copy.goToLogin}
            </Link>
          </div>
        ) : null}

        <div className="back-link-container">
          <Link to="/login" className="back-link">
            {copy.back}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
