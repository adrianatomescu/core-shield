import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Landing from "./Landing";
import Login from "./Login";
import Dashboard from "./Dashboard";
import AdminCreateUser from "./AdminCreateUser";
import "./App.css";

type Language = "en" | "ro";

function AppContent() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const stored = window.localStorage.getItem("coreshield-language");
    return stored === "ro" ? "ro" : "en";
  });
  const location = useLocation();

  const copy = {
    en: {
      landingTitle: "CoreShield | Landing Page",
      loginTitle: "CoreShield | Login",
      createTitle: "CoreShield | Create Account",
      dashboardTitle: "CoreShield | Dashboard",
      footerDegree: "Bachelor's Degree – Automatic Control and Computer Science",
      modalKicker: "License & Credits",
      modalTitle: "CoreShield",
      modalDescription:
        "A concept-driven security automation experience focused on intelligent monitoring, fast response orchestration and a cinematic interface for modern cyber operations.",
      githubLabel: "GitHub",
      aboutLabel: "About Me",
      aboutCopy:
        "Ambitious and detail-oriented Computer Science student with a strong interest in software development and blending creativity with technology. Adaptable, eager to learn, and motivated to continuously develop both technical and interpersonal skills.",
      closeLabel: "Close popup",
      languageLabel: "Language",
      english: "EN",
      romanian: "RO",
      infoAria: "Open license and author information",
    },
    ro: {
      landingTitle: "CoreShield | Pagina Principală",
      loginTitle: "CoreShield | Autentificare",
      createTitle: "CoreShield | Creare Cont",
      dashboardTitle: "CoreShield | Dashboard",
      footerDegree: "Licență – Automatică și Calculatoare",
      modalKicker: "Licență și Credite",
      modalTitle: "CoreShield",
      modalDescription:
        "O experiență de automatizare pentru securitate, construită în jurul monitorizării inteligente, orchestrării rapide a răspunsului și unei interfețe cinematice pentru operațiuni cyber moderne.",
      githubLabel: "GitHub",
      aboutLabel: "Despre Mine",
      aboutCopy:
        "Studentă ambițioasă și atentă la detalii în domeniul informaticii, cu interes puternic pentru dezvoltarea software și îmbinarea creativității cu tehnologia. Adaptabilă, dornică să învețe și motivată să își dezvolte constant atât competențele tehnice, cât și pe cele interpersonale.",
      closeLabel: "Închide fereastra",
      languageLabel: "Limbă",
      english: "EN",
      romanian: "RO",
      infoAria: "Deschide informațiile despre licență și autor",
    },
  }[language];

  useEffect(() => {
    const pageTitles: Record<string, string> = {
      "/": copy.landingTitle,
      "/login": copy.loginTitle,
      "/admin-create-user": copy.createTitle,
      "/dashboard": copy.dashboardTitle,
    };

    document.title = pageTitles[location.pathname] ?? "CoreShield";
  }, [copy.createTitle, copy.dashboardTitle, copy.landingTitle, copy.loginTitle, location.pathname]);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("coreshield-language", language);
  }, [language]);

  useEffect(() => {
    if (!isInfoModalOpen) {
      document.body.style.overflow = "";
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsInfoModalOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isInfoModalOpen]);

  return (
    <div className="app-shell bg-black text-slate-100 min-h-screen">
      <div className="global-switcher" aria-label="Global preferences">
        <div className="switcher-group">
          <span>{copy.languageLabel}</span>
          <div className="switcher-pills">
            <button
              type="button"
              className={language === "en" ? "switcher-pill active" : "switcher-pill"}
              onClick={() => setLanguage("en")}
            >
              {copy.english}
            </button>
            <button
              type="button"
              className={language === "ro" ? "switcher-pill active" : "switcher-pill"}
              onClick={() => setLanguage("ro")}
            >
              {copy.romanian}
            </button>
          </div>
        </div>
      </div>

      <main>
        <Routes>
          <Route path="/" element={<Landing language={language} />} />
          <Route path="/login" element={<Login language={language} />} />
          <Route path="/admin-create-user" element={<AdminCreateUser language={language} />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>

        {/* --- FOOTER GLOBAL --- */}
        <footer className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            className="
              pointer-events-auto
              flex flex-col md:flex-row items-center gap-3 md:gap-6
              rounded-full
              border border-white/15 
              bg-white/[0.06] 
              backdrop-blur-2xl
              px-8 py-3
              text-[10px] md:text-xs font-medium 
              shadow-[0_0_30px_-5px_rgba(0,0,0,0.8)]
              transition-all duration-300
              hover:bg-white/[0.1] hover:border-white/25
              focus:outline-none focus:ring-2 focus:ring-indigo-400/60
            "
            aria-label={copy.infoAria}
          >
            <span className="text-slate-400 font-mono">© 2026</span>

            <span className="hidden md:block h-3 w-[1px] bg-white/20"></span>

            <span className="tracking-widest uppercase text-white font-bold drop-shadow-md">
              Adriana-Marinela Tomescu
            </span>

            <span className="hidden md:block h-3 w-[1px] bg-white/20"></span>

            <span className="text-slate-300 font-light tracking-wide text-center md:text-left">
              {copy.footerDegree}
            </span>
          </button>
        </footer>

      {isInfoModalOpen ? (
        <div
          className="info-modal-overlay"
          onClick={() => setIsInfoModalOpen(false)}
          role="presentation"
        >
          <div
            className="info-modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-modal-title"
          >
            <button
              type="button"
              className="info-modal-close"
              onClick={() => setIsInfoModalOpen(false)}
              aria-label={copy.closeLabel}
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="info-modal-header">
              <p className="info-modal-kicker">{copy.modalKicker}</p>
              <h2 id="info-modal-title" className="info-modal-title">
                {copy.modalTitle}
              </h2>
              <p className="info-modal-description">
                {copy.modalDescription}
              </p>
            </div>

            <div className="info-modal-section">
              <span className="info-section-label">{copy.githubLabel}</span>
              <a
                href="https://github.com/adrianatomescu/core-shield"
                target="_blank"
                rel="noreferrer"
                className="info-modal-link"
              >
                github.com/adrianatomescu/core-shield
              </a>
            </div>

            <div className="info-modal-section">
              <span className="info-section-label">{copy.aboutLabel}</span>
              <p className="info-about-copy">
                {copy.aboutCopy}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
