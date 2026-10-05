import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Palette, 
  FileText, 
  Cloud, 
  Shield, 
  Info, 
  Check, 
  Save, 
  RefreshCw, 
  Database, 
  Upload, 
  Download, 
  Copy, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Key, 
  HardDrive, 
  Sliders, 
  Lock, 
  Globe, 
  Sparkles, 
  HelpCircle,
  FolderLock,
  Stamp,
  Printer,
  FileSpreadsheet,
  Layers,
  Cpu,
  Server
} from 'lucide-react';
import { 
  GoogleSyncConfig, 
  getStoredSyncConfig, 
  saveStoredSyncConfig,
  testGoogleWebhook,
  getAllRawArsip,
  getStoredMasterSiswa,
  getStoredMasterGuru
} from '../data/mockDatabase';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  testSupabaseConnection, 
  testSupabaseStorage, 
  SUPABASE_SQL_SCHEMA, 
  sanitizeSupabaseUrl, 
  syncAllArsipToSupabase,
  syncConfigToServer
} from '../supabase';

interface SettingsViewProps {
  currentUser: {
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
  };
  onOpenUserManagement?: () => void;
  userPrefs: {
    fontSize: string;
    language: string;
    density: string;
    themeAccent: string;
    animations: boolean;
  };
  onSavePref: (key: string, value: any) => void;
}

export default function SettingsView({
  currentUser,
  onOpenUserManagement,
  userPrefs,
  onSavePref
}: SettingsViewProps) {
  const isSuperAdmin = currentUser?.role === 'Super Administrator' || 
    currentUser?.email?.toLowerCase().replace(/^@/, '') === 'superadmin' || 
    currentUser?.email?.toLowerCase() === 'admin@alhicam.sch.id';

  const [activeTab, setActiveTab] = useState<'instansi' | 'tampilan' | 'kearsipan' | 'cloud' | 'keamanan' | 'tentang'>('instansi');

  // School / Institution Settings State (Saved in LocalStorage)
  const [schoolProfile, setSchoolProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('EARSIP_SCHOOL_PROFILE');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      namaSekolah: 'SMP AL-HIKAM',
      npsn: '20554988',
      nss: '202052402001',
      akreditasi: 'A (Unggul)',
      kepalaSekolah: 'Ahmad Zaenuri, S.Pd., M.Pd.',
      nipKepalaSekolah: '19780512 200501 1 008',
      alamat: 'Jl. Raya Al-Hikam No. 09, Burneh, Bangkalan, Jawa Timur',
      kodePos: '69121',
      telepon: '(031) 3095112',
      email: 'smp.alhikam@sch.id',
      website: 'www.smpalhikam.sch.id',
      tahunPelajaranAktif: '2026/2027',
      semesterAktif: 'Ganjil'
    };
  });

  // Archiving & Legalization Policy State
  const [archivePolicy, setArchivePolicy] = useState(() => {
    try {
      const saved = localStorage.getItem('EARSIP_ARCHIVE_POLICY');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      nomorFormatLegalisir: 'ALH/LEG/{YYYY}/{NO}',
      retensiSampahHari: '60',
      maxUploadMb: '25',
      autoWatermark: true,
      watermarkText: 'E-ARSIP RESMI SMP AL-HIKAM - DOKUMEN TERVERIFIKASI',
      formatAllowed: ['PDF', 'JPG', 'JPEG', 'PNG', 'DOCX'],
      autoAuditLogging: true
    };
  });

  const [toastMessage, setToastMessage] = useState('');

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleSaveSchoolProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('EARSIP_SCHOOL_PROFILE', JSON.stringify(schoolProfile));
      showNotification('✓ Profil & Identitas Lembaga berhasil disimpan!');
    } catch {
      showNotification('Gagal menyimpan profil.');
    }
  };

  const handleSaveArchivePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('EARSIP_ARCHIVE_POLICY', JSON.stringify(archivePolicy));
      showNotification('✓ Kebijakan Kearsipan & Legalisir berhasil diperbarui!');
    } catch {
      showNotification('Gagal menyimpan kebijakan.');
    }
  };

  // Cloud & Supabase Config
  const [supabaseConfig, setSupabaseConfig] = useState(() => getStoredSupabaseConfig());
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<string>('');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [isSyncingToSupabase, setIsSyncingToSupabase] = useState(false);
  const [copiedSqlSchema, setCopiedSqlSchema] = useState(false);

  // Google Sync Config
  const [syncConfig, setSyncConfig] = useState<GoogleSyncConfig>(() => getStoredSyncConfig());
  const [testConnStatus, setTestConnStatus] = useState<string>('');
  const [isTestingGAS, setIsTestingGAS] = useState(false);

  const handleSaveSupabaseConfig = (url: string, anonKey: string) => {
    const updated = { ...supabaseConfig, url: url.trim(), anonKey: anonKey.trim(), isEnabled: true };
    setSupabaseConfig(updated);
    saveStoredSupabaseConfig(updated);
  };

  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestStatus('Menghubungkan ke Supabase PostgreSQL Cloud...');
    const cleanUrl = sanitizeSupabaseUrl(supabaseConfig.url);
    if (cleanUrl !== supabaseConfig.url) {
      handleSaveSupabaseConfig(cleanUrl, supabaseConfig.anonKey);
    }
    const result = await testSupabaseConnection();
    setSupabaseTestStatus(result.message);
    if (result.success) {
      syncConfigToServer(supabaseConfig);
    }
    setIsTestingSupabase(false);
  };

  const handleTestSupabaseStorage = async () => {
    setIsTestingStorage(true);
    setSupabaseTestStatus('Menguji akses ke Supabase Storage (bucket "arsip")...');
    const result = await testSupabaseStorage();
    setSupabaseTestStatus(result.message);
    setIsTestingStorage(false);
  };

  const handleSyncLocalToSupabase = async () => {
    setIsSyncingToSupabase(true);
    setSupabaseTestStatus('Mengunggah data Arsip, Siswa, dan Guru ke Supabase Cloud...');
    const localItems = getAllRawArsip();
    const resArsip = await syncAllArsipToSupabase(localItems);
    setSupabaseTestStatus(resArsip.success ? `✓ Berhasil menyinkronkan ${resArsip.count} arsip ke Supabase!` : `Gagal sinkronisasi: ${resArsip.error || 'Terjadi kesalahan'}`);
    setIsSyncingToSupabase(false);
  };

  const handleTestGAS = async () => {
    setIsTestingGAS(true);
    setTestConnStatus('Menguji koneksi ke Webhook Google Apps Script...');
    const res = await testGoogleWebhook(syncConfig.webhookUrl);
    setTestConnStatus(res.message);
    setIsTestingGAS(false);
  };

  const handleExportFullJsonBackup = () => {
    try {
      const backupData = {
        app: 'E-Arsip Al-Hicam Enterprise',
        exportedAt: new Date().toISOString(),
        schoolProfile,
        archivePolicy,
        masterSiswa: getStoredMasterSiswa(),
        masterGuru: getStoredMasterGuru(),
        arsipItems: getAllRawArsip()
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BACKUP_EARSIP_ALHICAM_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('✓ Berhasil mengekspor cadangan database lengkap (.JSON)!');
    } catch {
      showNotification('Gagal mengekspor data.');
    }
  };

  // Local Storage Quota diagnostics
  const [storageUsage, setStorageUsage] = useState({ usedKb: 0, count: 0 });
  useEffect(() => {
    let totalBytes = 0;
    let keysCount = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          totalBytes += key.length + val.length;
          keysCount++;
        }
      }
    } catch {}
    setStorageUsage({ usedKb: Math.round(totalBytes / 1024), count: keysCount });
  }, [activeTab]);

  const navTabs = [
    { id: 'instansi', label: 'Identitas Sekolah', icon: Building2, desc: 'Profil instansi & KOP' },
    { id: 'tampilan', label: 'Tampilan & UI', icon: Palette, desc: 'Font, tema & kerapatan' },
    { id: 'kearsipan', label: 'Kebijakan Arsip', icon: FileText, desc: 'Legalisir, format & retensi' },
    { id: 'cloud', label: 'Server & Cloud', icon: Cloud, desc: 'Supabase & Sinkronisasi', badge: isSuperAdmin ? 'Pro' : undefined },
    { id: 'keamanan', label: 'Keamanan & Sesi', icon: Shield, desc: 'Masa sesi & enkripsi' },
    { id: 'tentang', label: 'Info Sistem', icon: Info, desc: 'Versi, diagnostik & lisensi' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-blue-500/40 flex items-center gap-3 text-xs font-semibold animate-scaleUp">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 flex-shrink-0">
              <Settings className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Pengaturan & Konfigurasi Sistem
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold border border-blue-200">
                  Enterprise v2.4
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Pusat kendali parameter sekolah, tata kelola kearsipan digital, integrasi server cloud, dan keamanan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleExportFullJsonBackup}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-slate-200"
              title="Unduh Salinan Cadangan Database"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Backup Database</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu (Pills Bar) */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100 overflow-x-auto pb-1 scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-600/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: IDENTITAS SEKOLAH / INSTANSI                                       */}
      {/* ========================================================================= */}
      {activeTab === 'instansi' && (
        <form onSubmit={handleSaveSchoolProfile} className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Identitas Resmi Lembaga / Sekolah</h2>
                  <p className="text-xs text-slate-500">Data ini digunakan untuk header cetak laporan, legalisir, dan kop dokumen resmi.</p>
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Identitas</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Satuan Pendidikan</label>
                <input
                  type="text"
                  value={schoolProfile.namaSekolah}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, namaSekolah: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">NPSN (Nomor Pokok Sekolah Nasional)</label>
                <input
                  type="text"
                  value={schoolProfile.npsn}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, npsn: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">NSS (Nomor Statistik Sekolah)</label>
                <input
                  type="text"
                  value={schoolProfile.nss}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, nss: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Status Akreditasi</label>
                <input
                  type="text"
                  value={schoolProfile.akreditasi}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, akreditasi: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  value={schoolProfile.kepalaSekolah}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, kepalaSekolah: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">NIP / NUPTK Kepala Sekolah</label>
                <input
                  type="text"
                  value={schoolProfile.nipKepalaSekolah}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, nipKepalaSekolah: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Alamat Lengkap Lembaga</label>
                <input
                  type="text"
                  value={schoolProfile.alamat}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, alamat: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kode Pos</label>
                <input
                  type="text"
                  value={schoolProfile.kodePos}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, kodePos: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tahun Pelajaran Berjalan</label>
                <select
                  value={schoolProfile.tahunPelajaranAktif}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, tahunPelajaranAktif: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="2025/2026">2025/2026</option>
                  <option value="2026/2027">2026/2027 (Aktif)</option>
                  <option value="2027/2028">2027/2028</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Resmi Kearsipan</label>
                <input
                  type="email"
                  value={schoolProfile.email}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">No. Telepon / WhatsApp TU</label>
                <input
                  type="text"
                  value={schoolProfile.telepon}
                  onChange={(e) => setSchoolProfile({ ...schoolProfile, telepon: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TAMPILAN & ANTARMUKA (UI / PREFERENSI)                             */}
      {/* ========================================================================= */}
      {activeTab === 'tampilan' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Preferensi Tampilan & Kenyamanan Pengguna</h2>
              <p className="text-xs text-slate-500">Sesuaikan ukuran font, kerapatan tabel, dan gaya antarmuka sesuai kenyamanan perangkat Anda.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Font Size */}
            <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Ukuran Huruf / Skala Font Antarmuka
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'small', label: 'Kecil', desc: '12px Kompak' },
                  { id: 'normal', label: 'Sedang', desc: '14px Standar' },
                  { id: 'large', label: 'Besar', desc: '16px Jelas' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      onSavePref('fontSize', f.id);
                      showNotification(`✓ Ukuran font diubah ke ${f.label}`);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      userPrefs.fontSize === f.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{f.label}</span>
                      {userPrefs.fontSize === f.id && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={`text-[10px] block mt-1 ${userPrefs.fontSize === f.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      {f.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table Density */}
            <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Kerapatan Baris Tabel (Table Spacing)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'compact', label: 'Ringkas', desc: 'Maksimal data' },
                  { id: 'standard', label: 'Standar', desc: 'Optimal visual' },
                  { id: 'spacious', label: 'Luas', desc: 'Jarak renggang' }
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      onSavePref('density', d.id);
                      showNotification(`✓ Kerapatan tabel diatur ke ${d.label}`);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      userPrefs.density === d.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{d.label}</span>
                      {userPrefs.density === d.id && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={`text-[10px] block mt-1 ${userPrefs.density === d.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      {d.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Animations Toggle */}
            <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <strong className="text-xs font-bold text-slate-800 block">Efek Transisi & Animasi Halus</strong>
                <span className="text-[11px] text-slate-500">Memberikan animasi halus saat perpindahan menu dan modal dialog.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSavePref('animations', !userPrefs.animations);
                  showNotification(`✓ Animasi ${!userPrefs.animations ? 'diaktifkan' : 'dinonaktifkan'}`);
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  userPrefs.animations ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  userPrefs.animations ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Language */}
            <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div>
                <strong className="text-xs font-bold text-slate-800 block">Bahasa Sistem Utama</strong>
                <span className="text-[11px] text-slate-500">Standar bahasa resmi tata naskah dinas kearsipan.</span>
              </div>
              <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs">
                <span>🇮🇩</span>
                <span>Bahasa Indonesia (Resmi)</span>
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KEBIJAKAN KEARSIPAN & LEGALISIR                                    */}
      {/* ========================================================================= */}
      {activeTab === 'kearsipan' && (
        <form onSubmit={handleSaveArchivePolicy} className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Stamp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Kebijakan Kearsipan & Legalisir Digital</h2>
                  <p className="text-xs text-slate-500">Atur pola penomoran legalisir, batasan berkas, dan masa retensi sampah arsip.</p>
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Kebijakan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Format Nomor Registrasi Legalisir</label>
                <input
                  type="text"
                  value={archivePolicy.nomorFormatLegalisir}
                  onChange={(e) => setArchivePolicy({ ...archivePolicy, nomorFormatLegalisir: e.target.value })}
                  placeholder="ALH/LEG/{YYYY}/{NO}"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">Gunakan tag <code>{'{YYYY}'}</code> untuk tahun dan <code>{'{NO}'}</code> untuk urutan otomatis.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Masa Retensi Tong Sampah</label>
                <select
                  value={archivePolicy.retensiSampahHari}
                  onChange={(e) => setArchivePolicy({ ...archivePolicy, retensiSampahHari: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="30">30 Hari (Standar Pengarsipan)</option>
                  <option value="60">60 Hari (Rekomendasi Sekolah)</option>
                  <option value="90">90 Hari (Maksimal)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Berkas di tong sampah dapat dipulihkan sebelum batas masa retensi berakhir.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Batas Ukuran Upload per Dokumen</label>
                <select
                  value={archivePolicy.maxUploadMb}
                  onChange={(e) => setArchivePolicy({ ...archivePolicy, maxUploadMb: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="10">10 MB (Optimal Mobile)</option>
                  <option value="25">25 MB (Standar Dokumen PDF)</option>
                  <option value="50">50 MB (Dokumen Beresolusi Tinggi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Teks Watermark Dokumen Terverifikasi</label>
                <input
                  type="text"
                  value={archivePolicy.watermarkText}
                  onChange={(e) => setArchivePolicy({ ...archivePolicy, watermarkText: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SERVER CLOUD & SINKRONISASI DATABASE (PRO)                         */}
      {/* ========================================================================= */}
      {activeTab === 'cloud' && (
        <div className="space-y-6">
          
          {/* Security Notice for Non-Superadmin */}
          {!isSuperAdmin && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-center gap-3 text-amber-800">
              <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-xs">
                Halaman konfigurasi server cloud hanya dapat dimodifikasi oleh <strong>Super Administrator</strong>.
              </p>
            </div>
          )}

          {/* Supabase Primary Cloud Server Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Database Utama: Supabase PostgreSQL Cloud</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Semua data arsip, buku induk siswa, dewan guru, dan file fisik tersinkronisasi terpusat.</p>
                </div>
              </div>
            </div>

            {/* Supabase Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Supabase Project URL</label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={supabaseConfig.url}
                  onChange={(e) => handleSaveSupabaseConfig(e.target.value, supabaseConfig.anonKey)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  placeholder="https://your-project.supabase.co"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Supabase Anon Key</label>
                <input
                  type="password"
                  disabled={!isSuperAdmin}
                  value={supabaseConfig.anonKey}
                  onChange={(e) => handleSaveSupabaseConfig(supabaseConfig.url, e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            {isSuperAdmin && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSupabaseConnection}
                    disabled={isTestingSupabase}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                    <span>{isTestingSupabase ? 'Menguji...' : '⚡ Uji Database Cloud'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSupabaseStorage}
                    disabled={isTestingStorage}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingStorage ? 'animate-spin' : ''}`} />
                    <span>{isTestingStorage ? 'Menguji...' : '📦 Uji Storage Bucket (arsip)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncLocalToSupabase}
                    disabled={isSyncingToSupabase}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className={`w-3.5 h-3.5 ${isSyncingToSupabase ? 'animate-spin' : ''}`} />
                    <span>{isSyncingToSupabase ? 'Menyinkronkan...' : '📤 Sinkronkan Data Lokal ke Cloud'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                    setCopiedSqlSchema(true);
                    setTimeout(() => setCopiedSqlSchema(false), 3000);
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {copiedSqlSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedSqlSchema ? '✓ Script SQL Tersalin!' : '📋 Salin Skema SQL'}</span>
                </button>
              </div>
            )}

            {supabaseTestStatus && (
              <div className={`p-3.5 rounded-xl text-xs font-medium ${
                supabaseTestStatus.includes('✓') 
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                  : 'bg-amber-950/80 text-amber-300 border border-amber-800'
              }`}>
                {supabaseTestStatus}
              </div>
            )}
          </div>

          {/* Google Apps Script Backup Engine */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Google Apps Script Webhook (Backup Engine)</h3>
                  <p className="text-xs text-slate-500">Opsional: Pencadangan otomatis ke Google Sheets / Google Drive sekolah.</p>
                </div>
              </div>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleTestGAS}
                  disabled={isTestingGAS}
                  className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-blue-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingGAS ? 'animate-spin' : ''}`} />
                  <span>{isTestingGAS ? 'Menguji...' : 'Tes Webhook Google'}</span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">URL Webhook Google Apps Script</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={syncConfig.webhookUrl}
                onChange={(e) => {
                  const updated = { ...syncConfig, webhookUrl: e.target.value.trim() };
                  setSyncConfig(updated);
                  saveStoredSyncConfig(updated);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                placeholder="https://script.google.com/macros/s/.../exec"
              />
            </div>

            {testConnStatus && (
              <div className={`p-3.5 rounded-xl text-xs font-medium ${
                testConnStatus.includes('✓') || testConnStatus.includes('Berhasil')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {testConnStatus}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: KEAMANAN & MANAJEMEN SESI                                         */}
      {/* ========================================================================= */}
      {activeTab === 'keamanan' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Keamanan Akses & Manajemen Sesi</h2>
                <p className="text-xs text-slate-500">Konfigurasi perlindungan sesi login dan autentikasi multi-peran.</p>
              </div>
            </div>

            {onOpenUserManagement && isSuperAdmin && (
              <button
                onClick={onOpenUserManagement}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Buka Manajemen User</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Session Card */}
            <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Auto-Logout Saat Tidak Aktif</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Secara otomatis mengunci sesi dan mengeluarkan akun jika tidak ada aktivitas mouse/keyboard selama 30 menit demi keamanan data sekolah.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Status Proteksi Sesi:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  ✓ Aktif (30 Menit)
                </span>
              </div>
            </div>

            {/* Encryption Standard */}
            <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Enkripsi Storage & Berkas</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seluruh file PDF dan foto lampiran dienkripsi menggunakan protokol standar cloud <strong>AES-256</strong> saat tersimpan di Supabase Storage.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Tingkat Enkripsi:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  AES-256 Enterprise
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: INFORMASI SISTEM & DIAGNOSTIK                                      */}
      {/* ========================================================================= */}
      {activeTab === 'tentang' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Informasi Sistem & Diagnostik Kearsipan</h2>
                <p className="text-xs text-slate-500">Spesifikasi versi aplikasi, penggunaan memori lokal, dan status lisensi.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Versi E-Arsip</span>
                <h3 className="text-sm font-bold text-slate-900">E-Arsip Al-Hicam v2.4.0</h3>
                <p className="text-xs text-slate-500">Build 2026.10 • Production Stable</p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Penyimpanan Lokal (Cache)</span>
                <h3 className="text-sm font-bold text-slate-900">{storageUsage.usedKb} KB Terpakai</h3>
                <p className="text-xs text-slate-500">{storageUsage.count} Entri tersimpan di browser</p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Lisensi Lembaga</span>
                <h3 className="text-sm font-bold text-emerald-700">SMP AL-HIKAM Official</h3>
                <p className="text-xs text-slate-500">Hak Cipta Dilindungi Undang-Undang</p>
              </div>

            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Butuh Bantuan Teknis atau Panduan?</h4>
                <p className="text-xs text-slate-300 mt-1">Tim Administrator TU SMP Al-Hikam siap membantu operasional sistem kearsipan.</p>
              </div>
              <span className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/20">
                Bantuan Teknis Aktif
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
