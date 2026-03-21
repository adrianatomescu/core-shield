// Dashboard.tsx
import { useEffect, useState } from "react";
import "./Dashboard.css";

type DbHealth = {
  ok: boolean;
  timestamp?: string;
  usersCount?: number | null;
};

export default function Dashboard() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [data, setData] = useState<DbHealth | null>(null);
  const [error, setError] = useState<string>("");

  const fetchHealth = async () => {
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("http://localhost:8080/api/health/db", {
        method: "GET",
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = (await res.json()) as DbHealth;
      setData(json);
      setStatus(json.ok ? "ok" : "error");
      if (!json.ok) setError("DB responded but returned ok=false");
    } catch (e) {
      setStatus("error");
      setData(null);
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="dash-page">
      <div className="dash-glow" />

      <div className="dash-card">
        <div className="dash-top">
          <div className="dash-title">
            <div className="dash-badge">CoreShield</div>
            <h1>Dashboard</h1>
            <p>DB connectivity check</p>
          </div>

          <button className="dash-btn" onClick={fetchHealth} disabled={status === "loading"}>
            {status === "loading" ? "Checking..." : "Re-check"}
          </button>
        </div>

        <div className="dash-row">
          <span className="dash-label">Status</span>
          <span className={`dash-pill ${status}`}>
            {status === "loading" ? "LOADING" : status === "ok" ? "DB OK" : "ERROR"}
          </span>
        </div>

        <div className="dash-row">
          <span className="dash-label">Timestamp</span>
          <span className="dash-value">{data?.timestamp ?? "—"}</span>
        </div>

        <div className="dash-row">
          <span className="dash-label">Users count</span>
          <span className="dash-value">
            {typeof data?.usersCount === "number" ? data.usersCount : "—"}
          </span>
        </div>

        {status === "error" && (
          <div className="dash-error">
            {error || "Could not reach backend. Is it running on :8080 and CORS allowed?"}
          </div>
        )}
      </div>
    </div>
  );
}
