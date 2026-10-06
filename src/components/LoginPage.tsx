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
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-4 bg-[#080E21] relative overflow-hidden font-['Poppins']">
      
      {/* Background Building with low opacity */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-15"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920')` }}
      />

      {/* Ambient Glowing Blobs */}
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card Glassmorphism - Fixed Height & Dimension Lock for Desktop & Mobile */}
      <div className="relative z-10 w-full max-w-[410px] min-h-[580px] sm:min-h-[600px] bg-[#0F172A]/90 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(6,182,212,0.15)] my-auto animate-scaleUp flex flex-col justify-between">
        
        <div>
          {/* Header with Logo */}
          <div className="text-center mb-4 sm:mb-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2 relative">
              <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-lg" />
              <img 
                src="https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png" 
                alt="Logo SMP Al-Hikam" 
                className="w-full h-full object-contain relative z-10 drop-shadow-[0_4px_10px_rgba(6,182,212,0.4)]"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
              E-ARSIP <span className="text-cyan-400">AL-HICAM</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Sistem Informasi Manajemen Digital SMP Al-Hikam</p>
            <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-cyan-400 to-transparent mx-auto mt-2" />
          </div>

          {/* Reserved Fixed Alert Slot (Prevents card from jumping/expanding when messages appear) */}
          <div className="min-h-[48px] mb-3 flex items-center justify-center">
            {errorMessage ? (
              <div className="w-full p-2.5 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2 animate-bounce">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            ) : resetSuccessMsg ? (
              <div className="w-full p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span className="truncate">{resetSuccessMsg}</span>
              </div>
            ) : sessionNotice ? (
              <div className="w-full p-2.5 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{sessionNotice}</span>
              </div>
            ) : null}
          </div>

          {/* Form Login (Secured against browser password leak warnings) */}
          <form 
            onSubmit={handleSubmit} 
            autoComplete="off" 
            data-lpignore="true" 
            data-form-type="other"
            className="space-y-3.5"
          >
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email / Username</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 w-4 h-4 text-cyan-400 pointer-events-none" />
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
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-cyan-400 pointer-events-none" />
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
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-cyan-400 transition-colors p-1"
                title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Options: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-900 w-3.5 h-3.5"
              />
              <span>Ingat saya</span>
            </label>
            <button
              type="button"
              onClick={handleOpenResetModal}
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
            >
              Lupa sandi?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_4px_16px_rgba(6,182,212,0.35)] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
        <div className="mt-3.5 p-2 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[10px] sm:text-[11px] text-cyan-300 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span>Portal Resmi E-Arsip • Masuk dengan Akun Terdaftar</span>
        </div>

        {/* Divider */}
        <div className="relative my-3.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/60" />
          </div>
          <div className="relative flex justify-center text-[9px] uppercase font-bold text-slate-400">
            <span className="bg-[#0F172A] px-2.5 tracking-wider">ATAU</span>
          </div>
        </div>

        </div>

        {/* Google Workspace Button */}
        <button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          className="w-full py-2.5 px-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Login Google Workspace</span>
        </button>
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
