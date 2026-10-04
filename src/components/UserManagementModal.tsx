import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Camera, 
  Lock, 
  Eye, 
  EyeOff, 
  Mail, 
  User, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Save,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { addAuditLog, DB_KEYS, getAvatarForUser, saveAvatarForUser } from '../data/mockDatabase';
import { syncAllUsersToSupabase, saveSingleUserToSupabase, deleteUserFromSupabase, fetchUsersFromSupabase } from '../supabase';

export interface SystemUser {
  id: string;
  name: string;
  email: string; // Used as username/email
  role: string;
  status: 'Aktif' | 'Nonaktif';
  password?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
}

export const INITIAL_SYSTEM_USERS: SystemUser[] = [
  { 
    id: 'master-superadmin', 
    name: 'Solikhin Mbolo', 
    email: 'superadmin', 
    role: 'Super Administrator', 
    status: 'Aktif', 
    password: 'superadmin123',
    isSuperAdmin: true 
  }
];

export function getStoredUserList(): SystemUser[] {
  try {
    const raw = localStorage.getItem('EARSIP_USER_LIST');
    if (!raw) {
      localStorage.setItem('EARSIP_USER_LIST', JSON.stringify(INITIAL_SYSTEM_USERS));
      return INITIAL_SYSTEM_USERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem('EARSIP_USER_LIST', JSON.stringify(INITIAL_SYSTEM_USERS));
      return INITIAL_SYSTEM_USERS;
    }

    // Pastikan akun utama Solikhin Mbolo selalu ada di list
    let fullList = parsed;
    const hasMaster = parsed.some(u => u.id === 'master-superadmin' || (u.email || '').toLowerCase() === 'superadmin');
    if (!hasMaster) {
      fullList = [INITIAL_SYSTEM_USERS[0], ...parsed];
    }

    // Enrich avatars with persistent storage
    return fullList.map(u => ({
      ...u,
      avatarUrl: (u.avatarUrl && !u.avatarUrl.includes('ui-avatars.com')) 
        ? u.avatarUrl 
        : getAvatarForUser(u.email, u.name)
    }));
  } catch {
    return INITIAL_SYSTEM_USERS;
  }
}

export function saveStoredUserList(users: SystemUser[]) {
  try {
    localStorage.setItem('EARSIP_USER_LIST', JSON.stringify(users));
  } catch (err) {
    console.warn('Failed to save user list:', err);
  }
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { email: string; name: string; role: string; avatarUrl?: string };
  onUpdateCurrentUser: (updatedUser: { email: string; name: string; role: string; avatarUrl?: string }) => void;
}

export default function UserManagementModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateCurrentUser
}: UserManagementModalProps) {
  const [users, setUsers] = useState<SystemUser[]>(() => getStoredUserList());

  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form states for editing / creating
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Administrator Arsip');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [formPassword, setFormPassword] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedRls, setCopiedRls] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isCurrentSuperAdmin = Boolean(
    currentUser.role === 'Super Administrator' || 
    currentUser.email.toLowerCase() === 'superadmin' ||
    (currentUser as any).isSuperAdmin
  );

  // Refresh and auto-sync user list every time modal is opened
  useEffect(() => {
    if (isOpen) {
      const localList = getStoredUserList();
      setUsers(localList);

      if (!isCurrentSuperAdmin) {
        const foundSelf = localList.find(u => 
          u.email.toLowerCase().replace(/^@/, '') === currentUser.email.toLowerCase().replace(/^@/, '') ||
          u.name.toLowerCase() === currentUser.name.toLowerCase()
        ) || localList[0];

        if (foundSelf) {
          handleStartEdit(foundSelf);
        }
      }

      fetchUsersFromSupabase().then(async cloudUsers => {
        if (cloudUsers && cloudUsers.length > 0) {
          const merged = [...cloudUsers];
          let hasNewLocal = false;

          // Periksa apakah ada akun lokal yang belum masuk ke Supabase (misal: akun baru yang baru ditambah)
          for (const loc of localList) {
            const cleanLocEmail = loc.email.toLowerCase().replace(/^@/, '');
            const found = merged.find(m => m.email.toLowerCase().replace(/^@/, '') === cleanLocEmail);
            if (!found) {
              merged.push(loc);
              hasNewLocal = true;
              await saveSingleUserToSupabase(loc);
            }
          }

          setUsers(merged);
          saveStoredUserList(merged);

          if (!isCurrentSuperAdmin && !editingUser) {
            const foundSelfCloud = merged.find(u => 
              u.email.toLowerCase().replace(/^@/, '') === currentUser.email.toLowerCase().replace(/^@/, '') ||
              u.name.toLowerCase() === currentUser.name.toLowerCase()
            );
            if (foundSelfCloud) {
              handleStartEdit(foundSelfCloud);
            }
          }
        } else if (localList.length > 0) {
          // Jika tabel Supabase masih kosong, unggah semua akun lokal
          await syncAllUsersToSupabase(localList);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleManualSyncSupabase = async () => {
    setIsSyncing(true);
    setMessage({ type: 'success', text: 'Menyinkronkan seluruh akun ke Supabase Cloud...' });
    const res = await syncAllUsersToSupabase(users);
    setIsSyncing(false);
    if (res.success) {
      setMessage({ type: 'success', text: `✓ Berhasil menyinkronkan ${res.count} akun langsung ke tabel public.users Supabase!` });
      setTimeout(() => setMessage(null), 4000);
    } else {
      setMessage({ type: 'error', text: `Gagal sinkronisasi: ${res.error || 'Periksa koneksi Supabase'}` });
    }
  };

  if (!isOpen) return null;

  const handleStartEdit = (user: SystemUser) => {
    const isSelf = user.email.toLowerCase().replace(/^@/, '') === currentUser.email.toLowerCase().replace(/^@/, '') ||
      (currentUser.email.toLowerCase() === 'superadmin' && (user.id === 'master-superadmin' || user.email.toLowerCase() === 'superadmin'));

    if (!isCurrentSuperAdmin && !isSelf) {
      setMessage({ type: 'error', text: '🔒 Akses Ditolak: Anda hanya berhak mengedit profil akun Anda sendiri.' });
      return;
    }

    setEditingUser(user);
    setIsCreatingNew(false);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormStatus(user.status);
    setFormPassword(user.password || '');
    setFormAvatar(user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563eb&color=fff&size=120`);
    setMessage(null);
  };

  const handleStartCreate = () => {
    if (!isCurrentSuperAdmin) {
      setMessage({ type: 'error', text: '🔒 Akses Ditolak: Hanya Super Administrator yang berhak menambah akun pengguna baru.' });
      return;
    }

    setEditingUser(null);
    setIsCreatingNew(true);
    setFormName('');
    setFormEmail('');
    setFormRole('Administrator Arsip');
    setFormStatus('Aktif');
    setFormPassword('');
    setFormAvatar('https://ui-avatars.com/api/?name=User+Baru&background=2563eb&color=fff&size=120');
    setMessage(null);
  };

  const handleCancelForm = () => {
    if (!isCurrentSuperAdmin) {
      onClose();
      return;
    }
    setEditingUser(null);
    setIsCreatingNew(false);
    setMessage(null);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        // Compress avatar image using HTML5 Canvas to keep storage lightweight (~15KB)
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 300;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setFormAvatar(compressed);
            setMessage(null);
          } else {
            setFormAvatar(dataUrl);
            setMessage(null);
          }
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    const cleanEmail = formEmail.trim().toLowerCase();

    if (!cleanName) {
      setMessage({ type: 'error', text: 'Nama Lengkap wajib diisi.' });
      return;
    }
    if (!cleanEmail) {
      setMessage({ type: 'error', text: 'Username / Email login wajib diisi.' });
      return;
    }

    if (isCreatingNew && !formPassword) {
      setMessage({ type: 'error', text: 'Password wajib diisi untuk akun baru.' });
      return;
    }

    if (formPassword && formPassword.length < 3) {
      setMessage({ type: 'error', text: 'Password minimal 3 karakter.' });
      return;
    }

    // Cek duplikasi username (kecuali user yang sedang diedit)
    const duplicate = users.find(u => 
      u.email.toLowerCase() === cleanEmail && (!editingUser || u.id !== editingUser.id)
    );
    if (duplicate) {
      setMessage({ type: 'error', text: `Username "${cleanEmail}" sudah digunakan oleh akun lain.` });
      return;
    }

    let updatedList: SystemUser[];

    if (isCreatingNew) {
      // 1. TAMBAH AKUN BARU (Tidak akan pernah merubah akun Solikhin Mbolo / master)
      const newUser: SystemUser = {
        id: `usr-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        role: formRole,
        status: formStatus,
        password: formPassword,
        avatarUrl: formAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=2563eb&color=fff&size=120`,
        isSuperAdmin: false // Hanya Solikhin Mbolo yang master superadmin
      };

      updatedList = [...users, newUser];

      addAuditLog({
        aksi: 'UPDATE',
        kategori: 'Manajemen Pengguna',
        subjek: cleanName,
        detail: `Penambahan akun baru: ${cleanName} (${cleanEmail} - ${formRole})`,
        operator: currentUser.email,
        status: 'SUCCESS'
      });

    } else if (editingUser) {
      // 2. EDIT AKUN SPESIFIK BERDASARKAN ID
      const isMasterAdmin = editingUser.id === 'master-superadmin' || editingUser.email.toLowerCase() === 'superadmin' || editingUser.isSuperAdmin;
      const isSelf = isMasterAdmin || editingUser.email.toLowerCase() === currentUser.email.toLowerCase() || cleanEmail === currentUser.email.toLowerCase();

      updatedList = users.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            name: cleanName,
            email: cleanEmail,
            role: isMasterAdmin ? 'Super Administrator' : formRole,
            status: isMasterAdmin ? 'Aktif' : formStatus,
            avatarUrl: formAvatar,
            password: formPassword || u.password
          };
        }
        return u;
      });

      // Jika yang diedit adalah akun yang sedang aktif (termasuk Solikhin Mbolo / Superadmin):
      if (isSelf) {
        const updatedSelf = {
          name: cleanName,
          email: cleanEmail,
          role: isMasterAdmin ? 'Super Administrator' : formRole,
          avatarUrl: formAvatar
        };

        onUpdateCurrentUser(updatedSelf);

        // Update akun admin login di localStorage
        const newAdminAcc = {
          name: cleanName,
          email: cleanEmail,
          role: isMasterAdmin ? 'Super Administrator' : formRole,
          avatarUrl: formAvatar,
          password: formPassword || (editingUser.password || 'superadmin123')
        };
        localStorage.setItem('EARSIP_ADMIN_ACCOUNT', JSON.stringify(newAdminAcc));
        localStorage.setItem(DB_KEYS.AUTH_USER, JSON.stringify(updatedSelf));
      }

      addAuditLog({
        aksi: 'UPDATE',
        kategori: 'Manajemen Pengguna',
        subjek: cleanName,
        detail: `Pembaruan akun ${cleanName} (${cleanEmail} - ${formRole})`,
        operator: currentUser.email,
        status: 'SUCCESS'
      });
    } else {
      return;
    }

    const oldEmail = editingUser ? editingUser.email : cleanEmail;

    if (formAvatar) {
      saveAvatarForUser(cleanEmail, formAvatar);
      saveAvatarForUser(oldEmail, formAvatar);
      if (editingUser?.id === 'master-superadmin' || cleanEmail === 'superadmin') {
        saveAvatarForUser('superadmin', formAvatar);
      }
    }

    setUsers(updatedList);
    saveStoredUserList(updatedList);
    setIsSaving(true);
    setMessage({ type: 'success', text: 'Menyimpan akun...' });

    const startTime = Date.now();

    // Simpan langsung ke Supabase Cloud (tabel public.users)
    const supaRes = await saveSingleUserToSupabase({
      name: cleanName,
      email: cleanEmail,
      role: isCreatingNew ? formRole : ((editingUser?.id === 'master-superadmin' || editingUser?.isSuperAdmin) ? 'Super Administrator' : formRole),
      password: formPassword || (editingUser?.password || 'superadmin123'),
      avatarUrl: formAvatar
    }, oldEmail);

    // Sinkronkan seluruh list ke database Supabase
    await syncAllUsersToSupabase(updatedList);

    const elapsed = Date.now() - startTime;
    if (elapsed < 2000) {
      await new Promise(r => setTimeout(r, 2000 - elapsed));
    }

    setIsSaving(false);

    // Broadcast ke semua tab
    window.dispatchEvent(new Event('storage'));

    if (supaRes.success) {
      setMessage({ type: 'success', text: `✓ Akun ${cleanName} berhasil disimpan dan langsung masuk ke tabel Supabase!` });
    } else {
      setMessage({ type: 'error', text: `Pemberitahuan: Akun tersimpan di aplikasi (Notice Supabase: ${supaRes.error || 'cek koneksi'})` });
    }

    setTimeout(() => {
      handleCancelForm();
    }, 900);
  };

  const handleDeleteUser = (user: SystemUser) => {
    if (user.id === 'master-superadmin' || user.email === 'superadmin' || user.isSuperAdmin) {
      alert('Akun Super Administrator Utama tidak dapat dihapus demi keamanan sistem!');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun ${user.name} (${user.email})?`)) {
      return;
    }

    const filtered = users.filter(u => u.id !== user.id);
    setUsers(filtered);
    saveStoredUserList(filtered);

    // Hapus langsung dari database Supabase
    deleteUserFromSupabase(user.email).catch(() => {});
    syncAllUsersToSupabase(filtered).catch(() => {});

    addAuditLog({
      aksi: 'DELETE',
      kategori: 'Manajemen Pengguna',
      subjek: user.name,
      detail: `Penghapusan akun: ${user.name} (${user.email})`,
      operator: currentUser.email,
      status: 'WARNING'
    });

    setMessage({ type: 'success', text: `Akun ${user.name} berhasil dihapus dari sistem.` });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0F172A] border border-blue-500/30 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-2xl animate-scaleUp text-white relative flex flex-col max-h-[92vh]">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-60 h-20 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Manajemen Pengguna</h3>
              <p className="text-xs text-slate-400">Daftar akun berwenang & hak akses sistem E-Arsip</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert Notification */}
        {message && (
          <div className={`p-3.5 mb-3 rounded-2xl text-xs font-medium space-y-2 animate-fadeIn relative z-10 ${
            message.type === 'success' 
              ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' 
              : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
          }`}>
            <div className="flex items-start gap-2.5">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">
                <span>{message.text}</span>
              </div>
            </div>

            {/* Special 1-Click Fix Button for Supabase RLS (Row Level Security) Error */}
            {message.type === 'error' && (message.text.includes('row-level security') || message.text.includes('RLS')) && (
              <div className="pt-2 border-t border-rose-800/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-rose-200">
                  ⚡ <strong>Solusi 1 Detik:</strong> Salin perintah SQL ini lalu jalankan di menu <strong>SQL Editor</strong> di Supabase Anda:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;\nDROP POLICY IF EXISTS "Public Full Access Users" ON public.users;\nCREATE POLICY "Public Full Access Users" ON public.users FOR ALL USING (true) WITH CHECK (true);');
                    setCopiedRls(true);
                    setTimeout(() => setCopiedRls(false), 4000);
                  }}
                  className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {copiedRls ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRls ? '✓ SQL Perbaikan RLS Tersalin!' : '📋 Salin SQL Buka Izin RLS'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Content: FORM or LIST */}
        <div className="flex-1 overflow-y-auto pr-1 relative z-10">
          
          {/* ============================================================== */}
          {/* A. EDIT / CREATE FORM                                          */}
          {/* ============================================================== */}
          {(editingUser || isCreatingNew) ? (
            <form onSubmit={handleSaveUser} className="space-y-4 animate-fadeIn">
              
              <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Daftar</span>
                </button>
                <span className="text-xs font-bold text-cyan-400">
                  {isCreatingNew ? 'Tambah Akun Baru' : `Edit Akun: ${editingUser?.name}`}
                </span>
              </div>

              {/* Avatar Uploader */}
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="relative group">
                  <img
                    src={formAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formName || 'User')}&background=2563eb&color=fff&size=100`}
                    alt="Avatar"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-[8px] font-bold">Ubah</span>
                  </button>
                </div>

                <div className="flex-1 space-y-1.5">
                  <span className="text-xs font-bold text-white block">Foto Profil Pengguna</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Unggah Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormAvatar(`https://ui-avatars.com/api/?name=${encodeURIComponent(formName || 'User')}&background=2563eb&color=fff&size=100`)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-all cursor-pointer border border-slate-700"
                    >
                      Inisial
                    </button>
                  </div>
                </div>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Solikhin Mbolo"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Email / Username */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  Username / ID Login
                </label>
                <input
                  type="text"
                  required
                  disabled={!isCurrentSuperAdmin && !isCreatingNew}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="User Name"
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono disabled:opacity-60 disabled:bg-slate-950"
                />
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Peran / Hak Akses
                  </label>
                  <select
                    value={formRole}
                    disabled={!isCurrentSuperAdmin || editingUser?.id === 'master-superadmin' || editingUser?.email === 'superadmin'}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium disabled:opacity-60 disabled:bg-slate-950"
                  >
                    <option value="Super Administrator">Super Administrator (Akses Penuh)</option>
                    <option value="Administrator Arsip">Administrator Arsip</option>
                    <option value="Admin Guru & TIK">Admin Guru & TIK</option>
                    <option value="Staf Tata Usaha">Staf Tata Usaha</option>
                    <option value="Operator Madrasah">Operator Madrasah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Status Akun
                  </label>
                  <select
                    value={formStatus}
                    disabled={!isCurrentSuperAdmin || editingUser?.id === 'master-superadmin' || editingUser?.email === 'superadmin'}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium disabled:opacity-60 disabled:bg-slate-950"
                  >
                    <option value="Aktif">Aktif (Bisa Login)</option>
                    <option value="Nonaktif">Nonaktif (Ditangguhkan)</option>
                  </select>
                </div>
              </div>

              {!isCurrentSuperAdmin && (
                <p className="text-[10px] text-amber-400/90 flex items-center gap-1 mt-1 font-medium">
                  <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span>Peran & Status Akun hanya dapat diubah oleh Super Administrator.</span>
                </p>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    {isCreatingNew ? 'Kata Sandi / Password *' : 'Kata Sandi / Password'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Masukkan password akun"
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? 'Menyimpan ke Supabase...' : 'Simpan Akun'}</span>
                </button>
              </div>

            </form>
          ) : (
            /* ============================================================== */
            /* B. USERS LIST VIEW                                             */
            /* ============================================================== */
            <div className="space-y-3">
              
              {/* Header Action Bar */}
              <div className="flex items-center justify-between mb-3 px-0.5">
                <span className="text-xs font-semibold text-slate-400">
                  Total {users.length} Akun Terdaftar
                </span>
                {isCurrentSuperAdmin ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleManualSyncSupabase}
                      disabled={isSyncing}
                      className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                      title="Kirim & Sinkronkan semua akun ke tabel users di Supabase"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Menyinkronkan...' : '⚡ Sinkronkan Supabase'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartCreate}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Tambah Pengguna</span>
                    </button>
                  </div>
                ) : (
                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Akses Mandiri (Edit Profil Anda)</span>
                  </span>
                )}
              </div>

              {/* Users Cards */}
              {users.map((u) => {
                const isAnda = u.id === 'master-superadmin' || 
                  u.email.toLowerCase().replace(/^@/, '') === currentUser.email.toLowerCase().replace(/^@/, '') ||
                  (currentUser.email.toLowerCase() === 'superadmin' && u.email.toLowerCase() === 'superadmin');

                const canEdit = isCurrentSuperAdmin || isAnda;
                const canDelete = isCurrentSuperAdmin && u.id !== 'master-superadmin' && u.email.toLowerCase() !== 'superadmin';

                return (
                  <div 
                    key={u.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isAnda 
                        ? 'bg-gradient-to-r from-blue-950/60 to-slate-900 border-blue-500/40 shadow-sm shadow-blue-500/10' 
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <img
                        src={getAvatarForUser(u.email, u.name)}
                        alt={u.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=2563eb&color=fff&size=100`;
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-xs sm:text-sm font-bold text-white truncate">{u.name}</strong>
                          {isAnda && (
                            <span className="px-1.5 py-0.2 bg-blue-500/20 text-cyan-300 border border-blue-500/40 rounded text-[9px] font-bold">
                              Anda
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block truncate">
                          @{u.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden xs:block">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 block">
                          {u.role}
                        </span>
                        <span className={`text-[10px] font-semibold block mt-0.5 ${u.status === 'Aktif' ? 'text-emerald-400' : 'text-slate-500'}`}>
                          ● {u.status}
                        </span>
                      </div>

                      {/* Action Buttons: Edit & Delete */}
                      <div className="flex items-center gap-1">
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(u)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm group"
                            title={isAnda ? "Edit Profil Saya" : `Edit Akun ${u.name}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="p-2 rounded-xl bg-slate-800/40 text-slate-600 border border-slate-800/80 cursor-not-allowed" title="Hanya Super Administrator yang berhak mengedit akun pengguna lain">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition-all cursor-pointer shadow-sm"
                            title={`Hapus Akun ${u.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        {!editingUser && !isCreatingNew && (
          <div className="pt-4 border-t border-slate-800 mt-4 relative z-10 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Perubahan tersinkron otomatis ke sistem
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Tutup Panel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
