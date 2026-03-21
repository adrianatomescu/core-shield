import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DarkVeil from "./DarkVeil"; 

function useTypewriter(text: string) {
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {

    const typeSpeed = 50;    
    const deleteSpeed = 40;  
    const pauseTime = 2000;  

    const handleTyping = () => {
      if (!isDeleting) {
        
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          setIndex((prev) => prev + 1);
        } else {

          setIsDeleting(true);
        }
      } else {

        if (index > 0) {
          setDisplayedText(text.slice(0, index - 1));
          setIndex((prev) => prev - 1);
        } else {

          setIsDeleting(false);
        }
      }
    };

    let delay = isDeleting ? deleteSpeed : typeSpeed;

    if (!isDeleting && index === text.length) {
      delay = pauseTime;
    } 

    else if (isDeleting && index === 0) {
      delay = 500;
    }

    const timer = setTimeout(handleTyping, delay);

    return () => clearTimeout(timer);
  }, [index, isDeleting, text]);

  return displayedText;
}

export default function Landing() {
  const navigate = useNavigate();
  const subtitleText = "Intelligent Monitoring. Orchestrating Response. Protecting Critical Operations.";
  
  const displayedText = useTypewriter(subtitleText);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black">
      
      {/* --- FUNDAL DARK VEIL --- */}
      <div className="absolute inset-0 z-0">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0}
          scanlineIntensity={0}
          speed={0.3}
          scanlineFrequency={0}
          warpAmount={0}
        />
      </div>

      {/* Vignette pentru contrast */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

      {/* --- CONȚINUT --- */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 -mt-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="flex flex-col items-center"
        >
          {/* Badge */}
          <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-5 py-1.5 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">
              Active Threat Monitoring
            </span>
          </div>

          {/* Titlu */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-7xl md:text-8xl">
            <span className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
              CoreShield
            </span>
          </h1>
          <p className="mb-8 text-2xl font-light text-slate-400 sm:text-4xl">
            Security Automation Engine
          </p>

          {/* Subtitlu Typewriter */}
          {/* Am setat min-h (înălțime minimă) ca să nu sară pagina când se șterge textul */}
          <div className="h-16 w-full max-w-2xl text-lg font-light text-indigo-100/80 sm:text-xl flex justify-center">
            <span>
              {displayedText}
              <span className="animate-pulse ml-1">|</span>
            </span>
          </div>

          {/* Buton */}
          <button
            onClick={() => navigate('/login')}
            className="mt-10 rounded-full bg-white px-9 py-4 text-sm font-bold text-black shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_50px_-10px_rgba(255,255,255,0.6)] cursor-pointer"
          >
            Get Started
          </button>
        </motion.div>
      </div>
    </div>
  );
}