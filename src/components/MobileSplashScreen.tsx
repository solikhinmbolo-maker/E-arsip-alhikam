import React, { useEffect, useState } from 'react';

interface MobileSplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export default function MobileSplashScreen({ onComplete, durationMs = 5000 }: MobileSplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out smoothly 400ms before completion
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(durationMs - 400, 1000));

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
      className={`fixed inset-0 z-50 flex flex-col justify-between items-center bg-gradient-to-b from-[#0B132B] via-[#080E21] to-[#040817] text-white px-6 transition-all duration-400 ease-out select-none ${
        isFadingOut ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)'
      }}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TOP BRANDING PILL (Separated in top flow with ample headroom) */}
      <div className="w-full flex justify-center items-center flex-shrink-0 pt-2 z-10 opacity-85">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/70 border border-cyan-500/30 backdrop-blur-md shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
            Official Archive Portal
          </span>
        </div>
      </div>

      {/* 2. CENTER CONTENT (Rata Kanan-Kiri & Rata Atas-Bawah, Sempurna di Tengah Layar) */}
      <div className="flex-1 w-full max-w-sm flex flex-col items-center justify-center text-center my-auto px-4 z-10">
        
        {/* Logo Badge with Soft Cyan Glow */}
        <div className="relative mb-5 group">
          <div className="absolute -inset-2.5 bg-gradient-to-r from-blue-500/30 to-cyan-400/30 rounded-3xl blur-xl transition-all" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-cyan-400/35 p-3.5 shadow-[0_15px_35px_rgba(0,0,0,0.6),0_0_25px_rgba(6,182,212,0.25)] flex items-center justify-center backdrop-blur-md">
            <img 
              src="https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png"
              alt="Logo E-Arsip Al-Hicam"
              className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(6,182,212,0.5)]"
            />
          </div>
        </div>

        {/* Application Title & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
          E-ARSIP <span className="text-cyan-400">AL-HICAM</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-300/90 mt-1.5 font-medium max-w-[280px] leading-relaxed">
          Sistem Informasi Manajemen Digital SMP Al-Hikam
        </p>

        {/* Divider Accent */}
        <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto my-5 opacity-90" />

        {/* Loading Progress & Dynamic Label */}
        <div className="flex flex-col items-center gap-3 w-full max-w-[240px]">
          {/* Progress Track */}
          <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden border border-cyan-500/30 p-[1.5px] shadow-inner">
            <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full animate-splash-fill" />
          </div>

          {/* Loading Subtext */}
          <div className="flex items-center gap-2 text-cyan-200 text-xs font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Sedang memuat sistem e-arsip...</span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM FOOTER (Fixed in bottom flow) */}
      <div className="w-full flex-shrink-0 flex flex-col items-center justify-center text-center space-y-1 opacity-70 pb-2 z-10">
        <p className="text-[10px] text-slate-400 font-mono tracking-wider">
          v1.0 • Secure Enterprise Architecture
        </p>
        <p className="text-[9px] text-slate-500">
          SMP Al-Hikam Bangkalan © 2026
        </p>
      </div>
    </div>
  );
}
