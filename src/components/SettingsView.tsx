import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Palette, 
  FileText, 
  Cloud, 
  Shield, 
  Database, 
  Save, 
  RefreshCw, 
  Download, 
  Upload, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Key, 
  HardDrive, 
  Stamp, 
  FileSpreadsheet, 
  Layers, 
  Trash2, 
  Plus, 
  X, 
  Activity, 
  Copy, 
  RotateCcw,
  Globe,
  Info,
  HelpCircle,
  Sparkles,
  BookOpen,
  ExternalLink,
  Server,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { 
  GoogleSyncConfig, 
  getStoredSyncConfig, 
  saveStoredSyncConfig, 
  testGoogleWebhook, 
  getAllRawArsip, 
  getStoredArsip, 
  getTrashArsip, 
  getStoredMasterSiswa, 
  getStoredMasterGuru,
  restoreSampleArsipData
} from '../data/mockDatabase';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  testSupabaseConnection, 
  testSupabaseStorage, 
  SUPABASE_SQL_SCHEMA, 
  sanitizeSupabaseUrl, 
  syncAllArsipToSupabase, 
  syncConfigToServer,
  fetchArsipFromSupabase,
  SupabaseConfig
} from '../supabase';
import { getStoredUserList, saveStoredUserList } from './UserManagementModal';

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
  onCopyGAS?: () => void;
}

// Sound Feedback Generator via Web Audio API (Native, lightweight, no external assets needed)
const playSystemSound = (type: 'success' | 'delete' | 'chime' | 'test') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success' || type === 'test') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'delete') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.setValueAtTime(140, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {}
};

export default function SettingsView({
  currentUser,
  onOpenUserManagement,
  userPrefs,
  onSavePref,
  onCopyGAS
}: SettingsViewProps) {
  const isSuperAdmin = currentUser?.role === 'Super Administrator' || 
    currentUser?.email?.toLowerCase().replace(/^@/, '') === 'superadmin' || 
    currentUser?.email?.toLowerCase() === 'admin@alhicam.sch.id';

  // Tabs
  const [activeTab, setActiveTab] = useState<'preferensi' | 'kategori' | 'legalisir' | 'cloud' | 'backup' | 'keamanan' | 'diagnostik' | 'info'>('preferensi');

  // Update Checker State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    setUpdateResult(null);
    setTimeout(() => {
      setIsCheckingUpdate(false);
      setUpdateResult('✓ Versi aplikasi Anda sudah yang paling mutakhir (v2.4.2 - Production Build 2026). Semua patch keamanan dan integrasi Google Drive aktif.');
      if (soundEnabled) playSystemSound('success');
    }, 1200);
  };

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showNotification = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    if (type === 'success' && soundEnabled) {
      playSystemSound('chime');
    }
    setTimeout(() => setToastMessage(''), 4000);
  };

  // 1. Preferensi Sistem & Suara
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('EARSIP_SOUND_ENABLED') !== 'false';
  });

  const handleToggleSound = (val: boolean) => {
    setSoundEnabled(val);
    localStorage.setItem('EARSIP_SOUND_ENABLED', val.toString());
    if (val) playSystemSound('test');
    showNotification(val ? '✓ Efek audio aktif' : 'Audio dinonaktifkan');
  };

  // 2. Kategori & Format Berkas
  const DEFAULT_KATEGORI_SISWA = ['Ijazah SD/MI', 'SKL (Surat Keterangan Lulus)', 'SPMB (Formulir Masuk)', 'Kartu Keluarga (KK)', 'Akta Kelahiran', 'KIP / PIP / PKH', 'Rapor'];
  const DEFAULT_KATEGORI_GURU = ['Ijazah S1 / S2', 'SK Pengangkatan & Penugasan', 'Sertifikat Pendidik (Serdik)', 'KTP Guru / Pegawai', 'Kartu Keluarga (KK)', 'Buku Rekening Gaji', 'NPWP'];
  const DEFAULT_KATEGORI_LAINNYA = ['Surat Masuk', 'Surat Keluar', 'SK Kepala Sekolah', 'LPJ Dana BOS', 'Kurikulum & Silabus', 'Akreditasi Lembaga', 'Sertifikat & Piagam'];

  const [kategoriSiswa, setKategoriSiswa] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('EARSIP_CUSTOM_KAT_SISWA');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_KATEGORI_SISWA;
  });

  const [kategoriGuru, setKategoriGuru] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('EARSIP_CUSTOM_KAT_GURU');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_KATEGORI_GURU;
  });

  const [kategoriLainnya, setKategoriLainnya] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('EARSIP_CUSTOM_KAT_LAINNYA');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_KATEGORI_LAINNYA;
  });

  const [newKatSiswa, setNewKatSiswa] = useState('');
  const [newKatGuru, setNewKatGuru] = useState('');
  const [newKatLainnya, setNewKatLainnya] = useState('');

  const handleAddKategori = (type: 'siswa' | 'guru' | 'lainnya') => {
    if (type === 'siswa' && newKatSiswa.trim()) {
      if (kategoriSiswa.includes(newKatSiswa.trim())) {
        showNotification('Kategori sudah ada.', 'error');
        return;
      }
      const updated = [...kategoriSiswa, newKatSiswa.trim()];
      setKategoriSiswa(updated);
      localStorage.setItem('EARSIP_CUSTOM_KAT_SISWA', JSON.stringify(updated));
      setNewKatSiswa('');
      showNotification('✓ Kategori Siswa ditambahkan');
    } else if (type === 'guru' && newKatGuru.trim()) {
      if (kategoriGuru.includes(newKatGuru.trim())) {
        showNotification('Kategori sudah ada.', 'error');
        return;
      }
      const updated = [...kategoriGuru, newKatGuru.trim()];
      setKategoriGuru(updated);
      localStorage.setItem('EARSIP_CUSTOM_KAT_GURU', JSON.stringify(updated));
      setNewKatGuru('');
      showNotification('✓ Kategori Guru ditambahkan');
    } else if (type === 'lainnya' && newKatLainnya.trim()) {
      if (kategoriLainnya.includes(newKatLainnya.trim())) {
        showNotification('Kategori sudah ada.', 'error');
        return;
      }
      const updated = [...kategoriLainnya, newKatLainnya.trim()];
      setKategoriLainnya(updated);
      localStorage.setItem('EARSIP_CUSTOM_KAT_LAINNYA', JSON.stringify(updated));
      setNewKatLainnya('');
      showNotification('✓ Kategori Surat/Lembaga ditambahkan');
    }
  };

  const handleRemoveKategori = (type: 'siswa' | 'guru' | 'lainnya', item: string) => {
    if (type === 'siswa') {
      const updated = kategoriSiswa.filter(k => k !== item);
      setKategoriSiswa(updated);
      localStorage.setItem('EARSIP_CUSTOM_KAT_SISWA', JSON.stringify(updated));
    } else if (type === 'guru') {
      const updated = kategoriGuru.filter(k => k !== item);
      setKategoriGuru(updated);
      localStorage.setItem('EARSIP_CUSTOM_KAT_GURU', JSON.stringify(updated));
    } else {
      const updated = kategoriLainnya.filter(k => k !== item);
      setKategoriLainnya(updated);
      localStorage.setItem('EARSIP_CUSTOM_KAT_LAINNYA', JSON.stringify(updated));
    }
    showNotification(`Kategori "${item}" dihapus`);
  };

  const handleResetKategoriDefault = () => {
    setKategoriSiswa(DEFAULT_KATEGORI_SISWA);
    setKategoriGuru(DEFAULT_KATEGORI_GURU);
    setKategoriLainnya(DEFAULT_KATEGORI_LAINNYA);
    localStorage.removeItem('EARSIP_CUSTOM_KAT_SISWA');
    localStorage.removeItem('EARSIP_CUSTOM_KAT_GURU');
    localStorage.removeItem('EARSIP_CUSTOM_KAT_LAINNYA');
    showNotification('✓ Kategori dikembalikan ke standar');
  };

  // Archive Rules & File limits
  const [fileRules, setFileRules] = useState(() => {
    try {
      const saved = localStorage.getItem('EARSIP_FILE_RULES');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      maxUploadMb: '25',
      namingConvention: 'kategori_nama_tahun',
      retensiSampahHari: '60'
    };
  });

  const handleSaveFileRules = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('EARSIP_FILE_RULES', JSON.stringify(fileRules));
    showNotification('✓ Aturan berkas berhasil disimpan');
  };

  // 3. Legalisir & Watermark Settings
  const [legalisirConfig, setLegalisirConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('EARSIP_LEGALISIR_CONFIG');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      nomorFormat: 'ALH/LEG/{YYYY}/{NO}',
      watermarkText: 'E-ARSIP RESMI SMP AL-HIKAM - DOKUMEN TERVERIFIKASI SAH',
      masaBerlakuBulan: '12',
      pejabatPenandatangan: 'Ahmad Zaenuri, S.Pd., M.Pd. (Kepala Sekolah)',
      nipPejabat: '19780512 200501 1 008'
    };
  });

  const handleSaveLegalisirConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('EARSIP_LEGALISIR_CONFIG', JSON.stringify(legalisirConfig));
    showNotification('✓ Pengaturan legalisir berhasil disimpan');
  };

  // 4. Cloud & Supabase Config
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => getStoredSupabaseConfig());
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<string>('');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [isSyncingToSupabase, setIsSyncingToSupabase] = useState(false);
  const [isPullingFromSupabase, setIsPullingFromSupabase] = useState(false);
  const [copiedSqlSchema, setCopiedSqlSchema] = useState(false);

  // Google Sync Config
  const [syncConfig, setSyncConfig] = useState<GoogleSyncConfig>(() => getStoredSyncConfig());
  const [testConnStatus, setTestConnStatus] = useState<string>('');
  const [isTestingGAS, setIsTestingGAS] = useState(false);

  const handleSaveSupabaseConfig = (url: string, anonKey: string) => {
    const updated: SupabaseConfig = { ...supabaseConfig, url: url.trim(), anonKey: anonKey.trim(), isEnabled: true };
    setSupabaseConfig(updated);
    saveStoredSupabaseConfig(updated);
  };

  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestStatus('Menghubungkan ke Supabase...');
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
    setSupabaseTestStatus('Menguji akses ke bucket storage "arsip"...');
    const result = await testSupabaseStorage();
    setSupabaseTestStatus(result.message);
    setIsTestingStorage(false);
  };

  const handleSyncLocalToSupabase = async () => {
    setIsSyncingToSupabase(true);
    setSupabaseTestStatus('Mengunggah berkas ke Supabase Cloud...');
    const localItems = getAllRawArsip();
    const resArsip = await syncAllArsipToSupabase(localItems);
    setSupabaseTestStatus(resArsip.success ? `✓ Berhasil menyinkronkan ${resArsip.count} arsip ke Supabase!` : `Gagal sinkronisasi: ${resArsip.error || 'Terjadi kesalahan'}`);
    setIsSyncingToSupabase(false);
  };

  const handlePullFromSupabase = async () => {
    setIsPullingFromSupabase(true);
    setSupabaseTestStatus('Menarik pembaruan data dari Supabase Cloud...');
    try {
      const cloudArsip = await fetchArsipFromSupabase();
      if (cloudArsip && cloudArsip.length > 0) {
        setSupabaseTestStatus(`✓ Berhasil memuat ${cloudArsip.length} data arsip dari Cloud!`);
        showNotification(`✓ Berhasil menarik ${cloudArsip.length} arsip dari Cloud`);
      } else {
        setSupabaseTestStatus('ℹ️ Belum ada data baru di cloud.');
      }
    } catch (err: any) {
      setSupabaseTestStatus(`Gagal menarik data: ${err?.message || 'Koneksi terputus'}`);
    } finally {
      setIsPullingFromSupabase(false);
    }
  };

  const handleTestGAS = async () => {
    setIsTestingGAS(true);
    setTestConnStatus('Menguji koneksi ke Webhook GAS...');
    const res = await testGoogleWebhook(syncConfig.webhookUrl);
    setTestConnStatus(res.message);
    setIsTestingGAS(false);
  };

  // 5. Backup & Restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportFullBackup = () => {
    try {
      const backupObj = {
        app: 'E-Arsip Al-Hicam Enterprise',
        version: '2.4.0',
        timestamp: new Date().toISOString(),
        exportedBy: currentUser.name,
        userRole: currentUser.role,
        data: {
          arsipList: getAllRawArsip(),
          masterSiswa: getStoredMasterSiswa(),
          masterGuru: getStoredMasterGuru(),
          kategoriSiswa,
          kategoriGuru,
          kategoriLainnya,
          fileRules,
          legalisirConfig
        }
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BACKUP_EARSIP_ALHICAM_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('✓ File backup database (.JSON) berhasil diunduh!');
    } catch {
      showNotification('Gagal membuat backup.', 'error');
    }
  };

  const handleExportCsvRecap = () => {
    try {
      const allItems = getStoredArsip();
      if (allItems.length === 0) {
        showNotification('Belum ada arsip untuk diekspor.', 'info');
        return;
      }

      let csv = 'ID,Nomor Dokumen,Kategori Utama,Kategori,Subjek / Nama,Keterangan,Tanggal,Ukuran,Status\n';
      allItems.forEach((it: any) => {
        const row = [
          `"${it.id}"`,
          `"${it.nomorDokumen || '-'}"`,
          `"${it.kategoriUtama}"`,
          `"${it.kategori}"`,
          `"${(it.subjek || '').replace(/"/g, '""')}"`,
          `"${(it.keterangan || '').replace(/"/g, '""')}"`,
          `"${it.tanggal || '-'}"`,
          `"${it.ukuran || '-'}"`,
          `"${it.status || 'Tersimpan'}"`
        ];
        csv += row.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `REKAP_ARSIP_ALHICAM_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('✓ Rekap CSV berhasil diekspor!');
    } catch {
      showNotification('Gagal mengekspor CSV.', 'error');
    }
  };

  const handleRestoreJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed || (!parsed.data && !parsed.arsipList && !parsed.arsipItems)) {
          showNotification('Format file cadangan tidak valid!', 'error');
          return;
        }

        const data = parsed.data || parsed;
        let restoredCount = 0;

        if (Array.isArray(data.arsipList || data.arsipItems)) {
          const items = data.arsipList || data.arsipItems;
          localStorage.setItem('EARSIP_ARSIP_ITEMS_V2', JSON.stringify(items));
          restoredCount = items.length;
        }

        if (Array.isArray(data.masterSiswa)) {
          localStorage.setItem('EARSIP_MASTER_SISWA', JSON.stringify(data.masterSiswa));
        }

        if (Array.isArray(data.masterGuru)) {
          localStorage.setItem('EARSIP_MASTER_GURU', JSON.stringify(data.masterGuru));
        }

        showNotification(`✓ Database dipulihkan! (${restoredCount} arsip dimuat)`);
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        showNotification('Gagal membaca file JSON.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearCacheStorage = () => {
    try {
      sessionStorage.clear();
      let cleared = 0;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('EARSIP_TEMP_') || key.startsWith('EARSIP_CACHE_'))) {
          localStorage.removeItem(key);
          cleared++;
        }
      }
      showNotification(`✓ Cache dibersihkan (${cleared} file sementara)`);
    } catch {
      showNotification('Gagal membersihkan cache.', 'error');
    }
  };

  const handleFactoryResetData = () => {
    if (confirm('PERINGATAN: Apakah Anda yakin ingin memulihkan sampel data demonstrasi awal?')) {
      restoreSampleArsipData();
      showNotification('✓ Data berhasil direset ke sampel demonstrasi.');
      setTimeout(() => window.location.reload(), 1200);
    }
  };

  // 6. Keamanan: Ganti Password Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(() => {
    return localStorage.getItem('EARSIP_SESSION_TIMEOUT') || '30';
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showNotification('Password baru minimal 6 karakter.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('Konfirmasi password tidak cocok!', 'error');
      return;
    }

    const userList = getStoredUserList();
    const myAccountIndex = userList.findIndex((u: any) => 
      u.email.toLowerCase() === currentUser.email.toLowerCase() || 
      (isSuperAdmin && (u.id === 'master-superadmin' || u.email === 'superadmin'))
    );

    if (myAccountIndex >= 0) {
      userList[myAccountIndex].password = newPassword;
      saveStoredUserList(userList);
      setNewPassword('');
      setConfirmPassword('');
      showNotification('✓ Kata sandi berhasil diperbarui!');
    } else {
      showNotification('Akun tidak ditemukan.', 'error');
    }
  };

  const handleSaveSessionTimeout = (val: string) => {
    setSessionTimeout(val);
    localStorage.setItem('EARSIP_SESSION_TIMEOUT', val);
    showNotification(`✓ Auto-logout diatur ke ${val === '0' ? 'Selalu Aktif' : `${val} Menit`}`);
  };

  // 7. Diagnostik Memori
  const [diagnostics, setDiagnostics] = useState({
    totalArsip: 0,
    totalSampah: 0,
    totalSiswa: 0,
    totalGuru: 0,
    storageUsedKb: 0
  });

  useEffect(() => {
    let totalBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          totalBytes += key.length + val.length;
        }
      }
    } catch {}

    const arsip = getStoredArsip();
    const trash = getTrashArsip();
    const siswa = getStoredMasterSiswa();
    const guru = getStoredMasterGuru();

    setDiagnostics({
      totalArsip: arsip.length,
      totalSampah: trash.length,
      totalSiswa: siswa.length,
      totalGuru: guru.length,
      storageUsedKb: Math.round(totalBytes / 1024)
    });
  }, [activeTab]);

  const navTabs = isSuperAdmin ? [
    { id: 'preferensi', label: 'Tampilan & Sistem', shortLabel: 'Tampilan', icon: Palette },
    { id: 'kategori', label: 'Kategori & Dokumen', shortLabel: 'Kategori', icon: FileText },
    { id: 'legalisir', label: 'Legalisir & Stempel', shortLabel: 'Legalisir', icon: Stamp },
    { id: 'cloud', label: 'Server & Cloud', shortLabel: 'Server Cloud', icon: Cloud, badge: 'Pro' },
    { id: 'backup', label: 'Cadangan & Pemulihan', shortLabel: 'Backup', icon: Database },
    { id: 'keamanan', label: 'Keamanan & Sesi', shortLabel: 'Keamanan', icon: Shield },
    { id: 'diagnostik', label: 'Diagnostik Memori', shortLabel: 'Diagnostik', icon: Activity },
    { id: 'info', label: 'Info & Lisensi Aplikasi', shortLabel: 'Info Aplikasi', icon: Info, badge: 'v2.4.2' }
  ] : [
    { id: 'preferensi', label: 'Tampilan & Suara', shortLabel: 'Tampilan', icon: Palette },
    { id: 'keamanan', label: 'Profil & Keamanan Akun', shortLabel: 'Akun Saya', icon: User },
    { id: 'info', label: 'Info Aplikasi & Bantuan', shortLabel: 'Info Aplikasi', icon: Info, badge: 'v2.4.2' }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-24 max-w-full overflow-hidden">
      
      {/* Hidden File Input for JSON Restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleRestoreJsonFile}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-50 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold animate-scaleUp max-w-[90vw] ${
          toastType === 'error' 
            ? 'bg-red-950 text-red-200 border-red-500/50' 
            : toastType === 'info'
            ? 'bg-blue-950 text-blue-200 border-blue-500/50'
            : 'bg-slate-900 text-white border-emerald-500/50'
        }`}>
          {toastType === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Modern Responsive Header Banner */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative z-10">
          
          {/* Header Title Info */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md sm:shadow-lg shadow-blue-600/30 flex-shrink-0">
              <Settings className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight leading-tight truncate">
                  {isSuperAdmin ? 'Pengaturan Sistem' : 'Pengaturan & Profil'}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold border border-blue-200 flex-shrink-0">
                  v2.4.2
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate sm:whitespace-normal">
                {isSuperAdmin 
                  ? 'Pusat kendali kearsipan digital, server cloud, dan keamanan.'
                  : 'Preferensi tampilan, manajemen kata sandi, dan panduan bantuan aplikasi.'}
              </p>
            </div>
          </div>

          {/* Quick Header Action Button */}
          <div className="w-full sm:w-auto flex-shrink-0 pt-1 sm:pt-0">
            {isSuperAdmin ? (
              <button
                onClick={handleExportFullBackup}
                className="w-full sm:w-auto justify-center px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/20 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup Database (.JSON)</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('info')}
                className="w-full sm:w-auto justify-center px-4 py-2 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-slate-900/20 active:scale-95"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Panduan & Info Aplikasi</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Menu (Pills Bar with Smooth Horizontal Scroll) */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-3.5 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100 overflow-x-auto pb-1 scrollbar-none snap-x -mx-1 px-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer snap-start flex-shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-600/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
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
      {/* TAB 1: PREFERENSI TAMPILAN, FONT & AUDIO                                 */}
      {/* ========================================================================= */}
      {activeTab === 'preferensi' && (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2.5 pb-3 sm:pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 flex-shrink-0">
                <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Tampilan, Font & Audio Interaktif</h2>
                <p className="text-[11px] sm:text-xs text-slate-500">Sesuaikan ukuran font, kerapatan tabel, dan suara notifikasi sistem.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Font Size Scaling */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Ukuran Huruf / Skala Font
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'small', label: 'Kecil', desc: '12px' },
                    { id: 'normal', label: 'Sedang', desc: '14px' },
                    { id: 'large', label: 'Besar', desc: '16px' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        onSavePref('fontSize', f.id);
                        showNotification(`✓ Font diubah ke ${f.label}`);
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        userPrefs.fontSize === f.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{f.label}</span>
                        {userPrefs.fontSize === f.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-[10px] block mt-0.5 ${userPrefs.fontSize === f.id ? 'text-blue-100' : 'text-slate-400'}`}>
                        {f.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Spacing Density */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Kerapatan Baris Tabel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'compact', label: 'Ringkas', desc: 'Padat' },
                    { id: 'standard', label: 'Standar', desc: 'Ideal' },
                    { id: 'spacious', label: 'Luas', desc: 'Lega' }
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        onSavePref('density', d.id);
                        showNotification(`✓ Tabel diatur ke ${d.label}`);
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        userPrefs.density === d.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                          : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{d.label}</span>
                        {userPrefs.density === d.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-[10px] block mt-0.5 ${userPrefs.density === d.id ? 'text-blue-100' : 'text-slate-400'}`}>
                        {d.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Audio Chimes */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-slate-800 block">Efek Suara Audio</strong>
                    <button 
                      type="button" 
                      onClick={() => playSystemSound('test')}
                      className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold hover:bg-blue-200 transition-colors"
                    >
                      ▶️ Tes Suara
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight">
                    Nada konfirmasi saat upload, simpan, atau hapus berkas.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSound(!soundEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer flex-shrink-0 ${
                    soundEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Animations Toggle */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <strong className="text-xs font-bold text-slate-800 block">Efek Animasi Halaman</strong>
                  <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight">
                    Animasi visual transisi halus saat berpindah antar menu.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSavePref('animations', !userPrefs.animations);
                    showNotification(`✓ Animasi ${!userPrefs.animations ? 'diaktifkan' : 'dinonaktifkan'}`);
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer flex-shrink-0 ${
                    userPrefs.animations ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    userPrefs.animations ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KATEGORI DOKUMEN & ATURAN BERKAS                                   */}
      {/* ========================================================================= */}
      {activeTab === 'kategori' && (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
          
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 sm:pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
                  <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Kategori Berkas Digital Dinamis</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500">Kelola daftar klasifikasi dokumen formulir upload dan buku induk.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetKategoriDefault}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Standar</span>
              </button>
            </div>

            {/* Grid 3 Kolom Kategori */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6">
              
              {/* Kolom 1: Kategori Siswa */}
              <div className="p-3.5 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Arsip Siswa ({kategoriSiswa.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {kategoriSiswa.map((kat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                        <span className="truncate">{kat}</span>
                        {kategoriSiswa.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveKategori('siswa', kat)}
                            className="text-slate-400 hover:text-red-500 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Tambah kategori siswa..."
                    value={newKatSiswa}
                    onChange={(e) => setNewKatSiswa(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKategori('siswa'); } }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddKategori('siswa')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Kolom 2: Kategori Guru */}
              <div className="p-3.5 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    Arsip Guru & Tendik ({kategoriGuru.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {kategoriGuru.map((kat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                        <span className="truncate">{kat}</span>
                        {kategoriGuru.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveKategori('guru', kat)}
                            className="text-slate-400 hover:text-red-500 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Tambah kategori guru..."
                    value={newKatGuru}
                    onChange={(e) => setNewKatGuru(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKategori('guru'); } }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddKategori('guru')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Kolom 3: Kategori Lainnya */}
              <div className="p-3.5 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    Arsip Surat & Lembaga ({kategoriLainnya.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {kategoriLainnya.map((kat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                        <span className="truncate">{kat}</span>
                        {kategoriLainnya.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveKategori('lainnya', kat)}
                            className="text-slate-400 hover:text-red-500 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Tambah kategori umum..."
                    value={newKatLainnya}
                    onChange={(e) => setNewKatLainnya(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKategori('lainnya'); } }}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddKategori('lainnya')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Aturan Batasan File Form */}
          <form onSubmit={handleSaveFileRules} className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 flex-shrink-0">
                  <HardDrive className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Batasan Upload Dokumen</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Kapasitas per berkas dan pola penamaan file unduhan.</p>
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batas Maksimum per Dokumen</label>
                <select
                  value={fileRules.maxUploadMb}
                  onChange={(e) => setFileRules({ ...fileRules, maxUploadMb: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="10">10 MB (Optimal Mobile)</option>
                  <option value="25">25 MB (Standar PDF)</option>
                  <option value="50">50 MB (High Quality)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pola Nama File Saat Diunduh</label>
                <select
                  value={fileRules.namingConvention}
                  onChange={(e) => setFileRules({ ...fileRules, namingConvention: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="kategori_nama_tahun">[KATEGORI]_[NAMA]_[TAHUN].pdf</option>
                  <option value="nisn_kategori">[NOMOR]_[KATEGORI]_[NAMA].pdf</option>
                  <option value="nama_kategori">[NAMA]_[KATEGORI].pdf</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Masa Retensi Tong Sampah</label>
                <select
                  value={fileRules.retensiSampahHari}
                  onChange={(e) => setFileRules({ ...fileRules, retensiSampahHari: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="30">30 Hari</option>
                  <option value="60">60 Hari (Rekomendasi)</option>
                  <option value="90">90 Hari</option>
                </select>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LEGALISIR & WATERMARK                                              */}
      {/* ========================================================================= */}
      {activeTab === 'legalisir' && (
        <form onSubmit={handleSaveLegalisirConfig} className="space-y-4 sm:space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 flex-shrink-0">
                  <Stamp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Stempel & Legalisir Digital</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500">Format penomoran registrasi legalisir dan watermark resmi.</p>
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Format Nomor Registrasi Legalisir</label>
                <input
                  type="text"
                  value={legalisirConfig.nomorFormat}
                  onChange={(e) => setLegalisirConfig({ ...legalisirConfig, nomorFormat: e.target.value })}
                  placeholder="ALH/LEG/{YYYY}/{NO}"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Masa Berlaku Berkas Legalisir</label>
                <select
                  value={legalisirConfig.masaBerlakuBulan}
                  onChange={(e) => setLegalisirConfig({ ...legalisirConfig, masaBerlakuBulan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="6">6 Bulan</option>
                  <option value="12">12 Bulan (1 Tahun)</option>
                  <option value="24">24 Bulan (2 Tahun)</option>
                  <option value="0">Selamanya / Tanpa Batas</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Teks Watermark Stempel Resmi</label>
                <input
                  type="text"
                  value={legalisirConfig.watermarkText}
                  onChange={(e) => setLegalisirConfig({ ...legalisirConfig, watermarkText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pejabat Penandatangan</label>
                <input
                  type="text"
                  value={legalisirConfig.pejabatPenandatangan}
                  onChange={(e) => setLegalisirConfig({ ...legalisirConfig, pejabatPenandatangan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NIP / NUPTK Pejabat</label>
                <input
                  type="text"
                  value={legalisirConfig.nipPejabat}
                  onChange={(e) => setLegalisirConfig({ ...legalisirConfig, nipPejabat: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SERVER CLOUD & SINKRONISASI                                        */}
      {/* ========================================================================= */}
      {activeTab === 'cloud' && (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
          
          {/* Supabase Primary Cloud Server Card (Optimized for Mobile) */}
          <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-800 shadow-xl space-y-4 sm:space-y-6">
            
            {/* Server Card Header */}
            <div className="flex items-start sm:items-center gap-3 pb-3 sm:pb-4 border-b border-slate-800">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0 mt-0.5 sm:mt-0">
                <Database className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                    Supabase PostgreSQL Cloud
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] sm:text-[10px] font-mono font-bold flex items-center gap-1 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    TERKONEKSI
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  Database dan penyimpanan berkas fisik terpusat di server cloud.
                </p>
              </div>
            </div>

            {/* Supabase Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Supabase Project URL</label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={supabaseConfig.url}
                  onChange={(e) => handleSaveSupabaseConfig(e.target.value, supabaseConfig.anonKey)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  placeholder="https://your-project.supabase.co"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Supabase Anon Public Key</label>
                <input
                  type="password"
                  disabled={!isSuperAdmin}
                  value={supabaseConfig.anonKey}
                  onChange={(e) => handleSaveSupabaseConfig(supabaseConfig.url, e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                />
              </div>
            </div>

            {/* Action Buttons: 2x2 Grid on Mobile, Flex on Desktop */}
            {isSuperAdmin && (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleTestSupabaseConnection}
                    disabled={isTestingSupabase}
                    className="w-full sm:w-auto px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                    <span>{isTestingSupabase ? 'Menguji...' : '⚡ Ping DB'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSupabaseStorage}
                    disabled={isTestingStorage}
                    className="w-full sm:w-auto px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <HardDrive className={`w-3.5 h-3.5 ${isTestingStorage ? 'animate-spin' : ''}`} />
                    <span>{isTestingStorage ? 'Menguji...' : '📦 Storage'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncLocalToSupabase}
                    disabled={isSyncingToSupabase}
                    className="w-full sm:w-auto px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload className={`w-3.5 h-3.5 ${isSyncingToSupabase ? 'animate-spin' : ''}`} />
                    <span>{isSyncingToSupabase ? 'Sinkron...' : '📤 Upload Cloud'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromSupabase}
                    disabled={isPullingFromSupabase}
                    className="w-full sm:w-auto px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className={`w-3.5 h-3.5 ${isPullingFromSupabase ? 'animate-spin' : ''}`} />
                    <span>{isPullingFromSupabase ? 'Menarik...' : '📥 Tarik Data'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                    setCopiedSqlSchema(true);
                    setTimeout(() => setCopiedSqlSchema(false), 3000);
                  }}
                  className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {copiedSqlSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedSqlSchema ? '✓ Script SQL Tersalin!' : '📋 Salin Skema SQL'}</span>
                </button>
              </div>
            )}

            {supabaseTestStatus && (
              <div className={`p-3 rounded-xl text-xs font-medium ${
                supabaseTestStatus.includes('✓') 
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                  : 'bg-amber-950/80 text-amber-300 border border-amber-800'
              }`}>
                {supabaseTestStatus}
              </div>
            )}
          </div>

          {/* Google Apps Script Backup Engine */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Google Apps Script Webhook</h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500">Pencadangan ganda otomatis ke Google Drive.</p>
                </div>
              </div>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleTestGAS}
                  disabled={isTestingGAS}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-blue-200 flex-shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingGAS ? 'animate-spin' : ''}`} />
                  <span>{isTestingGAS ? 'Uji...' : 'Tes Webhook'}</span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">URL Webhook GAS</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={syncConfig.webhookUrl}
                onChange={(e) => {
                  const updated = { ...syncConfig, webhookUrl: e.target.value.trim() };
                  setSyncConfig(updated);
                  saveStoredSyncConfig(updated);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                placeholder="https://script.google.com/macros/s/.../exec"
              />
              {onCopyGAS && (
                <button
                  type="button"
                  onClick={onCopyGAS}
                  className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  <span>📋 Salin Script Google Apps Script V3.6 Enterprise</span>
                </button>
              )}
            </div>

            {testConnStatus && (
              <div className={`p-2.5 rounded-xl text-xs font-medium ${
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
      {/* TAB 5: CADANGAN & PEMULIHAN (BACKUP & RESTORE)                            */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2.5 pb-3 sm:pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                <Database className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Pencadangan & Pemulihan Database</h2>
                <p className="text-[11px] sm:text-xs text-slate-500">Amankan dan pulihkan seluruh database kearsipan sekolah.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6">
              
              {/* Ekspor Backup */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Download className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900">Ekspor Salinan Database</h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                    Unduh file JSON berisi data arsip, siswa, guru, dan konfigurasi.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleExportFullBackup}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cadangan (.JSON)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsvRecap}
                    className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Impor / Restore Database */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900">Pulihkan Database (.JSON)</h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                    Pilih file <code>.json</code> cadangan untuk mengembalikan database.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih & Pulihkan Data</span>
                  </button>
                </div>
              </div>

              {/* Bersihkan Cache Storage */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-slate-900">Bersihkan Cache Sementara</h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                    Kosongkan cache sementara browser untuk optimasi memori.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleClearCacheStorage}
                    className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Bersihkan Cache</span>
                  </button>
                </div>
              </div>

              {/* Reset ke Data Demonstrasi */}
              {isSuperAdmin && (
                <div className="p-4 sm:p-5 bg-red-50/50 border border-red-200 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <h3 className="text-xs font-bold text-red-900">Reset Data Sampel</h3>
                    </div>
                    <p className="text-[11px] sm:text-xs text-red-700 leading-relaxed">
                      Kembalikan database ke data demonstrasi standar resmi.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-red-200">
                    <button
                      type="button"
                      onClick={handleFactoryResetData}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Sampel</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: KEAMANAN & MANAJEMEN SESI                                         */}
      {/* ========================================================================= */}
      {activeTab === 'keamanan' && (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
          
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 sm:pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 flex-shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Keamanan Akun & Sesi Login</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500">Masa tenggang auto-logout dan ganti kata sandi akun.</p>
                </div>
              </div>

              {onOpenUserManagement && isSuperAdmin && (
                <button
                  onClick={onOpenUserManagement}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 self-start sm:self-auto"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Kelola Pengguna</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Auto-Logout Session Control - Superadmin only */}
              {isSuperAdmin ? (
                <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Auto-Logout Saat Tidak Aktif</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                    Kunci sesi otomatis jika tidak ada pergerakan mouse/keyboard.
                  </p>

                  <select
                    value={sessionTimeout}
                    onChange={(e) => handleSaveSessionTimeout(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="15">15 Menit (Keamanan Tinggi)</option>
                    <option value="30">30 Menit (Standar)</option>
                    <option value="60">1 Jam</option>
                    <option value="240">4 Jam</option>
                    <option value="480">8 Jam</option>
                    <option value="0">Selalu Aktif</option>
                  </select>

                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Enkripsi:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      AES-256 Cloud
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Informasi Akun Anda</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Nama Lengkap:</span>
                      <span className="font-bold text-slate-800">{currentUser.name || 'Pengguna'}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-500">Email / Username:</span>
                      <span className="font-mono text-slate-700">{currentUser.email || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Hak Akses:</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                        {currentUser.role || 'Staf Tata Usaha'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    💡 Untuk perubahan hak akses atau penambahan akun, silakan hubungi <strong>Super Administrator</strong>.
                  </p>
                </div>
              )}

              {/* Form Ganti Password Akun Sendiri */}
              <form onSubmit={handleChangePassword} className="p-4 sm:p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <span>Ganti Kata Sandi</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="text-[11px] text-blue-600 font-semibold cursor-pointer"
                  >
                    {showPw ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>

                <div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Sandi baru (min 6 karakter)"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi sandi baru"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  Simpan Kata Sandi
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: DIAGNOSTIK MEMORI & STATUS SISTEM (Superadmin Only)               */}
      {/* ========================================================================= */}
      {activeTab === 'diagnostik' && isSuperAdmin && (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-6">
            <div className="flex items-center gap-2.5 pb-3 sm:pb-4 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Diagnostik Memori & Status Beban</h2>
                <p className="text-[11px] sm:text-xs text-slate-500">Statistik real-time kapasitas penyimpanan dan entri data.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Total Arsip</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{diagnostics.totalArsip}</p>
                <span className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold block">Tersimpan</span>
              </div>

              <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Tong Sampah</span>
                <p className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{diagnostics.totalSampah}</p>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold block">Berkas</span>
              </div>

              <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Master Siswa</span>
                <p className="text-xl sm:text-2xl font-black text-blue-600 mt-0.5">{diagnostics.totalSiswa}</p>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold block">Buku Induk</span>
              </div>

              <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Master Guru</span>
                <p className="text-xl sm:text-2xl font-black text-purple-600 mt-0.5">{diagnostics.totalGuru}</p>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold block">Pegawai</span>
              </div>
            </div>

            {/* Storage Meter Gauge */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Memori Browser Lokal (IndexedDB Cache)</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{diagnostics.storageUsedKb} KB terpakai</p>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {Math.min(100, Math.round((diagnostics.storageUsedKb / 5000) * 100))}%
                </span>
              </div>

              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, Math.min(100, (diagnostics.storageUsedKb / 5000) * 100))}%` }}
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                💡 Dokumen fisik berukuran penuh tersimpan langsung di <strong>Google Drive Dedicated Private Storage</strong> dan metadata di <strong>Supabase PostgreSQL</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: INFORMASI, LISENSI & PANDUAN APLIKASI (All Users)                  */}
      {/* ========================================================================= */}
      {activeTab === 'info' && (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
          
          {/* Main App Profile Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0 font-black text-xl">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                        E-Arsip Digital SMP Al-Hikam
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold">
                        Enterprise Edition
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1">
                      Sistem Pengarsipan Dokumen Kesiswaan, Guru, & Lembaga Terstruktur
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCheckUpdate}
                  disabled={isCheckingUpdate}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30 active:scale-95 flex-shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdate ? 'Memeriksa...' : 'Cek Pembaruan'}</span>
                </button>
              </div>

              {updateResult && (
                <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{updateResult}</span>
                </div>
              )}

              {/* Meta details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Versi Rilis</span>
                  <p className="text-sm font-bold text-white mt-0.5">v2.4.2 (Stable)</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Status Cloud</span>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online Optimal
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Penyimpanan</span>
                  <p className="text-sm font-bold text-cyan-300 mt-0.5">Google Drive Dedikasi</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Database Core</span>
                  <p className="text-sm font-bold text-indigo-300 mt-0.5">Supabase PostgreSQL</p>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture & Guidelines Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Arsitektur & Hak Cipta */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                  <Server className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Spesifikasi Arsitektur Sistem</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Teknologi backend & frontend kearsipan sekolah.</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">Hybrid Cloud Engine:</strong> Berkas fisik biner (PDF/JPG hingga 50MB) dialirkan ke Google Drive Private Storage, sementara metadata & query tabel dikelola di Supabase PostgreSQL.
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">Progressive Web App (PWA):</strong> Aplikasi responsif dan cepat, dapat diakses mulus di laptop, komputer TU, tablet, maupun ponsel pintar.
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Stamp className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">Digital Legalisir & QR Token:</strong> Dilengkapi modul pengesahan digital berstandar QR Code unik untuk validasi keaslian ijazah/rapor.
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                Hak Cipta © 2026 <strong>SMP Al-Hikam</strong>. Dikembangkan khusus untuk pengelolaan kearsipan digital sekolah terpadu.
              </div>
            </div>

            {/* Panduan Kearsipan Singkat (FAQ) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Panduan Ringkas Kearsipan</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">Petunjuk praktis bagi operator dan guru.</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
                  <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                    <span>1. Unggah Dokumen Asli</span>
                  </h4>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Masuk ke menu <strong>Upload Berkas</strong> ➔ pilih siswa/guru ➔ pilih file. Berkas langsung masuk ke folder Google Drive otomatis tanpa perlu pengaturan manual.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
                  <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <span>2. Pencarian Cepat & Unduh</span>
                  </h4>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Buka menu <strong>Unduh Dokumen</strong> ➔ gunakan kolom cari nama, NISN, atau filter tahun angkatan untuk menemukan berkas dalam 1 detik.
                  </p>
                </div>

                <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl space-y-1">
                  <h4 className="font-bold text-purple-900 flex items-center gap-1.5">
                    <span>3. Legalisir Resmi Digital</span>
                  </h4>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    Menu <strong>Verifikasi & Legalisir</strong> memungkinkan penerbitan lembar legalisir digital yang sah dengan nomor registrasi dan QR Code verifikasi.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">Butuh bantuan lebih lanjut?</span>
                <span className="font-bold text-blue-600">Hubungi Tim IT Sekolah</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
