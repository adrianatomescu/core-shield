import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./Landing";
import Login from "./Login";
import Dashboard from "./Dashboard";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-black text-slate-100 min-h-screen">
        
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>

        {/* --- FOOTER GLOBAL --- */}
        <footer className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div
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
            "
          >
            <span className="text-slate-400 font-mono">© 2026</span>

            <span className="hidden md:block h-3 w-[1px] bg-white/20"></span>

            <span className="tracking-widest uppercase text-white font-bold drop-shadow-md">
              Adriana-Marinela Tomescu
            </span>

            <span className="hidden md:block h-3 w-[1px] bg-white/20"></span>

            <span className="text-slate-300 font-light tracking-wide text-center md:text-left">
              Bachelor's Degree – Automatic Control and Computer Science
            </span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
