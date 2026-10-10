import React, { useEffect, useState } from 'react';

interface MobileSplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export default function MobileSplashScreen({ onComplete, durationMs = 1750 }: MobileSplashScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out slightly before completion
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(durationMs - 350, 800));

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
      className={`fixed inset-0 z-50 flex flex-col justify-between items-center bg-gradient-to-b from-[#0F172A] via-[#080E21] to-[#040817] text-white px-6 py-10 transition-opacity duration-350 ease-out select-none ${
        isFadingOut ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 2rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)'
      }}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Branding Pill */}
      <div className="relative z-10 opacity-80">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-cyan-500/20 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[10px] font-semibold tracking-wider text-cyan-300 uppercase">
            Official Archive Portal
          </span>
        </div>
      </div>

      {/* Center Branding Area (Positioned slightly towards upper center) */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto -mt-6">
        {/* Logo with Soft Cyan Aura */}
        <div className="relative mb-5 group">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/30 to-cyan-400/30 rounded-3xl blur-xl transition-all" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-cyan-400/30 p-3 shadow-[0_15px_35px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center backdrop-blur-md">
            <img 
              src="https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png"
              alt="Logo E-Arsip Al-Hicam"
              className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(6,182,212,0.5)]"
            />
          </div>
        </div>

        {/* Application Title */}
        <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
          E-ARSIP <span className="text-cyan-400">AL-HICAM</span>
        </h1>
        <p className="text-[11.5px] text-slate-400 mt-1 font-medium max-w-[260px] leading-relaxed">
          Sistem Informasi Manajemen Digital SMP Al-Hikam
        </p>

        {/* Divider Accent */}
        <div className="h-0.5 w-14 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto my-4" />

        {/* Loading Progress & Label */}
        <div className="flex flex-col items-center gap-3 w-full max-w-[220px]">
          {/* Progress Track */}
          <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden border border-cyan-500/25 p-[1px] shadow-inner">
            <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full animate-splash-fill" />
          </div>

          {/* Loading Subtext */}
          <div className="flex items-center gap-2 text-cyan-200/90 text-[11px] font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Sedang memuat sistem e-arsip...</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="relative z-10 text-center space-y-1 opacity-70">
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
