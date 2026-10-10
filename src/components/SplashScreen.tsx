import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export default function SplashScreen({ onComplete, durationMs = 8000 }: SplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out smoothly 500ms before completion
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(durationMs - 500, 1000));

    // Finish splash transition
    const completeTimer = setTimeout(() => {
      onComplete();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [durationMs, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col justify-between items-center bg-gradient-to-b from-[#0B132B] via-[#080E21] to-[#040817] text-white px-6 transition-all duration-500 ease-out select-none ${
        isFadingOut ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)'
      }}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Spacer Top for balanced centering */}
      <div className="w-full flex-shrink-0 pt-4" />

      {/* CENTER CONTENT (Logo shifted higher up, with loading bar perfectly balanced) */}
      <div className="flex-1 w-full max-w-sm flex flex-col items-center justify-center text-center my-auto px-4 z-10 -mt-12">
        
        {/* Logo Badge with Soft Cyan Glow */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-3.5 bg-gradient-to-r from-blue-500/35 to-cyan-400/35 rounded-3xl blur-2xl transition-all" />
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-cyan-400/40 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.7),0_0_30px_rgba(6,182,212,0.3)] flex items-center justify-center backdrop-blur-md">
            <img 
              src="https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png"
              alt="Logo E-Arsip Al-Hicam"
              className="w-full h-full object-contain drop-shadow-[0_4px_14px_rgba(6,182,212,0.6)]"
            />
          </div>
        </div>

        {/* Divider Accent */}
        <div className="h-0.5 w-20 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto mb-6 opacity-80" />

        {/* Loading Progress & Dynamic Label */}
        <div className="flex flex-col items-center gap-3 w-full max-w-[260px]">
          {/* Progress Track */}
          <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden border border-cyan-500/30 p-[1.5px] shadow-inner">
            <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full animate-splash-fill" />
          </div>

          {/* Loading Subtext */}
          <div className="flex items-center gap-2 text-cyan-200 text-xs sm:text-sm font-medium tracking-wide">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Sedang memuat sistem e-arsip...</span>
          </div>
        </div>
      </div>

      {/* BOTTOM FOOTER */}
      <div className="w-full flex-shrink-0 flex flex-col items-center justify-center text-center space-y-1 opacity-75 pb-2 z-10">
        <p className="text-[10px] sm:text-xs text-slate-400 font-mono tracking-wider">
          v1.0 • Secure Enterprise Architecture
        </p>
        <p className="text-[9px] sm:text-[10px] text-slate-500">
          SMP Al-Hikam Sendang Mulyo © 2026
        </p>
      </div>
    </div>
  );
}
