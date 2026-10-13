import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldAlert, ArrowRight, CheckCircle2, KeyRound, Clock, ShieldCheck, HelpCircle, Send, User, ArrowLeft } from 'lucide-react';
import { getStoredUserList, saveStoredUserList } from './UserManagementModal';
import { fetchUsersFromSupabase, authenticateFromSupabaseDirect } from '../supabase';
import { saveAvatarForUser, addAuditLog } from '../data/mockDatabase';

interface LoginPageProps {
  onLoginSuccess: (user: { email: string; name: string; role: string; avatarUrl?: string }) => void;
  sessionNotice?: string;
}

export default function LoginPage({ onLoginSuccess, sessionNotice }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Modals for Reset Password via WhatsApp Admin (081998245759)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetName, setResetName] = useState('');
  const [resetNewUsername, setResetNewUsername] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Sync users from Supabase Cloud on mount & on cross-tab changes
  useEffect(() => {
    fetchUsersFromSupabase().then(cloudUsers => {
      if (cloudUsers && cloudUsers.length > 0) {
        const localList = getStoredUserList();
        // Merge cloud users with local users
        const merged = [...localList];
        cloudUsers.forEach(cu => {
          const idx = merged.findIndex(m => m.email.toLowerCase() === cu.email.toLowerCase() || m.id === cu.id);
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...cu };
          } else {
            merged.push(cu);
          }
        });
        saveStoredUserList(merged);
      }
    }).catch(() => {});
  }, []);

  const [loadingStatus, setLoadingStatus] = useState('Memverifikasi...');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const rawInput = email.trim();
    const cleanInput = rawInput.toLowerCase();
    const strippedInput = cleanInput.replace(/^@/, '');

    if (!cleanInput || !password) {
      setErrorMessage('Silakan isi Username dan Password terlebih dahulu.');
      return;
    }

    setLoading(true);
    setLoadingStatus('Menghubungkan...');

    // Smooth professional 2.5s loading experience as requested
    const startTime = Date.now();

    // 1. Cek langsung ke database Supabase Cloud
    const directResult = await authenticateFromSupabaseDirect(email, password);
    
    // Ensure min 2200ms delay for professional loading feel
    const elapsed = Date.now() - startTime;
    if (elapsed < 2200) {
      setLoadingStatus('Memverifikasi...');
      await new Promise(r => setTimeout(r, 2200 - elapsed));
    }

    if (directResult.success && directResult.user) {
      if (directResult.user.avatarUrl) {
        saveAvatarForUser(directResult.user.email, directResult.user.avatarUrl);
        if (directResult.user.email === 'superadmin' || directResult.user.id === 'master-superadmin') {
          saveAvatarForUser('superadmin', directResult.user.avatarUrl);
          saveAvatarForUser('master-superadmin', directResult.user.avatarUrl);
        }
      }
      setLoadingStatus('Mengalihkan...');
      await new Promise(r => setTimeout(r, 400));
      setLoading(false);
      addAuditLog({
        aksi: 'AUTH',
        kategori: 'Autentikasi Pengguna',
        subjek: directResult.user.name || directResult.user.email,
        detail: `Masuk (Login) ke sistem dengan peran "${directResult.user.role}"`,
        operator: directResult.user.email,
        status: 'SUCCESS'
      });
      onLoginSuccess(directResult.user);
      return;
    }

    // 2. Ambil akun dari local dan coba tarik versi terbaru dari Supabase
    let userList = getStoredUserList();
    try {
      const cloudUsers = await fetchUsersFromSupabase();
      if (cloudUsers && cloudUsers.length > 0) {
        const merged = [...userList];
        cloudUsers.forEach(cu => {
          if (cu.avatarUrl) {
            saveAvatarForUser(cu.email, cu.avatarUrl);
          }
          const idx = merged.findIndex(m => m.email.toLowerCase() === cu.email.toLowerCase() || m.id === cu.id);
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...cu };
          } else {
            merged.push(cu);
          }
        });
        userList = merged;
        saveStoredUserList(merged);
      }
    } catch {}

    setLoading(false);

    // Cari kecocokan akun (mendukung berbagai variasi input username)
    const matchedUser = userList.find((u: any) => {
      const uEmail = (u.email || '').trim().toLowerCase();
      const uEmailStripped = uEmail.replace(/^@/, '');
      const uName = (u.name || '').trim().toLowerCase();

      const matchEmail = (
        uEmail === cleanInput ||
        uEmailStripped === strippedInput ||
        uEmail === strippedInput ||
        uEmailStripped === cleanInput
      );

      const matchName = uName === cleanInput || uName === strippedInput;

      const matchSuperAdmin = (
        (cleanInput === 'superadmin' || strippedInput === 'superadmin' || cleanInput === 'superadmin@01' || strippedInput === 'superadmin@01') &&
        (u.id === 'master-superadmin' || u.isSuperAdmin || uEmail === 'superadmin' || uEmail === 'superadmin@01')
      );

      return matchEmail || matchName || matchSuperAdmin;
    });

    // Validasi akun
    if (matchedUser) {
      if (matchedUser.status === 'Nonaktif') {
        setErrorMessage('Akun Anda sedang dinonaktifkan oleh Super Administrator.');
        return;
      }

      const validPassword = matchedUser.password || (matchedUser.id === 'master-superadmin' ? 'superadmin123' : '');

      if (password.trim() === (validPassword || '').trim()) {
        addAuditLog({
          aksi: 'AUTH',
          kategori: 'Autentikasi Pengguna',
          subjek: matchedUser.name || matchedUser.email,
          detail: `Masuk (Login) ke sistem dengan peran "${matchedUser.role}"`,
          operator: matchedUser.email,
          status: 'SUCCESS'
        });
        onLoginSuccess({
          email: matchedUser.email,
          name: matchedUser.name,
          role: matchedUser.role,
          avatarUrl: matchedUser.avatarUrl
        });
        return;
      } else {
        setErrorMessage('Username / Paswword tidak sesuai, silahkan coba lagi..!');
        return;
      }
    }

    setErrorMessage('Username / Paswword tidak sesuai, silahkan coba lagi..!');
  };

  const handleOpenResetModal = () => {
    setResetStep(1);
    setResetName('');
    setResetNewUsername('');
    setResetNewPassword('');
    setShowResetModal(true);
  };

  const handleKirimWA = (e: React.FormEvent) => {
    e.preventDefault();
    const namaClean = resetName.trim();
    const usernameClean = resetNewUsername.trim();
    const passwordClean = resetNewPassword.trim();

    if (!namaClean || !usernameClean || !passwordClean) {
      alert('Silakan lengkapi Nama, New User Name, dan New Password.');
      return;
    }

    const pesan = `*PERMOHONAN RESET AKUN E-ARSIP AL-HIKAM*

Mohon maaf Admin E-ARSIP AL-HIKAM, saya ingin mengajukan permohonan reset / perubahan password akun E-Arsip karena saya lupa password akun saya.

📌 *RINCIAN PENGAJUAN AKUN:*
• *Nama*                 : ${namaClean}
• *New User Name*        : ${usernameClean}
• *New Password*         : ${passwordClean}

Mohon bantuan Admin untuk melakukan proses reset / perubahan password akun tersebut. Terima kasih.

_# Digital E Arsip Alhicam_`;

    const waPhone = '6281994285759';
    const waUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(pesan)}`;

    window.open(waUrl, '_blank');

    setShowResetModal(false);
    setResetSuccessMsg('Permohonan telah dibuat dan dialihkan langsung ke WhatsApp Admin (081994285759).');
    setTimeout(() => setResetSuccessMsg(''), 7000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 sm:p-6 bg-[#080E21] relative overflow-hidden font-['Poppins']">
      
      {/* Background Building with low opacity - Desktop only so mobile has 100% fullscreen card with zero background leakage */}
      <div 
        className="hidden sm:block absolute inset-0 bg-cover bg-center pointer-events-none opacity-20"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920')` }}
      />

      {/* Ambient Glowing Blobs - Desktop only */}
      <div className="hidden sm:block absolute top-1/3 left-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="hidden sm:block absolute bottom-1/3 right-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card: Fullscreen on mobile (no background leaks, edge-to-edge), centered floating card on desktop */}
      <div className="relative z-10 w-full min-h-screen sm:min-h-0 sm:max-w-[420px] bg-gradient-to-b from-white/95 via-slate-50/90 to-sky-100/85 sm:bg-gradient-to-b sm:from-white/92 sm:via-slate-50/85 sm:to-sky-100/80 backdrop-blur-3xl border-0 sm:border border-white/80 rounded-none sm:rounded-3xl p-5 sm:p-7 pt-7 sm:pt-7 pb-7 sm:pb-7 shadow-none sm:shadow-[0_25px_60px_-15px_rgba(3,10,30,0.45),0_0_40px_rgba(2,132,199,0.14),inset_0_1px_2px_rgba(255,255,255,0.95),inset_0_-2px_6px_rgba(30,58,138,0.08)] my-0 sm:my-auto flex flex-col justify-center overflow-x-hidden overflow-y-auto">
        
        {/* ============================================================== */}
        {/* HARMONIZING VECTOR TEXTURES (VISIBLE ON MOBILE & DESKTOP)      */}
        {/* ============================================================== */}
        
        {/* A. Full-Card Geometric Security Grid Texture */}
        <div className="block absolute inset-0 pointer-events-none z-0 opacity-[0.06]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cardGridPattern" width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#1E3A8A" strokeWidth="0.75" />
                <circle cx="22" cy="22" r="0.75" fill="#0284C7" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cardGridPattern)" />
          </svg>
        </div>

        {/* B. Flowing Topographic Contour Lines */}
        <div className="block absolute inset-0 pointer-events-none z-0 opacity-20 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 400 600" fill="none" preserveAspectRatio="none">
            {/* Upper Flowing Contours */}
            <path d="M-40 130 C70 170 160 110 250 160 C340 210 390 150 450 180" stroke="url(#topoGrad1)" strokeWidth="1.5" />
            <path d="M-40 155 C80 195 170 135 265 185 C350 230 400 175 460 205" stroke="url(#topoGrad1)" strokeWidth="1" strokeDasharray="3 4" />
            
            {/* Mid-Lower Horizon Contours */}
            <path d="M-40 370 C70 420 170 360 260 410 C350 460 410 410 460 440" stroke="url(#topoGrad2)" strokeWidth="1.25" />
            <path d="M-40 395 C80 445 180 385 275 435 C360 480 420 435 470 465" stroke="url(#topoGrad2)" strokeWidth="0.85" strokeDasharray="4 5" />
            
            <defs>
              <linearGradient id="topoGrad1" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1D4ED8" />
                <stop offset="0.5" stopColor="#0284C7" />
                <stop offset="1" stopColor="#38BDF8" />
              </linearGradient>
              <linearGradient id="topoGrad2" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0284C7" />
                <stop offset="0.5" stopColor="#2563EB" />
                <stop offset="1" stopColor="#0F172A" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 1. Top-Left Flowing Vector Waves */}
        <div className="block absolute -top-1 -left-1 w-28 h-28 sm:w-32 sm:h-32 pointer-events-none z-0">
          <svg className="w-full h-full" viewBox="0 0 120 120" fill="none">
            <path d="M0 0 L95 0 C70 20 55 45 40 70 C28 90 12 105 0 115 Z" fill="url(#blueWaveGradTL)" opacity="0.95" />
            <path d="M0 0 L70 0 C52 18 42 38 28 60 C15 80 5 95 0 100 Z" fill="url(#cyanWaveGradTL)" opacity="0.85" />
            <path d="M0 15 C18 28 32 52 40 78 C48 98 42 110 30 125 L0 125 Z" fill="url(#softBlueGradTL)" opacity="0.3" />
            <defs>
              <linearGradient id="blueWaveGradTL" x1="0" y1="0" x2="95" y2="95" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1D4ED8" />
                <stop offset="1" stopColor="#0284C7" />
              </linearGradient>
              <linearGradient id="cyanWaveGradTL" x1="0" y1="0" x2="70" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0284C7" />
                <stop offset="1" stopColor="#38BDF8" />
              </linearGradient>
              <linearGradient id="softBlueGradTL" x1="0" y1="20" x2="40" y2="120" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60A5FA" />
                <stop offset="1" stopColor="#BFDBFE" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 2. Bottom-Right Flowing Vector Waves */}
        <div className="block absolute -bottom-1 -right-1 w-28 h-28 sm:w-32 sm:h-32 pointer-events-none z-0">
          <svg className="w-full h-full" viewBox="0 0 120 120" fill="none">
            <path d="M120 120 L25 120 C50 100 65 75 80 50 C92 30 108 15 120 5 Z" fill="url(#blueWaveGradBR)" opacity="0.95" />
            <path d="M120 120 L50 120 C68 102 78 82 92 60 C105 40 115 25 120 20 Z" fill="url(#cyanWaveGradBR)" opacity="0.85" />
            <defs>
              <linearGradient id="blueWaveGradBR" x1="120" y1="120" x2="25" y2="25" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1D4ED8" />
                <stop offset="1" stopColor="#0284C7" />
              </linearGradient>
              <linearGradient id="cyanWaveGradBR" x1="120" y1="120" x2="50" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0284C7" />
                <stop offset="1" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 3. Top-Right Dot-Matrix Grid Accent */}
        <div className="grid absolute top-4 right-4 sm:top-5 sm:right-5 grid-cols-5 gap-1 sm:gap-1.5 opacity-25 pointer-events-none z-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-blue-600" />
          ))}
        </div>

        {/* 4. Lower-Left Subtle Curved Linework */}
        <div className="block absolute bottom-8 -left-8 w-36 h-36 sm:w-40 sm:h-40 pointer-events-none z-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
            <path d="M0 20 Q40 40 55 75 T110 105" stroke="#2563EB" strokeWidth="1" />
            <path d="M0 35 Q40 55 55 85 T110 115" stroke="#2563EB" strokeWidth="1" />
            <path d="M0 50 Q40 70 55 95 T110 125" stroke="#0284C7" strokeWidth="1" />
          </svg>
        </div>

        <div className="relative z-10 w-full my-auto">
          {/* Header with Logo - Prominent, positioned higher up */}
          <div className="text-center mb-2.5 sm:mb-3">
            <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto mb-1.5 relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />
              <img 
                src="https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png" 
                alt="Logo SMP Al-Hikam" 
                className="w-full h-full object-contain relative z-10 drop-shadow-[0_6px_14px_rgba(37,99,235,0.3)]"
              />
            </div>
            <h1 className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 leading-tight">
              E-ARSIP <span className="text-blue-600">AL-HICAM</span>
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-600 font-semibold mt-0.5">Sistem Informasi Manajemen Digital SMP Al-Hikam</p>
            
            {/* Pill Accent underneath subtitle */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="w-6 h-1 rounded-full bg-cyan-400" />
              <span className="w-3 h-1 rounded-full bg-blue-600" />
              <span className="w-1.5 h-1 rounded-full bg-blue-400" />
            </div>
          </div>

          {/* Reserved Fixed Alert Slot (Prevents card from jumping/expanding when messages appear) */}
          <div className="min-h-[40px] mb-2 sm:mb-2.5 flex items-center justify-center">
            {errorMessage ? (
              <div className="w-full p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 animate-bounce">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            ) : resetSuccessMsg ? (
              <div className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span className="truncate">{resetSuccessMsg}</span>
              </div>
            ) : sessionNotice ? (
              <div className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5 animate-fadeIn">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{sessionNotice}</span>
              </div>
            ) : null}
          </div>

          {/* Form Login */}
          <form 
            onSubmit={handleSubmit} 
            autoComplete="off" 
            data-lpignore="true" 
            data-form-type="other"
            className="space-y-3 sm:space-y-3.5"
          >
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              <span className="inline mr-1 text-blue-600">👤</span>
              Email / Username
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4.5 h-4.5 text-blue-600 pointer-events-none" />
              <input
                type="text"
                name="portal_user_id"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                data-lpignore="true"
                data-form-type="other"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="User Name"
                required
                className="w-full pl-10.5 pr-3.5 py-2.5 sm:py-3 bg-white border-2 border-blue-500/80 hover:border-blue-600 focus:border-blue-600 rounded-xl sm:rounded-2xl text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 transition-all font-semibold shadow-xs shadow-blue-500/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              <span className="inline mr-1 text-blue-600">🔒</span>
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4.5 h-4.5 text-blue-600 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="portal_auth_code"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi"
                required
                className="w-full pl-10.5 pr-10 py-2.5 sm:py-3 bg-white border-2 border-blue-500/80 hover:border-blue-600 focus:border-blue-600 rounded-xl sm:rounded-2xl text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 transition-all font-semibold shadow-xs shadow-blue-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-blue-600 transition-colors p-1"
                title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Options: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-[11.5px] pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-semibold select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white w-3.5 h-3.5"
              />
              <span>Ingat saya</span>
            </label>
            <button
              type="button"
              onClick={handleOpenResetModal}
              className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-semibold"
            >
              Lupa sandi?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-400 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-[0_8px_20px_rgba(37,99,235,0.3)] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{loadingStatus}</span>
              </span>
            ) : (
              <>
                <span>MASUK KE PORTAL</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Portal Info Pill */}
        <div className="mt-2.5 p-2 rounded-xl sm:rounded-2xl bg-sky-50/80 border border-blue-200/70 text-[10.5px] sm:text-[11px] text-blue-700 font-semibold text-center flex items-center justify-center gap-1.5 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span>Portal Resmi E-Arsip • Masuk dengan Akun Terdaftar</span>
        </div>

        {/* Divider ATAU - Positioned closely with Google button */}
        <div className="relative my-2.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200/90" />
          </div>
          <div className="relative flex justify-center text-[9px] uppercase font-bold text-slate-500">
            <span className="bg-slate-100/95 text-slate-500 px-2.5 tracking-wider rounded font-semibold">ATAU</span>
          </div>
        </div>

        {/* Google Workspace Button - Positioned immediately below ATAU */}
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs rounded-xl sm:rounded-2xl text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Login Google Workspace</span>
        </button>
        </div>
      </div>

      {/* Modal Reset Password Flow (Step 1: Pertanyaan, Step 2: Form Input -> WA Admin 081998245759) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-7 max-w-md w-full text-center shadow-2xl animate-scaleUp">
            
            {resetStep === 1 ? (
              /* STEP 1: Pertanyaan Konfirmasi */
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                  <HelpCircle className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Permohonan Perubahan Akun
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-semibold px-2">
                    "Apakah anda ingin mengajukan perubahan username / pw kepada admin"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetStep(2)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Konfirmasi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* STEP 2: Form Nama, New User Name, New Password */
              <div className="space-y-4 text-left">
                <div className="text-center space-y-1 pb-1">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center mx-auto mb-2">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Form Pengajuan Perubahan Akun</h3>
                  <p className="text-[11px] text-slate-400">Silakan isi data pengajuan perubahan akun di bawah ini:</p>
                </div>

                <form onSubmit={handleKirimWA} className="space-y-3.5">
                  {/* Nama */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Nama :</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={resetName}
                      onChange={(e) => setResetName(e.target.value)}
                      placeholder="Masukkan Nama Lengkap Anda"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-medium"
                    />
                  </div>

                  {/* New User Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      <span>New User Name :</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={resetNewUsername}
                      onChange={(e) => setResetNewUsername(e.target.value)}
                      placeholder="Masukkan Username Baru Yang Diinginkan"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>New pasword :</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Masukkan Password Baru Yang Diinginkan"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>KIRIM</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal Google Workspace Info */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">Pemberitahuan SSO</h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Fitur Single Sign-On (SSO) Google Workspace SMP Al-Hikam terintegrasi dengan domain resmi sekolah (@alhicam.sch.id). Untuk saat ini silakan login menggunakan akun administrator utama.
            </p>
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Oke, Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
