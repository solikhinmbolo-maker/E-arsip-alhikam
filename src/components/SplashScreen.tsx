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
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md transition-all duration-600 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Exact Center Luxury Rotating Loading Animation - Free Floating Without Black Background */}
      <div className="relative flex items-center justify-center">
        
        {/* Soft Ambient Glow Aura */}
        <div className="absolute w-52 h-52 rounded-full bg-gradient-to-tr from-blue-600/20 via-cyan-500/25 to-blue-400/15 blur-3xl pointer-events-none" />

        {/* 1. Outer Bold Orbit Ring (Smooth Clockwise 2.6s) */}
        <div 
          className="w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center animate-[spin_2.6s_linear_infinite] drop-shadow-[0_4px_16px_rgba(0,0,0,0.65)] drop-shadow-[0_0_20px_rgba(37,99,235,0.7)]"
          style={{ willChange: 'transform' }}
        >
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="vibrantOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.2" />
                <stop offset="35%" stopColor="#2563EB" stopOpacity="0.85" />
                <stop offset="70%" stopColor="#0284C7" stopOpacity="1" />
                <stop offset="90%" stopColor="#00D2FF" stopOpacity="1" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Subtle guide track */}
            <circle 
              cx="50" 
              cy="50" 
              r="42" 
              fill="none" 
              stroke="#64748B" 
              strokeWidth="3" 
              strokeOpacity="0.3" 
            />

            {/* Bold Primary Gradient Arc (Stroke Width 7px) */}
            <circle 
              cx="50" 
              cy="50" 
              r="42" 
              fill="none" 
              stroke="url(#vibrantOuterGrad)" 
              strokeWidth="7" 
              strokeLinecap="round" 
              strokeDasharray="190 80" 
            />

            {/* Leading High-Glow White Pearl */}
            <circle 
              cx="92" 
              cy="50" 
              r="5" 
              fill="#FFFFFF" 
              filter="drop-shadow(0 0 6px #00D2FF)" 
            />
          </svg>
        </div>

        {/* 2. Inner Reverse Orbit Ring (Smooth Counter-Clockwise 1.8s) */}
        <div 
          className="absolute w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center animate-[spin_1.8s_linear_infinite_reverse] drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
          style={{ willChange: 'transform' }}
        >
          <svg className="w-full h-full" viewBox="0 0 60 60">
            <defs>
              <linearGradient id="vibrantInnerGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.2" />
                <stop offset="60%" stopColor="#06B6D4" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Inner Bold Gradient Arc (Stroke Width 5px) */}
            <circle 
              cx="30" 
              cy="30" 
              r="22" 
              fill="none" 
              stroke="url(#vibrantInnerGrad)" 
              strokeWidth="5" 
              strokeLinecap="round" 
              strokeDasharray="85 55" 
            />
          </svg>
        </div>

        {/* 3. Center Glowing Crystal Core */}
        <div className="absolute flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 rounded-full bg-cyan-400/40 animate-ping" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_#00D2FF,0_0_24px_#2563EB]" />
        </div>

      </div>
    </div>
  );
}
