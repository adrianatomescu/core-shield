import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

type StoredUser = {
  id: number;
  email: string;
  role: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const rawUser = window.sessionStorage.getItem("coreshieldUser");
  const user: StoredUser | null = rawUser ? JSON.parse(rawUser) : null;

  const handleLogout = () => {
    window.sessionStorage.removeItem("coreshieldUser");
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const handlePopState = () => {
      window.sessionStorage.removeItem("coreshieldUser");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate, user]);

  return (
    <section className="min-h-screen bg-black px-6 py-20 text-slate-100">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-12">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-300">
            CoreShield Dashboard
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Logout
          </button>
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
          Welcome back{user ? `, ${user.email}` : ""}.
        </h1>

        <p className="mb-10 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
          Your login is now checked against the PostgreSQL `users` table through
          the FastAPI backend. If the credentials match, the app redirects here.
        </p>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-slate-400">
              Status
            </p>
            <p className="text-2xl font-semibold text-emerald-300">Connected</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-slate-400">
              Role
            </p>
            <p className="text-2xl font-semibold text-white">
              {user?.role || "Unknown"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-slate-400">
              API
            </p>
            <p className="text-sm font-medium text-cyan-300">
              POST /auth/login
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
