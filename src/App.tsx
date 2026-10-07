import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  CloudUpload, 
  CloudDownload, 
  CheckSquare, 
  BarChart3, 
  Users, 
  User,
  Settings, 
  Power, 
  Menu, 
  AlignLeft,
  X, 
  ChevronDown, 
  Shield,
  ArrowLeft,
  ChevronRight,
  HardDrive,
  Database,
  ExternalLink,
  Sparkles,
  FileText,
  BookOpen,
  Stamp,
  History,
  Clock,
  Copy,
  Clipboard,
  Check,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Globe,
  Type,
  Info,
  ShieldCheck,
  Laptop,
  Bell,
  Key,
  Cloud
} from 'lucide-react';
import LoginPage from './components/LoginPage';
import DashboardView from './components/DashboardView';
import FormUploadView from './components/FormUploadView';
import FormUnduhView from './components/FormUnduhView';
import BukuIndukView from './components/BukuIndukView';
import LegalisirView from './components/LegalisirView';
import AuditLogView from './components/AuditLogView';
import LaporanView from './components/LaporanView';
import TongSampahView from './components/TongSampahView';
import SettingsView from './components/SettingsView';
import PreviewModal from './components/PreviewModal';
import UserManagementModal from './components/UserManagementModal';
import { 
  ArsipItem, 
  DB_KEYS, 
  getStoredSyncConfig, 
  saveStoredSyncConfig, 
  GoogleSyncConfig,
  clearAllArsipData,
  restoreSampleArsipData,
  getStoredArsip,
  getAllRawArsip,
  getTrashArsip,
  syncItemToGoogleCloud,
  fetchLiveFullDataFromGoogle,
  saveFileAttachment,
  getFileAttachment,
  GOOGLE_APPS_SCRIPT_ROBUST_CODE,
  testGoogleWebhook,
  getStoredMasterSiswa,
  getStoredMasterGuru,
  getAvatarForUser,
  saveAvatarForUser,
  getPermanentDeletedIds,
  syncAuditLogsFromCloud
} from './data/mockDatabase';
import { 
  subscribeToArsip, 
  subscribeToMasterSiswa, 
  subscribeToMasterGuru, 
  testFirestoreConnection,
  saveArsipToFirestore
} from './firebase';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
  testSupabaseStorage,
  subscribeToSupabaseArsip,
  SUPABASE_SQL_SCHEMA,
  sanitizeSupabaseUrl,
  getSupabaseClient,
  syncAllArsipToSupabase,
  syncAllMasterSiswaToSupabase,
  syncAllMasterGuruToSupabase,
  fetchMasterSiswaFromSupabase,
  fetchMasterGuruFromSupabase,
  fetchArsipFromSupabase,
  subscribeToSupabaseUsers,
  fetchUsersFromSupabase,
  syncConfigToServer,
  fetchConfigFromServer,
  subscribeToSupabaseAuditLogs
} from './supabase';

type ActivePage = 'dashboard' | 'upload' | 'unduh' | 'buku-induk' | 'legalisir' | 'audit-log' | 'laporan' | 'sampah' | 'pengaturan';
type SubKategori = 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya';

// Isolated live clock component so ticking every second doesn't re-render entire page/charts
function LiveClock() {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      const dayName = days[now.getDay()];
      const date = now.getDate();
      const monthName = months[now.getMonth()];
      const year = now.getFullYear();

      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      setTimeStr(`${dayName}, ${date} ${monthName} ${year} | ${hours}:${minutes}:${seconds} WIB`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span>{timeStr || 'Memuat waktu...'}</span>;
}

// 30 Minutes Inactivity Timeout in milliseconds (30 * 60 * 1000)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

export default function App() {
  // Session expired notice message
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string>('');

  // Successful login notice message
  const [loginNotice, setLoginNotice] = useState<string>('');

  // Auth state: Default MUST LOGIN FIRST (null) unless there is a fresh session verified within 30 min
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; role: string; avatarUrl?: string } | null>(() => {
    try {
      const saved = localStorage.getItem(DB_KEYS.AUTH_USER);
      const lastActive = localStorage.getItem('EARSIP_LAST_ACTIVE_TIME');
      if (saved && lastActive) {
        const timeDiff = Date.now() - parseInt(lastActive, 10);
        if (timeDiff < INACTIVITY_TIMEOUT_MS) {
          const parsed = JSON.parse(saved);
          parsed.avatarUrl = getAvatarForUser(parsed.email, parsed.name);
          return parsed;
        }
      }
    } catch {}
    // Security by default: Always require login when opened fresh
    return null;
  });

  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());

  // Real-time Inactivity Auto-Logout Tracker (30 Menit)
  useEffect(() => {
    if (!currentUser) return;

    const recordActivity = () => {
      const now = Date.now();
      setLastActiveTime(now);
      localStorage.setItem('EARSIP_LAST_ACTIVE_TIME', now.toString());
    };

    // User activity events: mouse movement, keystroke, touch, click, scroll
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    let lastThrottledTime = Date.now();

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle event updating every 4 seconds to prevent CPU overhead
      if (now - lastThrottledTime > 4000) {
        lastThrottledTime = now;
        recordActivity();
      }
    };

    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Periodic check every 10 seconds whether 30 minutes of inactivity has passed
    const timerInterval = setInterval(() => {
      const savedLast = localStorage.getItem('EARSIP_LAST_ACTIVE_TIME');
      const lastTime = savedLast ? parseInt(savedLast, 10) : lastActiveTime;
      const elapsed = Date.now() - lastTime;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        // Automatically logout user after 30 minutes idle
        localStorage.removeItem(DB_KEYS.AUTH_USER);
        localStorage.removeItem('EARSIP_LAST_ACTIVE_TIME');
        setCurrentUser(null);
        setSessionExpiredNotice('⚠️ Sesi Anda telah kedaluwarsa otomatis karena tidak ada aktivitas selama 30 menit demi keamanan sistem. Silakan login kembali.');
      }
    }, 10000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity));
      clearInterval(timerInterval);
    };
  }, [currentUser, lastActiveTime]);

  // Real-time Supabase Users sync & Cross-Tab Profile Sync
  useEffect(() => {
    // 1. Initial Cloud Sync
    fetchUsersFromSupabase().then(cloudUsers => {
      if (cloudUsers && cloudUsers.length > 0) {
        localStorage.setItem('EARSIP_USER_LIST', JSON.stringify(cloudUsers));
        setCurrentUser(prev => {
          if (!prev) return prev;
          const currentUsername = prev.email.toLowerCase().replace(/^@/, '');
          const me = cloudUsers.find(u => (u.email || '').toLowerCase().replace(/^@/, '') === currentUsername || (currentUsername === 'superadmin' && u.id === 'master-superadmin'));
          if (me) {
            const avatar = getAvatarForUser(me.email, me.name);
            if (prev.name !== me.name || prev.role !== me.role || prev.avatarUrl !== avatar) {
              return {
                email: me.email,
                name: me.name,
                role: me.role,
                avatarUrl: avatar
              };
            }
          }
          return prev;
        });
      }
    }).catch(() => {});

    // 2. Realtime Subscription from Supabase Cloud
    const unsubscribe = subscribeToSupabaseUsers((updatedCloudUsers) => {
      if (updatedCloudUsers && updatedCloudUsers.length > 0) {
        localStorage.setItem('EARSIP_USER_LIST', JSON.stringify(updatedCloudUsers));
        setCurrentUser(prev => {
          if (!prev) return prev;
          const currentUsername = prev.email.toLowerCase().replace(/^@/, '');
          const me = updatedCloudUsers.find(u => (u.email || '').toLowerCase().replace(/^@/, '') === currentUsername || (currentUsername === 'superadmin' && u.id === 'master-superadmin'));
          if (me) {
            const avatar = getAvatarForUser(me.email, me.name);
            if (prev.name !== me.name || prev.role !== me.role || prev.avatarUrl !== avatar) {
              return {
                email: me.email,
                name: me.name,
                role: me.role,
                avatarUrl: avatar
              };
            }
          }
          return prev;
        });
      }
    });

    // 3. Cross-Tab Local Storage Listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === DB_KEYS.AUTH_USER || e.key === 'EARSIP_USER_LIST' || e.key === 'EARSIP_ADMIN_ACCOUNT' || e.key === 'EARSIP_AVATARS_MAP') {
        const savedAuth = localStorage.getItem(DB_KEYS.AUTH_USER);
        if (savedAuth) {
          try {
            const parsed = JSON.parse(savedAuth);
            parsed.avatarUrl = getAvatarForUser(parsed.email, parsed.name);
            setCurrentUser(parsed);
          } catch {}
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Navigation State
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [activeSubKategori, setActiveSubKategori] = useState<SubKategori>('Arsip Siswa');
  const [unduhInitialSearch, setUnduhInitialSearch] = useState('');

  // Accordion Menus in Sidebar
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [unduhMenuOpen, setUnduhMenuOpen] = useState(false);

  // Mobile sidebar drawer & profile sheet
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileProfileSheetOpen, setMobileProfileSheetOpen] = useState(false);

  // Modals
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [previewItem, setPreviewItem] = useState<ArsipItem | null>(null);

  // Security & RBAC: Super Administrator privileges
  const isSuperAdmin = currentUser?.role === 'Super Administrator' || 
    currentUser?.email?.toLowerCase().replace(/^@/, '') === 'superadmin' || 
    currentUser?.email?.toLowerCase() === 'admin@alhicam.sch.id';

  // App User Preferences
  const [userPrefs, setUserPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('EARSIP_USER_PREFS');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      fontSize: 'normal',
      language: 'id',
      density: 'standard',
      themeAccent: 'blue',
      animations: true
    };
  });

  const handleSavePref = (key: string, value: any) => {
    const updated = { ...userPrefs, [key]: value };
    setUserPrefs(updated);
    try {
      localStorage.setItem('EARSIP_USER_PREFS', JSON.stringify(updated));
    } catch {}
  };

  // Google Sync Config
  const [syncConfig, setSyncConfig] = useState<GoogleSyncConfig>(() => getStoredSyncConfig());
  const [copiedGAS, setCopiedGAS] = useState(false);
  const [testConnStatus, setTestConnStatus] = useState<string>('');
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [dbVersion, setDbVersion] = useState(0);

  // Supabase PostgreSQL Config
  const [supabaseConfig, setSupabaseConfig] = useState(() => getStoredSupabaseConfig());
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<string>('');
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isSyncingToSupabase, setIsSyncingToSupabase] = useState(false);
  const [copiedSqlSchema, setCopiedSqlSchema] = useState(false);
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [storageTestStatus, setStorageTestStatus] = useState<string>('');

  const handleTestSupabaseStorage = async () => {
    setIsTestingStorage(true);
    setStorageTestStatus('Menguji akses ke Supabase Storage (bucket "arsip")...');
    const result = await testSupabaseStorage();
    setStorageTestStatus(result.message);
    setIsTestingStorage(false);
  };

  const handleTestSupabaseConnection = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestStatus('Menghubungkan ke Supabase PostgreSQL Cloud...');
    
    // Auto fix .com to .co in state
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

  const handleSyncLocalToSupabase = async () => {
    setIsSyncingToSupabase(true);
    setSupabaseTestStatus('Mengunggah data Arsip, Siswa, dan Guru ke Supabase Cloud...');
    
    const localItems = getAllRawArsip();
    const localSiswa = getStoredMasterSiswa();
    const localGuru = getStoredMasterGuru();

    const [resArsip, resSiswa, resGuru] = await Promise.all([
      syncAllArsipToSupabase(localItems),
      syncAllMasterSiswaToSupabase(localSiswa),
      syncAllMasterGuruToSupabase(localGuru)
    ]);

    const statusMsgs: string[] = [];
    statusMsgs.push(`${resArsip.count} arsip`);
    if (resSiswa.success) {
      statusMsgs.push(`${resSiswa.count} data siswa`);
    } else if (resSiswa.error) {
      statusMsgs.push(`siswa (${resSiswa.error})`);
    } else {
      statusMsgs.push('0 siswa');
    }

    if (resGuru.success) {
      statusMsgs.push(`${resGuru.count} data guru`);
    } else if (resGuru.error) {
      statusMsgs.push(`guru (${resGuru.error})`);
    } else {
      statusMsgs.push('0 guru');
    }

    if (resArsip.success || resSiswa.success || resGuru.success) {
      syncConfigToServer(supabaseConfig);
      setSupabaseTestStatus(`✓ Berhasil sinkronisasi ke Supabase: ${statusMsgs.join(', ')}! (Tersimpan otomatis untuk semua perangkat)`);
    } else {
      setSupabaseTestStatus('Gagal menyinkronkan ke Supabase. Pastikan tabel "arsip", "master_siswa", dan "master_guru" sudah dibuat.');
    }
    setIsSyncingToSupabase(false);
  };

  const handleSaveSupabaseConfig = (url: string, anonKey: string) => {
    const updated = { ...supabaseConfig, url, anonKey: anonKey.trim() };
    setSupabaseConfig(updated);
    saveStoredSupabaseConfig(updated);
  };

  const handlePasteSupabaseUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const clean = sanitizeSupabaseUrl(text);
        handleSaveSupabaseConfig(clean || text.trim(), supabaseConfig.anonKey);
      }
    } catch {
      alert('Gagal membaca clipboard. Silakan klik kanan pada kolom teks lalu pilih "Paste" / "Tempel".');
    }
  };

  const handlePasteSupabaseKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleSaveSupabaseConfig(supabaseConfig.url, text.trim());
      }
    } catch {
      alert('Gagal membaca clipboard. Silakan klik kanan pada kolom teks lalu pilih "Paste" / "Tempel".');
    }
  };

  const handleSaveWebhookUrl = (url: string) => {
    const updated = { ...syncConfig, webhookUrl: url.trim() };
    setSyncConfig(updated);
    saveStoredSyncConfig(updated);
  };

  const handleTestGAS = async () => {
    setIsTestingConn(true);
    setTestConnStatus('Menguji koneksi ke Webhook Google Apps Script...');
    const res = await testGoogleWebhook(syncConfig.webhookUrl);
    setTestConnStatus(res.message);
    setIsTestingConn(false);
  };

  // Real-time Cloud Database Listeners (Multi-Device Auto Sync)
  useEffect(() => {
    testFirestoreConnection();

    let syncDebounceTimer: any = null;
    const triggerDebouncedSync = () => {
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(() => {
        setDbVersion(v => v + 1);
        window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
      }, 90);
    };

    const unsubArsip = subscribeToArsip((remoteItems) => {
      try {
        if (!Array.isArray(remoteItems)) return;
        // If Supabase client is active, Supabase is the primary database
        if (getSupabaseClient()) {
          console.log('[Sync] Supabase is active, ignoring legacy Firebase snapshot update.');
          return;
        }

        // Preserve local file attachment blobs if available
        const localRaw = getAllRawArsip();
        const localMap = new Map<string, ArsipItem>();
        localRaw.forEach(it => localMap.set(it.id, it));

        const updatedList: ArsipItem[] = [];

        remoteItems.forEach(it => {
          const existingLocal = localMap.get(it.id);
          const activeBlob = it.fileDataUrl || existingLocal?.fileDataUrl;

          if (activeBlob) {
            saveFileAttachment(it.id, activeBlob);
          }

          updatedList.push({
            ...it,
            fileDataUrl: activeBlob
          });
        });

        // Save authoritative list from Firestore to LocalStorage (without fileDataUrl to save quota)
        const clean = updatedList.map(it => {
          const copy = { ...it };
          delete copy.fileDataUrl;
          return copy;
        });

        localStorage.setItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(clean));
        triggerDebouncedSync();
      } catch (err) {
        console.error('Error syncing remote items:', err);
      }
    });

    const unsubSiswa = subscribeToMasterSiswa((siswaList) => {
      if (Array.isArray(siswaList) && siswaList.length > 0) {
        try {
          localStorage.setItem(DB_KEYS.MASTER_SISWA, JSON.stringify(siswaList));
          triggerDebouncedSync();
        } catch {}
      }
    });

    const unsubGuru = subscribeToMasterGuru((guruList) => {
      if (Array.isArray(guruList) && guruList.length > 0) {
        try {
          localStorage.setItem(DB_KEYS.MASTER_GURU, JSON.stringify(guruList));
          triggerDebouncedSync();
        } catch {}
      }
    });

    const unsubSupabase = subscribeToSupabaseArsip((supabaseItems) => {
      try {
        if (!Array.isArray(supabaseItems)) return;

        const deletedIds = getPermanentDeletedIds();
        const validSupabaseItems = supabaseItems.filter(it => !deletedIds.has(it.id));

        const localRaw = getAllRawArsip();
        const localMap = new Map<string, ArsipItem>();
        localRaw.forEach(it => localMap.set(it.id, it));

        // Supabase is the single source of truth across all devices.
        // We preserve local fileDataUrl from memory cache if available:
        const clean = validSupabaseItems.map(it => {
          const copy = { ...it };
          delete copy.fileDataUrl;
          return copy;
        });

        localStorage.setItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(clean));
        triggerDebouncedSync();
      } catch (err) {
        console.error('Error syncing Supabase items:', err);
      }
    });

    // Pull authoritative archives from Supabase on startup
    fetchArsipFromSupabase().then(supaItems => {
      const deletedIds = getPermanentDeletedIds();
      if (Array.isArray(supaItems) && supaItems.length > 0) {
        const validItems = supaItems.filter(it => !deletedIds.has(it.id));
        const clean = validItems.map(it => {
          const copy = { ...it };
          delete copy.fileDataUrl;
          return copy;
        });
        localStorage.setItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(clean));
        triggerDebouncedSync();
      } else {
        const rawArsipInitial = getAllRawArsip().filter(it => !deletedIds.has(it.id));
        if (rawArsipInitial.length > 0) {
          syncAllArsipToSupabase(rawArsipInitial).catch(() => {});
        }
      }
    }).catch(() => {});

    // Auto sync/seed master siswa and master guru from/to Supabase
    fetchMasterSiswaFromSupabase().then(supaSiswa => {
      if (supaSiswa && supaSiswa.length > 0) {
        localStorage.setItem(DB_KEYS.MASTER_SISWA, JSON.stringify(supaSiswa));
        triggerDebouncedSync();
      } else {
        const localSiswa = getStoredMasterSiswa();
        if (localSiswa && localSiswa.length > 0) {
          syncAllMasterSiswaToSupabase(localSiswa);
        }
      }
    }).catch(() => {});

    fetchMasterGuruFromSupabase().then(supaGuru => {
      if (supaGuru && supaGuru.length > 0) {
        localStorage.setItem(DB_KEYS.MASTER_GURU, JSON.stringify(supaGuru));
        triggerDebouncedSync();
      } else {
        const localGuru = getStoredMasterGuru();
        if (localGuru && localGuru.length > 0) {
          syncAllMasterGuruToSupabase(localGuru);
        }
      }
    }).catch(() => {});

    // Pull authoritative Audit Logs from Cloud across all devices
    syncAuditLogsFromCloud().catch(() => {});

    const unsubAuditLogs = subscribeToSupabaseAuditLogs(() => {
      syncAuditLogsFromCloud().catch(() => {});
    });

    const handleWindowFocus = () => {
      syncAuditLogsFromCloud().catch(() => {});
    };
    window.addEventListener('focus', handleWindowFocus);

    // Cross-Device Server Configuration Auto-Sync:
    // When opened on ANY other device (phone, laptop, teacher's PC), auto-fetch pre-configured credentials
    const currentLocalCfg = getStoredSupabaseConfig();
    if (!currentLocalCfg.anonKey) {
      fetchConfigFromServer().then(remoteCfg => {
        if (remoteCfg && remoteCfg.anonKey) {
          setSupabaseConfig(remoteCfg);
          triggerDebouncedSync();
        }
      });
    } else {
      // If this device already has active verified credentials, broadcast & save to server
      syncConfigToServer(currentLocalCfg);
    }

    return () => {
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      unsubArsip();
      unsubSiswa();
      unsubGuru();
      unsubSupabase();
      unsubAuditLogs();
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const [showGasModal, setShowGasModal] = useState(false);
  const [gasScriptContent, setGasScriptContent] = useState('');
  const gasTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleCopyGAS = () => {
    const code = `// ================================================================
// GOOGLE APPS SCRIPT WEBHOOK E-ARSIP SMP AL-HIKAM (V3.6 ENTERPRISE)
// ================================================================

// 1. JALANKAN FUNGSI INI SEKALI (KLIK RUN/JALANKAN DI APPS SCRIPT)
// Berfungsi meminta izin Google Drive & Google Spreadsheet, serta menyiapkan 6 Tab
function setupDatabaseDanIzin() {
  // A. Izin Akses Google Drive
  var rootFolderId = '1hHk3xY4cwzncVWTyalyC7d9v7WvxdniQ';
  try {
    var f = DriveApp.getFolderById(rootFolderId);
    Logger.log('Folder Drive Terhubung: ' + f.getName());
  } catch(e) {
    Logger.log('Drive permission prompt initialized.');
  }

  // B. Izin Akses Google Spreadsheet & Buat 6 Tab
  var ss = getSpreadsheet('1fyWuUClt970_2RELzMq5jBGsjCcTXYZW_XZtTyxmyI');

  getOrCreateSheet(ss, 'DATA_MASTER_SISWA', [
    'NISN / NIS', 'NAMA LENGKAP SISWA', 'TAHUN ANGKATAN', 'KELAS', 'TANGGAL TERDAFTAR'
  ]);

  getOrCreateSheet(ss, 'DATA_MASTER_GURU', [
    'NUPTK / NIP', 'NAMA LENGKAP GURU & PTK', 'JABATAN / MAPEL', 'TANGGAL TERDAFTAR'
  ]);

  var headersArsip = [
    'ID ARSIP', 'TANGGAL UPLOAD', 'TAHUN / ANGKATAN', 'IDENTITAS (NISN/NUPTK)', 
    'NAMA SUBJEK', 'KATEGORI DOKUMEN', 'KATEGORI UTAMA', 'NAMA FILE ASLI', 
    'UKURAN', 'UPLOADER', 'LINK GOOGLE DRIVE'
  ];

  getOrCreateSheet(ss, 'REKAP_SEMUA_ARSIP', headersArsip);
  getOrCreateSheet(ss, 'ARSIP_SISWA', headersArsip);
  getOrCreateSheet(ss, 'ARSIP_GURU', headersArsip);
  getOrCreateSheet(ss, 'ARSIP_LAINNYA', headersArsip);

  SpreadsheetApp.flush();
  Logger.log('BERHASIL! 6 Tab database siap di: ' + ss.getName());
}

function getSpreadsheet(optId) {
  if (optId && String(optId).trim().length > 10) {
    try {
      return SpreadsheetApp.openById(String(optId).trim());
    } catch(e) {}
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss && ss.getId()) return ss;
  } catch(e) {}
  return SpreadsheetApp.openById('1fyWuUClt970_2RELzMq5jBGsjCcTXYZW_XZtTyxmyI');
}

// 2. WEBHOOK PENERIMA UPLOAD & SINKRONISASI (DENGAN LOCKSERVICE ENTERPRISE)
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Server sibuk (lock timeout). Silakan coba beberapa saat lagi.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var contents = (e && e.postData) ? e.postData.contents : '{}';
    var data = JSON.parse(contents);
    var ss = getSpreadsheet(data.spreadsheetId);
    var rootFolderId = data.folderId || '1hHk3xY4cwzncVWTyalyC7d9v7WvxdniQ';

    var headersArsip = [
      'ID ARSIP', 'TANGGAL UPLOAD', 'TAHUN / ANGKATAN', 'IDENTITAS (NISN/NUPTK)', 
      'NAMA SUBJEK', 'KATEGORI DOKUMEN', 'KATEGORI UTAMA', 'NAMA FILE ASLI', 
      'UKURAN', 'UPLOADER', 'LINK GOOGLE DRIVE'
    ];

    // A. JIKA ACTION: SINKRONISASI MASTER SISWA & GURU
    if (data.action === 'SYNC_ALL_MASTER') {
      if (data.siswaList && data.siswaList.length > 0) {
        var sSheet = getOrCreateSheet(ss, 'DATA_MASTER_SISWA', ['NISN / NIS', 'NAMA LENGKAP SISWA', 'TAHUN ANGKATAN', 'KELAS', 'TANGGAL TERDAFTAR']);
        data.siswaList.forEach(function(s) {
          upsertMasterRow(sSheet, [String(s.nisn), String(s.nama), String(s.tahun), String(s.kelas), Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy')]);
        });
      }
      if (data.guruList && data.guruList.length > 0) {
        var gSheet = getOrCreateSheet(ss, 'DATA_MASTER_GURU', ['NUPTK / NIP', 'NAMA LENGKAP GURU & PTK', 'JABATAN / MAPEL', 'TANGGAL TERDAFTAR']);
        data.guruList.forEach(function(g) {
          upsertMasterRow(gSheet, [String(g.nuptk), String(g.nama), String(g.jabatan), Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy')]);
        });
      }
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Master siswa & guru tersimpan di Sheet!' })).setMimeType(ContentService.MimeType.JSON);
    }

    // B. JIKA ACTION: CATAT BANYAK BERKAS SEKALIGUS (ANTI-DUPLIKAT)
    if (data.action === 'SYNC_ALL_ARSIP_ITEMS') {
      if (data.items && data.items.length > 0) {
        var sAll = getOrCreateSheet(ss, 'REKAP_SEMUA_ARSIP', headersArsip);
        var sSiswa = getOrCreateSheet(ss, 'ARSIP_SISWA', headersArsip);
        var sGuru = getOrCreateSheet(ss, 'ARSIP_GURU', headersArsip);
        var sLain = getOrCreateSheet(ss, 'ARSIP_LAINNYA', headersArsip);

        data.items.forEach(function(item) {
          var row = [
            item.id, item.tanggal, item.tahun, item.identitas,
            item.subjek, item.kategori, item.kategoriUtama, item.namaFileAsli || item.namaFile,
            item.ukuran, item.uploader || 'Admin', item.linkDrive || '-'
          ];
          upsertArsipRow(sAll, row);
          if (item.kategoriUtama === 'Arsip Siswa') upsertArsipRow(sSiswa, row);
          else if (item.kategoriUtama === 'Arsip Guru') upsertArsipRow(sGuru, row);
          else upsertArsipRow(sLain, row);
        });

        cleanDuplicatesInSheet(sAll);
        cleanDuplicatesInSheet(sSiswa);
        cleanDuplicatesInSheet(sGuru);
        cleanDuplicatesInSheet(sLain);
        SpreadsheetApp.flush();
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Seluruh berkas berhasil dicatat tanpa duplikat!' })).setMimeType(ContentService.MimeType.JSON);
    }

    // C. PROSES UPLOAD SATU BERKAS FISIK KE DRIVE & SHEET
    var rootFolder = DriveApp.getFolderById(rootFolderId);
    var subfolderName = '3. ARSIP LAINNYA';
    if (data.kategoriUtama === 'Arsip Siswa') subfolderName = '1. ARSIP SISWA';
    else if (data.kategoriUtama === 'Arsip Guru') subfolderName = '2. ARSIP GURU & PTK';
    var categoryFolder = getOrCreateFolder(rootFolder, subfolderName);

    var targetFolder = categoryFolder;
    if (data.tahun && data.tahun !== '-') {
      targetFolder = getOrCreateFolder(categoryFolder, 'Angkatan ' + data.tahun);
    }

    var fileUrl = data.linkDrive || '-';
    if (data.fileData && data.fileData.indexOf('base64,') > -1) {
      var split = data.fileData.split('base64,');
      var contentType = split[0].split(':')[1].split(';')[0];
      var bytes = Utilities.base64Decode(split[1]);
      var cleanFileName = (data.subjek ? data.subjek + ' - ' : '') + (data.kategori || 'Dokumen') + ' - ' + (data.namaFile || 'arsip.pdf');
      var blob = Utilities.newBlob(bytes, contentType, cleanFileName);
      var file = targetFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    }

    var rowData = [
      data.id || ('ARS-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss')),
      data.tanggal || Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm:ss'),
      data.tahun || '-',
      data.identitas || '-',
      data.subjek || '-',
      data.kategori || '-',
      data.kategoriUtama || 'Arsip Siswa',
      data.namaFile || '-',
      data.ukuran || '-',
      data.uploader || 'Admin',
      fileUrl
    ];

    // Tulis ke Tab Rekap & Kategori (Update jika ada, tambah jika baru)
    var sAll = getOrCreateSheet(ss, 'REKAP_SEMUA_ARSIP', headersArsip);
    upsertArsipRow(sAll, rowData);

    var tabName = data.kategoriUtama === 'Arsip Siswa' ? 'ARSIP_SISWA' : data.kategoriUtama === 'Arsip Guru' ? 'ARSIP_GURU' : 'ARSIP_LAINNYA';
    var sKat = getOrCreateSheet(ss, tabName, headersArsip);
    upsertArsipRow(sKat, rowData);

    // Otomatis Catat ke DATA_MASTER_SISWA / DATA_MASTER_GURU jika belum ada
    if (data.kategoriUtama === 'Arsip Siswa' && data.subjek && data.identitas) {
      var sMaster = getOrCreateSheet(ss, 'DATA_MASTER_SISWA', ['NISN / NIS', 'NAMA LENGKAP SISWA', 'TAHUN ANGKATAN', 'KELAS', 'TANGGAL TERDAFTAR']);
      upsertMasterRow(sMaster, [String(data.identitas), String(data.subjek), String(data.tahun || '-'), '9A', Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy')]);
    } else if (data.kategoriUtama === 'Arsip Guru' && data.subjek && data.identitas) {
      var gMaster = getOrCreateSheet(ss, 'DATA_MASTER_GURU', ['NUPTK / NIP', 'NAMA LENGKAP GURU & PTK', 'JABATAN / MAPEL', 'TANGGAL TERDAFTAR']);
      upsertMasterRow(gMaster, [String(data.identitas), String(data.subjek), 'Guru Pengajar', Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy')]);
    }

    SpreadsheetApp.flush();

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      driveUrl: fileUrl,
      message: 'Berhasil dicatat di Google Spreadsheet & disimpan di Drive!'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// Helper: Tulis atau Update Baris Arsip (100% Anti-Duplikat!)
function upsertArsipRow(sheet, rowData) {
  var targetId = String(rowData[0]).trim();
  var rows = sheet.getDataRange().getValues();
  var foundRowIndex = -1;

  for (var i = 1; i < rows.length; i++) {
    var existingId = String(rows[i][0]).trim();
    var existingSubjek = String(rows[i][4]).trim().toLowerCase();
    var existingKat = String(rows[i][5]).trim().toLowerCase();

    var curSubjek = String(rowData[4]).trim().toLowerCase();
    var curKat = String(rowData[5]).trim().toLowerCase();

    if ((targetId && existingId === targetId) || (curSubjek && curKat && existingSubjek === curSubjek && existingKat === curKat)) {
      foundRowIndex = i + 1;
      break;
    }
  }

  if (foundRowIndex > 0) {
    sheet.getRange(foundRowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

// Helper: Tulis atau Update Baris Master
function upsertMasterRow(sheet, rowData) {
  var targetKey = String(rowData[0]).trim();
  var rows = sheet.getDataRange().getValues();
  var found = false;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === targetKey) {
      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow(rowData);
  }
}

// Helper: Hapus Baris Duplikat
function cleanDuplicatesInSheet(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 2) return;
  var seen = {};
  var toDelete = [];

  for (var i = 1; i < data.length; i++) {
    var subjek = String(data[i][4] || '').trim().toLowerCase();
    var kat = String(data[i][5] || '').trim().toLowerCase();
    var key = subjek + '___' + kat;
    if (!subjek) continue;

    if (seen[key]) {
      toDelete.push(i + 1);
    } else {
      seen[key] = true;
    }
  }

  for (var j = toDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(toDelete[j]);
  }
}

// Helper Folder
function getOrCreateFolder(parent, name) {
  if (!parent) parent = DriveApp.getFolderById('1hHk3xY4cwzncVWTyalyC7d9v7WvxdniQ');
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(name);
}

// Helper Sheet
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
    if (defaultSheet && defaultSheet.getLastRow() === 0) {
      defaultSheet.setName(name);
      sheet = defaultSheet;
    } else {
      sheet = ss.insertSheet(name);
    }
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight('bold').setBackground('#0F172A').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    for (var i = 1; i <= headers.length; i++) {
      try { sheet.autoResizeColumn(i); } catch(eResize) {}
    }
  }
  return sheet;
}

// 3. AMBIL DATA REAL-TIME DARI GOOGLE SPREADSHEET (DEDUPLIKASI OTOMATIS & MULTI-DEVICE SINKRON)
function doGet(e) {
  try {
    var ss = getSpreadsheet(e && e.parameter ? e.parameter.spreadsheetId : null);
    
    // A. BACA REKAP ARSIP
    var sArsip = ss.getSheetByName('REKAP_SEMUA_ARSIP');
    var items = [];
    if (sArsip) {
      var rows = sArsip.getDataRange().getValues();
      var seenKeys = {};
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        var subjek = String(r[4] || '').trim();
        var kat = String(r[5] || '').trim();
        var key = (subjek + '___' + kat).toLowerCase();

        if (r[0] && subjek && !seenKeys[key]) {
          seenKeys[key] = true;
          items.push({
            id: String(r[0]),
            tanggal: String(r[1]),
            tahun: String(r[2]),
            identitas: String(r[3]),
            subjek: subjek,
            kategori: kat,
            kategoriUtama: String(r[6]),
            namaFile: String(r[7]),
            ukuran: String(r[8]),
            uploader: String(r[9]),
            driveUrl: String(r[10])
          });
        }
      }
    }

    // B. BACA DATA MASTER SISWA
    var sSiswa = ss.getSheetByName('DATA_MASTER_SISWA');
    var siswaList = [];
    if (sSiswa) {
      var sRows = sSiswa.getDataRange().getValues();
      for (var j = 1; j < sRows.length; j++) {
        var sr = sRows[j];
        if (sr[0] && String(sr[0]).trim() !== '') {
          siswaList.push({
            nisn: String(sr[0]),
            nama: String(sr[1]),
            tahun: String(sr[2]),
            kelas: String(sr[3])
          });
        }
      }
    }

    // C. BACA DATA MASTER GURU
    var sGuru = ss.getSheetByName('DATA_MASTER_GURU');
    var guruList = [];
    if (sGuru) {
      var gRows = sGuru.getDataRange().getValues();
      for (var k = 1; k < gRows.length; k++) {
        var gr = gRows[k];
        if (gr[0] && String(gr[0]).trim() !== '') {
          guruList.push({
            nuptk: String(gr[0]),
            nama: String(gr[1]),
            jabatan: String(gr[2])
          });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      count: items.length,
      items: items,
      siswa: siswaList,
      guru: guruList
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString(),
      items: [],
      siswa: [],
      guru: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

    setGasScriptContent(code);
    setShowGasModal(true);
    try {
      navigator.clipboard.writeText(code);
      setCopiedGAS(true);
      setTimeout(() => setCopiedGAS(false), 3000);
    } catch {}
  };

  // State for Real-Time Cloud Synchronization across All Devices
  const [cloudSyncStatus, setCloudSyncStatus] = useState<{ isSyncing: boolean; lastSync?: string; message?: string }>({
    isSyncing: false,
    lastSync: undefined
  });

  // Auto-Sync Hook: When app loads on any device, or when window regains focus, auto pull latest from Google Spreadsheet
  useEffect(() => {
    if (!currentUser) return;

    const performAutoSync = async () => {
      const cfg = getStoredSyncConfig();
      if (!cfg.webhookUrl || !cfg.webhookUrl.startsWith('http')) return;

      setCloudSyncStatus(prev => ({ ...prev, isSyncing: true }));
      try {
        const res = await fetchLiveFullDataFromGoogle();
        const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (res.success) {
          setCloudSyncStatus({
            isSyncing: false,
            lastSync: nowTime,
            message: `Tersinkronkan live (${res.itemsCount} berkas, ${res.siswaCount} siswa)`
          });
          setDbVersion(v => v + 1);
        } else {
          setCloudSyncStatus(prev => ({ ...prev, isSyncing: false }));
        }
      } catch {
        setCloudSyncStatus(prev => ({ ...prev, isSyncing: false }));
      }
    };

    // 1. Run immediately on load / login
    performAutoSync();

    // 2. Run on tab focus / visibility change (e.g. user opens phone or switches tab)
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        performAutoSync();
      }
    };
    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);

    // 3. Periodic background sync every 45 seconds
    const syncInterval = setInterval(performAutoSync, 45000);

    return () => {
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
      clearInterval(syncInterval);
    };
  }, [currentUser]);

  const handleTestConnection = async () => {
    if (!syncConfig.webhookUrl) {
      setTestConnStatus('⚠️ Masukkan URL Webhook terlebih dahulu!');
      return;
    }
    setIsTestingConn(true);
    setTestConnStatus('Sedang memeriksa respon webhook...');
    try {
      const res = await fetch(syncConfig.webhookUrl);
      const data = await res.json();
      if (data && data.status === 'success') {
        setTestConnStatus(`✅ Terhubung! Webhook aktif & mendeteksi ${data.count || 0} arsip di Spreadsheet.`);
      } else {
        setTestConnStatus('✅ Terhubung ke Webhook Google Apps Script!');
      }
    } catch (e: any) {
      setTestConnStatus('⚠️ Belum merespon. Pastikan Webhook di-deploy dengan akses "Anyone / Siapa saja".');
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleLoginSuccess = async (user: { email: string; name: string; role: string; avatarUrl?: string }) => {
    setCurrentUser(user);
    const now = Date.now();
    localStorage.setItem(DB_KEYS.AUTH_USER, JSON.stringify(user));
    localStorage.setItem('EARSIP_LAST_ACTIVE_TIME', now.toString());
    setSessionExpiredNotice('');
    setActivePage('dashboard');

    // Show smooth login notice for 4.5 seconds
    setLoginNotice(`Selamat saudara ${user.name}, Anda berhasil login sebagai ${user.role}`);
    setTimeout(() => {
      setLoginNotice('');
    }, 4500);

    // KETIKA LOGIN: LANGSUNG TARIK SELURUH DATA TERBARU DARI SERVER SUPABASE CLOUD
    try {
      const [supaItems, supaSiswa, supaGuru, supaUsers] = await Promise.all([
        fetchArsipFromSupabase(),
        fetchMasterSiswaFromSupabase(),
        fetchMasterGuruFromSupabase(),
        fetchUsersFromSupabase()
      ]);

      if (Array.isArray(supaItems) && supaItems.length > 0) {
        localStorage.setItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(supaItems));
      }
      if (Array.isArray(supaSiswa) && supaSiswa.length > 0) {
        localStorage.setItem(DB_KEYS.MASTER_SISWA, JSON.stringify(supaSiswa));
      }
      if (Array.isArray(supaGuru) && supaGuru.length > 0) {
        localStorage.setItem(DB_KEYS.MASTER_GURU, JSON.stringify(supaGuru));
      }
      if (Array.isArray(supaUsers) && supaUsers.length > 0) {
        localStorage.setItem('EARSIP_USER_LIST', JSON.stringify(supaUsers));
        supaUsers.forEach(u => {
          if (u.avatarUrl) {
            saveAvatarForUser(u.email, u.avatarUrl);
          }
        });
      }
      setDbVersion(v => v + 1);
    } catch (err) {
      console.warn('Post-login cloud fetch notice:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(DB_KEYS.AUTH_USER);
    localStorage.removeItem('EARSIP_LAST_ACTIVE_TIME');
    setCurrentUser(null);
    setShowLogoutModal(false);
    setMobileProfileSheetOpen(false);
    setSessionExpiredNotice('');
  };

  // Silky-Smooth Manual Global Refresh (Anti-Stutter, In-Place Reactive Transition)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleManualGlobalRefresh = async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    try {
      const [supaItems, supaSiswa, supaGuru, supaUsers] = await Promise.all([
        fetchArsipFromSupabase(),
        fetchMasterSiswaFromSupabase(),
        fetchMasterGuruFromSupabase(),
        fetchUsersFromSupabase()
      ]);

      if (Array.isArray(supaItems)) {
        localStorage.setItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(supaItems));
      }
      if (Array.isArray(supaSiswa) && supaSiswa.length > 0) {
        localStorage.setItem(DB_KEYS.MASTER_SISWA, JSON.stringify(supaSiswa));
      }
      if (Array.isArray(supaGuru) && supaGuru.length > 0) {
        localStorage.setItem(DB_KEYS.MASTER_GURU, JSON.stringify(supaGuru));
      }
      if (Array.isArray(supaUsers) && supaUsers.length > 0) {
        localStorage.setItem('EARSIP_USER_LIST', JSON.stringify(supaUsers));
        supaUsers.forEach(u => {
          if (u.avatarUrl) {
            saveAvatarForUser(u.email, u.avatarUrl);
          }
        });
      }

      setDbVersion(v => v + 1);
      window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
    } catch (e) {
      console.warn('Manual refresh notice:', e);
    } finally {
      setTimeout(() => {
        setIsManualRefreshing(false);
      }, 550);
    }
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} sessionNotice={sessionExpiredNotice} />;
  }

  // Titles mapping
  const pageTitles: { [key in ActivePage]: string } = {
    dashboard: 'Dashboard Executive',
    upload: `Upload Dokumen (${activeSubKategori})`,
    unduh: `Unduh Dokumen (${activeSubKategori})`,
    'buku-induk': 'Master Data (Siswa & Guru)',
    legalisir: 'Verifikasi & Legalisir Digital',
    'audit-log': 'Log & Jejak Audit Pengarsipan',
    laporan: 'Statistik & Laporan Arsip',
    sampah: 'Sampah & Pemulihan Berkas',
    pengaturan: 'Pengaturan & Konfigurasi Sistem'
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-['Poppins'] text-slate-800 antialiased selection:bg-blue-600 selection:text-white w-full max-w-full overflow-x-hidden">
      
      {/* 1. MOBILE DRAWER OVERLAY (Ultra-smooth hardware accelerated, zero jank, smooth fade in & out) */}
      <div 
        onClick={() => {
          setMobileSidebarOpen(false);
          setMobileProfileSheetOpen(false);
        }}
        aria-hidden="true"
        className={`fixed inset-0 z-[90] bg-slate-950/75 lg:hidden transition-opacity duration-300 ease-out transform-gpu ${
          mobileSidebarOpen || mobileProfileSheetOpen 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 2. SIDEBAR NAVIGATION (DESKTOP & ACCESSIBLE AS DRAWER - HARDWARE ACCELERATED & SILKY SMOOTH) */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-[100] w-72 lg:w-64 max-w-[82vw] bg-[#0F172A] text-slate-200 flex flex-col
        transform-gpu will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${mobileSidebarOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full lg:translate-x-0 lg:shadow-none'}
      `}>
        {/* Sidebar Header with Logo */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png" 
              alt="Logo SMP Al-Hikam" 
              className="w-10 h-10 object-contain drop-shadow"
            />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white">DIGITAL_ARSIP</h2>
              <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-widest">smp al-hikam</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Menu */}
        <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {/* Dashboard */}
          <button
            onClick={() => {
              setActivePage('dashboard');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activePage === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {/* Master Data (Siswa & Guru) */}
          <button
            onClick={() => {
              setActivePage('buku-induk');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activePage === 'buku-induk'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Master Data</span>
          </button>

          {/* Upload Dokumen Accordion */}
          <div>
            <button
              onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activePage === 'upload'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <CloudUpload className="w-4 h-4" />
                <span>Upload Dokumen</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${uploadMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {uploadMenuOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1">
                {(['Arsip Siswa', 'Arsip Guru', 'Arsip Lainnya'] as const).map(sub => (
                  <button
                    key={sub}
                    onClick={() => {
                      setActivePage('upload');
                      setActiveSubKategori(sub);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left py-1.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      activePage === 'upload' && activeSubKategori === sub
                        ? 'text-blue-400 bg-blue-500/15 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    • {sub}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Unduh Dokumen Accordion */}
          <div>
            <button
              onClick={() => setUnduhMenuOpen(!unduhMenuOpen)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activePage === 'unduh'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <CloudDownload className="w-4 h-4" />
                <span>Unduh Dokumen</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${unduhMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {unduhMenuOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1">
                {(['Arsip Siswa', 'Arsip Guru', 'Arsip Lainnya'] as const).map(sub => (
                  <button
                    key={sub}
                    onClick={() => {
                      setActivePage('unduh');
                      setActiveSubKategori(sub);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left py-1.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      activePage === 'unduh' && activeSubKategori === sub
                        ? 'text-blue-400 bg-blue-500/15 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    • {sub}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Verifikasi & Legalisir */}
          <button
            onClick={() => {
              setActivePage('legalisir');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activePage === 'legalisir'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Stamp className="w-4 h-4" />
            <span>Verifikasi & Legalisir</span>
          </button>

          {/* Log Aktivitas & Audit */}
          <button
            onClick={() => {
              setActivePage('audit-log');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activePage === 'audit-log'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Log Aktivitas & Audit</span>
          </button>

          {/* Divider */}
          <div className="pt-4 pb-1 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            MANAJEMEN & LAPORAN
          </div>

          {/* Statistik & Laporan */}
          <button
            onClick={() => {
              setActivePage('laporan');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activePage === 'laporan'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statistik & Laporan</span>
          </button>

          {/* Sampah / Trash */}
          <button
            onClick={() => {
              setActivePage('sampah');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activePage === 'sampah'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4" />
              <span>Sampah</span>
            </div>
            {getTrashArsip().length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-bold">
                {getTrashArsip().length}
              </span>
            )}
          </button>

          {/* Manajemen User (Khusus Super Administrator) */}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setShowUserModal(true);
                setMobileSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Manajemen User</span>
            </button>
          )}

          {/* Pengaturan Sistem */}
          <button
            onClick={() => {
              setActivePage('pengaturan');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activePage === 'pengaturan'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan Sistem</span>
          </button>
        </div>

        {/* Sidebar Footer System Info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-sm flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-white tracking-wide truncate">
                E-Arsip Al-hicamV1.0
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowLogoutModal(true);
                setMobileSidebarOpen(false);
              }}
              className="lg:hidden p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all cursor-pointer flex items-center justify-center flex-shrink-0 active:scale-95 shadow-sm"
              title="Keluar dari Sistem (Logout)"
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 3. MAIN CONTENT CONTAINER (Lag-free, no heavy filter blurs) */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen pb-24 lg:pb-8 w-full max-w-full overflow-x-hidden">
        
        {/* ============================================================== */}
        {/* DESKTOP HEADER (TETAP SAMA PERSIS DENGAN YANG DISUKAI USER)     */}
        {/* ============================================================== */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-[#0F172A]/90 backdrop-blur-xl border-b-2 border-blue-500/70 text-white px-8 py-3.5 shadow-md items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                {pageTitles[activePage]}
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <LiveClock />
                </p>
                <button
                  type="button"
                  onClick={handleManualGlobalRefresh}
                  disabled={isManualRefreshing}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-[10px] font-semibold text-cyan-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Segarkan data terbaru dari database Supabase"
                >
                  <RefreshCw className={`w-3 h-3 text-cyan-400 ${isManualRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{isManualRefreshing ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Centered Login Notification on Desktop */}
          <div className="flex-1 flex justify-center px-4">
            {loginNotice && (
              <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-blue-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-bold animate-fadeIn shadow-lg shadow-cyan-500/5 max-w-md truncate backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                <span>{loginNotice}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 sm:gap-5">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex flex-col items-center justify-center text-red-400 hover:text-red-300 transition-transform active:scale-95 cursor-pointer group"
              title="Keluar dari Sistem"
            >
              <div className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/30 transition-colors">
                <Power className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-red-400 mt-1 uppercase tracking-wider">Logout</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-3 pl-3 border-l border-slate-700/80 hover:bg-slate-800/80 py-1 px-2 rounded-2xl transition-all cursor-pointer group text-left"
              title="Manajemen Pengguna & Profil Akun"
            >
              <div className="text-right">
                <span className="text-xs font-bold text-white block leading-tight group-hover:text-cyan-300 transition-colors">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold block">{currentUser.role}</span>
              </div>
              <div className="relative">
                <img
                  src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3b82f6&color=fff&size=100`}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full border-2 border-white/80 group-hover:border-cyan-400 object-cover shadow transition-colors"
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3b82f6&color=fff&size=100`;
                  }}
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" title="Online" />
              </div>
            </button>
          </div>
        </header>

        {/* ============================================================== */}
        {/* REFINED MOBILE HEADER (EXPANDED UPWARD TO COVER STATUS BAR / SAFE AREA) */}
        {/* ============================================================== */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-[#080E21] via-[#0F1B3E] to-[#0A132C] text-white px-4 sm:px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3.5 border-b-2 border-blue-500/60 shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden">
          
          {/* Subtle Ambient Gradient Light Reflections (No stiff solid color) */}
          <div className="absolute -top-10 left-1/4 w-48 h-28 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 right-12 w-40 h-20 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

          {/* Centered Login Notification on Mobile */}
          {loginNotice && (
            <div className="absolute top-[max(1.25rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 bg-[#080E21]/95 border border-cyan-400/60 text-cyan-300 text-[10px] sm:text-xs font-bold px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 animate-fadeIn max-w-[90vw] text-center backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
              <span className="truncate">{loginNotice}</span>
            </div>
          )}

          <div className="relative z-10 flex items-center justify-between">
            {activePage === 'dashboard' ? (
              /* Brand & Logo with Hamburger Garis 3 Menu Trigger */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="-ml-1.5 p-1.5 rounded-xl text-cyan-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer active:scale-90 flex items-center justify-center flex-shrink-0"
                  title="Buka Menu Lengkap E-Arsip"
                  aria-label="Buka Menu Navigasi"
                >
                  <Menu className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
                </button>

                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-md shadow-blue-500/30 flex items-center justify-center flex-shrink-0 border border-white/20">
                  <img 
                    src="https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png" 
                    alt="Logo SMP Al-Hikam" 
                    className="w-full h-full object-contain drop-shadow"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-extrabold tracking-tight text-white leading-none drop-shadow-sm">
                      E-ARSIP AL-HICAM
                    </h1>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <button
                      type="button"
                      onClick={handleManualGlobalRefresh}
                      disabled={isManualRefreshing}
                      className="ml-1 p-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-cyan-400 hover:text-white active:scale-90 transition-all cursor-pointer"
                      title="Segarkan Data"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isManualRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium tracking-wide mt-1">
                    SMP Al-Hikam • Digital Portal
                  </p>
                </div>
              </div>
            ) : (
              /* Contextual Sub-page Header with Hamburger Menu & Back Navigation */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="-ml-1.5 p-1.5 rounded-xl text-cyan-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer active:scale-90 flex items-center justify-center flex-shrink-0"
                  title="Buka Menu Lengkap E-Arsip"
                  aria-label="Buka Menu Navigasi"
                >
                  <Menu className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
                </button>
                <button
                  onClick={() => setActivePage('dashboard')}
                  className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-slate-200 shadow-sm active:scale-95">
                    <ArrowLeft className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest block leading-none">Kembali</span>
                    <span className="text-sm font-bold text-white block mt-0.5 max-w-[170px] truncate">
                      {pageTitles[activePage].split('(')[0]}
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Right: Perfectly Centered & Balanced Profile Trigger */}
            <button
              type="button"
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-2.5 p-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-white active:scale-95 transition-all cursor-pointer shadow-md group"
              title="Manajemen Pengguna & Profil"
            >
              <div className="text-right pl-2 hidden sm:block">
                <span className="text-[11px] font-bold text-white block leading-none truncate max-w-[95px] group-hover:text-cyan-300 transition-colors">
                  {currentUser.name}
                </span>
                <span className="text-[9px] text-cyan-400 font-medium leading-none block mt-0.5">{currentUser.role}</span>
              </div>
              <div className="relative w-9 h-9 flex-shrink-0 flex items-center justify-center">
                <img
                  src={getAvatarForUser(currentUser.email, currentUser.name)}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full border-2 border-cyan-400/80 group-hover:border-cyan-300 object-cover shadow-sm transition-colors"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0F172A]" title="Online" />
              </div>
            </button>
          </div>
        </header>

        {/* View Contents with top padding for fixed header in mobile */}
        <div className="p-3.5 sm:p-8 pt-[calc(env(safe-area-inset-top,0px)+88px)] lg:pt-8 flex-1 w-full max-w-full overflow-x-hidden">
          {activePage === 'dashboard' && (
            <DashboardView
              dataVersion={dbVersion}
              onNavigate={(page, sub) => {
                setActivePage(page);
                if (sub) setActiveSubKategori(sub);
              }}
            />
          )}

          {activePage === 'upload' && (
            <FormUploadView
              initialJenis={activeSubKategori}
              onUploadSuccess={() => setActivePage('unduh')}
              onCancel={() => setActivePage('dashboard')}
            />
          )}

          {activePage === 'unduh' && (
            <FormUnduhView
              kategoriMenu={activeSubKategori}
              initialSearch={unduhInitialSearch}
              onPreview={(item) => setPreviewItem(item)}
            />
          )}

          {activePage === 'buku-induk' && (
            <BukuIndukView
              onNavigateToArsip={(sub, nama) => {
                setActivePage('unduh');
                setActiveSubKategori(sub);
                setUnduhInitialSearch(nama || '');
              }}
              onPreview={(item) => setPreviewItem(item)}
              onNavigateToUpload={(sub, nama) => {
                setActivePage('upload');
                setActiveSubKategori(sub);
              }}
            />
          )}

          {activePage === 'legalisir' && (
            <LegalisirView />
          )}

          {activePage === 'audit-log' && (
            <AuditLogView />
          )}

          {activePage === 'laporan' && (
            <LaporanView
              onPreview={(item) => setPreviewItem(item)}
            />
          )}

          {activePage === 'sampah' && (
            <TongSampahView />
          )}

          {activePage === 'pengaturan' && (
            <SettingsView
              currentUser={currentUser}
              onOpenUserManagement={() => setShowUserModal(true)}
              userPrefs={userPrefs}
              onSavePref={handleSavePref}
              onCopyGAS={handleCopyGAS}
            />
          )}
        </div>
      </main>

      {/* ============================================================== */}
      {/* 4. MODERN MOBILE PROFILE & UTILITY SHEET (HARDWARE ACCELERATED) */}
      {/* ============================================================== */}
      <div className={`fixed bottom-0 left-0 right-0 z-[100] bg-[#0F172A] border-t border-slate-800 text-white rounded-t-3xl p-5 shadow-2xl lg:hidden transform-gpu will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        mobileProfileSheetOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}>
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4" />

          {/* User info card */}
          <div 
            onClick={() => {
              setMobileProfileSheetOpen(false);
              setShowUserModal(true);
            }}
            className="flex items-center gap-3.5 pb-4 mb-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800/40 p-2 rounded-2xl transition-colors group"
          >
            <img
              src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3b82f6&color=fff&size=100`}
              alt="Avatar"
              className="w-12 h-12 rounded-2xl border-2 border-blue-500 object-cover shadow-md group-hover:border-cyan-400 transition-colors"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">{currentUser.name}</h3>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">Edit</span>
              </div>
              <p className="text-xs text-slate-400 font-mono truncate">{currentUser.email}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {currentUser.role}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMobileProfileSheetOpen(false);
              }}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action options list */}
          <div className="space-y-1 mb-4">
            <button
              onClick={() => {
                setMobileProfileSheetOpen(false);
                setShowUserModal(true);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/30 text-blue-300 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span>Manajemen Pengguna & Profil</span>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={() => {
                setMobileProfileSheetOpen(false);
                setActivePage('pengaturan');
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <span>Pengaturan Sistem & Database</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => {
                setMobileProfileSheetOpen(false);
                setShowUserModal(true);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span>Manajemen Hak Akses Pengguna</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => {
                setMobileProfileSheetOpen(false);
                setMobileSidebarOpen(true);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Menu className="w-4 h-4" />
                </div>
                <span>Buka Menu Navigasi Lengkap</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Logout button */}
          <button
            onClick={() => {
              setMobileProfileSheetOpen(false);
              setShowLogoutModal(true);
            }}
            className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Power className="w-4 h-4" />
            <span>Keluar dari Akun (Logout)</span>
          </button>
        </div>

      {/* ============================================================== */}
      {/* 5. REFINED FLOATING BOTTOM NAVIGATION (MINIMALIST & NATIVE FEEL)*/}
      {/* ============================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex lg:hidden items-center justify-around py-1.5 px-2">
        {/* Dashboard */}
        <button
          onClick={() => setActivePage('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activePage === 'dashboard'
              ? 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${
            activePage === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'bg-transparent'
          }`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Beranda</span>
        </button>

        {/* Upload */}
        <button
          onClick={() => {
            setActivePage('upload');
            setActiveSubKategori('Arsip Siswa');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activePage === 'upload'
              ? 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${
            activePage === 'upload' ? 'bg-blue-50 text-blue-600' : 'bg-transparent'
          }`}>
            <CloudUpload className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Upload</span>
        </button>

        {/* Unduh */}
        <button
          onClick={() => {
            setActivePage('unduh');
            setActiveSubKategori('Arsip Siswa');
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activePage === 'unduh'
              ? 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${
            activePage === 'unduh' ? 'bg-blue-50 text-blue-600' : 'bg-transparent'
          }`}>
            <CloudDownload className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Unduh</span>
        </button>

        {/* Log & Jejak Audit */}
        <button
          onClick={() => setActivePage('audit-log')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activePage === 'audit-log'
              ? 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${
            activePage === 'audit-log' ? 'bg-blue-50 text-blue-600' : 'bg-transparent'
          }`}>
            <History className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Log Audit</span>
        </button>

        {/* Setting / Pengaturan Sistem */}
        <button
          onClick={() => setActivePage('pengaturan')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all cursor-pointer ${
            activePage === 'pengaturan'
              ? 'text-blue-600 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${
            activePage === 'pengaturan' ? 'bg-blue-50 text-blue-600' : 'bg-transparent'
          }`}>
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Setting</span>
        </button>
      </nav>

      {/* 6. MODAL KONFIRMASI LOGOUT */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0F172A] border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-scaleUp text-white">
            <div className="w-14 h-14 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <Power className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold mb-1">Konfirmasi Logout</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Apakah Anda yakin ingin keluar dari sistem E-Arsip Al-Hicam?
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL MANAJEMEN USER (DYNAMIC, EDITABLE & REAL-TIME SYNC) */}
      {showUserModal && currentUser && (
        <UserManagementModal
          isOpen={showUserModal}
          onClose={() => setShowUserModal(false)}
          currentUser={currentUser}
          onUpdateCurrentUser={(updated) => {
            setCurrentUser(updated);
          }}
        />
      )}

      {/* 8. PREVIEW DOKUMEN MODAL */}
      <PreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onPrint={(item) => {
          window.print();
        }}
        onDownload={async (item) => {
          // 1. If Google Drive link exists, open/download original full-res file from Google Drive
          if (item.linkDrive && item.linkDrive.startsWith('http') && !item.linkDrive.includes('SSW-') && !item.linkDrive.includes('GRU-') && !item.linkDrive.includes('LYN-')) {
            window.open(item.linkDrive, '_blank');
            return;
          }

          // 2. Fetch full resolution file blob from IndexedDB / Memory
          const fullResBlob = item.fileDataUrl || (await getFileAttachment(item.id));
          if (fullResBlob) {
            const element = document.createElement('a');
            element.setAttribute('href', fullResBlob);
            element.setAttribute('download', item.namaFileAsli || `${item.subjek}_${item.kategori}`);
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            return;
          }

          // 3. Fallback: Open folder Drive
          if (item.linkDrive) {
            window.open(item.linkDrive, '_blank');
          }
        }}
      />

      {/* 9. MODAL SALIN GOOGLE APPS SCRIPT V3.6 ENTERPRISE */}
      {showGasModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0F172A] border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-lg w-full text-white shadow-2xl animate-scaleUp flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Script Google Apps Script V3.6</h3>
                  <p className="text-[11px] text-slate-400">Salin kode di bawah ini ke script.google.com</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGasModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 my-2 min-h-[220px] relative">
              <textarea
                ref={gasTextareaRef}
                readOnly
                value={gasScriptContent}
                onClick={(e) => e.currentTarget.select()}
                className="w-full h-full min-h-[220px] max-h-[50vh] p-3 bg-slate-900 border border-slate-700 rounded-2xl text-[11px] font-mono text-cyan-300 focus:outline-none focus:border-blue-500 resize-none select-all"
                placeholder="Memuat skrip..."
              />
              <span className="absolute bottom-3 right-3 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                Ketuk teks untuk memilih semua
              </span>
            </div>

            <div className="flex gap-2.5 mt-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (gasTextareaRef.current) {
                    gasTextareaRef.current.select();
                    document.execCommand('copy');
                    alert('✓ Script berhasil disalin ke clipboard! Silakan paste di Google Apps Script.');
                  }
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>Salin Teks ke Clipboard</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGasModal(false)}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
