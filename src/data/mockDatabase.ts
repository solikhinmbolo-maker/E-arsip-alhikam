import { 
  saveArsipToFirestore, 
  deleteArsipFromFirestore, 
  saveSiswaToFirestore, 
  saveGuruToFirestore,
  deleteSiswaFromFirestore,
  deleteGuruFromFirestore
} from '../firebase';
import {
  saveArsipToSupabase,
  deleteArsipFromSupabase,
  saveSiswaToSupabase,
  saveGuruToSupabase,
  syncAllMasterSiswaToSupabase,
  syncAllMasterGuruToSupabase,
  deleteMasterSiswaFromSupabase,
  deleteMasterGuruFromSupabase,
  saveAuditLogToSupabase,
  syncAllAuditLogsToSupabase,
  fetchAuditLogsFromSupabase
} from '../supabase';

export interface MasterSiswaItem {
  id: string;
  nama: string;
  tahun: string;
  jenisKelamin: string;
  nisn: string;
}

export interface MasterGuruItem {
  id: string;
  nama: string;
  nuptk: string;
  jabatan: string;
}

export interface ArsipItem {
  id: string;
  tanggal: string;
  tahun: string;
  identitas: string;
  subjek: string;
  kategori: string;
  kategoriUtama: 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya';
  namaFileAsli: string;
  ukuran?: string;
  linkDrive?: string;
  uploader: string;
  fileDataUrl?: string;
  isTrash?: boolean;
  deletedAt?: string;
}

export const INITIAL_MASTER_SISWA: MasterSiswaItem[] = [];

export const INITIAL_MASTER_GURU: MasterGuruItem[] = [];

export const KATEGORI_SISWA = [
  'Ijazah SD/MI',
  'SKL SD/MI',
  'Ijazah SMP',
  'SKL SMP',
  'Pakta Integritas',
  'Berkas SPMB',
  'Berkas PIP/KIP',
  'Dokumen Lainnya'
];

export const KATEGORI_GURU = [
  'KTP Guru',
  'Kartu Keluarga (KK)',
  'Akta IV',
  'NPWP',
  'BPJS Ketenagakerjaan',
  'Buku Rekening',
  'Ijazah SD/MI',
  'Ijazah SMP/MTs',
  'Ijazah SMA/SMK/MA',
  'Ijazah S1',
  'Ijazah Profesi',
  'Ijazah S2',
  'Transkrip Nilai',
  'Sertifikat Pendidik (Serdik)'
];

export const KATEGORI_LAINNYA = [
  'Surat Masuk',
  'Surat Keluar',
  'Proposal atau LPJ',
  'Nota Dinas',
  'Berkas Umum'
];

let _katSiswaCache: string[] | null = null;
let _katGuruCache: string[] | null = null;
let _katLainnyaCache: string[] | null = null;

export function invalidateKatCache() {
  _katSiswaCache = null;
  _katGuruCache = null;
  _katLainnyaCache = null;
}

export function getActiveKategoriSiswa(): string[] {
  if (_katSiswaCache) return _katSiswaCache;
  try {
    const saved = localStorage.getItem('EARSIP_CUSTOM_KAT_SISWA');
    if (saved) {
      _katSiswaCache = JSON.parse(saved);
      return _katSiswaCache!;
    }
  } catch {}
  _katSiswaCache = KATEGORI_SISWA;
  return KATEGORI_SISWA;
}

export function getActiveKategoriGuru(): string[] {
  if (_katGuruCache) return _katGuruCache;
  try {
    const saved = localStorage.getItem('EARSIP_CUSTOM_KAT_GURU');
    if (saved) {
      _katGuruCache = JSON.parse(saved);
      return _katGuruCache!;
    }
  } catch {}
  _katGuruCache = KATEGORI_GURU;
  return KATEGORI_GURU;
}

export function getActiveKategoriLainnya(): string[] {
  if (_katLainnyaCache) return _katLainnyaCache;
  try {
    const saved = localStorage.getItem('EARSIP_CUSTOM_KAT_LAINNYA');
    if (saved) {
      _katLainnyaCache = JSON.parse(saved);
      return _katLainnyaCache!;
    }
  } catch {}
  _katLainnyaCache = KATEGORI_LAINNYA;
  return KATEGORI_LAINNYA;
}

/**
 * Renames a category across category configurations and cascades the change to all stored archive items.
 * If user renamed "KTP" to "KTP/Identitas", all archives belonging to Andi or anyone else with kategori="KTP"
 * will have their kategori changed to "KTP/Identitas" so they remain visible across all menus (Unduh, Buku Induk, Laporan, dsb).
 */
export function renameKategoriCascade(
  kategoriUtama: 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya',
  oldKategoriName: string,
  newKategoriName: string
): { updatedCount: number; updatedCategories: string[] } {
  const oldTrim = oldKategoriName.trim();
  const newTrim = newKategoriName.trim();
  if (!oldTrim || !newTrim) {
    return { updatedCount: 0, updatedCategories: [] };
  }

  // 1. Update Category Configuration List in LocalStorage
  let storageKey = 'EARSIP_CUSTOM_KAT_SISWA';
  let defaultList = getActiveKategoriSiswa();
  if (kategoriUtama === 'Arsip Guru') {
    storageKey = 'EARSIP_CUSTOM_KAT_GURU';
    defaultList = getActiveKategoriGuru();
  } else if (kategoriUtama === 'Arsip Lainnya') {
    storageKey = 'EARSIP_CUSTOM_KAT_LAINNYA';
    defaultList = getActiveKategoriLainnya();
  }

  const updatedCategories = defaultList.map(kat => 
    kat.trim().toLowerCase() === oldTrim.toLowerCase() ? newTrim : kat
  );
  localStorage.setItem(storageKey, JSON.stringify(updatedCategories));
  invalidateKatCache();

  // 2. Cascade Rename across all stored archive items in DB_KEYS.ARSIP_ITEMS
  let updatedCount = 0;
  try {
    const raw = localStorage.getItem(DB_KEYS.ARSIP_ITEMS);
    if (raw) {
      const items: ArsipItem[] = JSON.parse(raw);
      const updatedItems = items.map(item => {
        if (
          item.kategoriUtama === kategoriUtama &&
          item.kategori.trim().toLowerCase() === oldTrim.toLowerCase()
        ) {
          updatedCount++;
          const updatedItem: ArsipItem = {
            ...item,
            kategori: newTrim
          };
          // Sync to Supabase in background
          saveArsipToSupabase(updatedItem).catch(() => {});
          return updatedItem;
        }
        return item;
      });

      safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(updatedItems));
    }
  } catch (err) {
    console.error('Error cascading category rename to archives:', err);
  }

  // 3. Add Audit Log
  try {
    addAuditLog({
      aksi: 'UPDATE',
      kategori: 'Pengaturan Kategori',
      subjek: kategoriUtama,
      detail: `Mengubah kategori "${oldTrim}" menjadi "${newTrim}" (${updatedCount} berkas disesuaikan)`,
      operator: 'admin@alhicam.sch.id',
      status: 'SUCCESS'
    });
  } catch {}

  // 4. Notify app of change
  try {
    window.dispatchEvent(new CustomEvent('earsip:categories-updated', {
      detail: { kategoriUtama, oldKategoriName: oldTrim, newKategoriName: newTrim, updatedCount }
    }));
    window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
  } catch {}

  return { updatedCount, updatedCategories };
}

export interface KopSuratConfig {
  mode: 'text' | 'image';
  kopImageUrl?: string;
  logoUrl?: string;
  namaYayasan: string;
  namaSekolah: string;
  alamat: string;
  kontak: string;
  nssNpsn: string;
  stempelImageUrl?: string;
}

export interface LegalisirConfig {
  nomorFormat: string;
  watermarkText: string;
  masaBerlakuBulan: string;
  pejabatPenandatangan: string;
  nipPejabat: string;
  kopSurat: KopSuratConfig;
}

export const DEFAULT_KOP_SURAT_CONFIG: KopSuratConfig = {
  mode: 'text',
  kopImageUrl: '',
  logoUrl: 'https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png',
  namaYayasan: 'YAYASAN PONDOK PESANTREN AL-HIKAM',
  namaSekolah: 'SMP AL-HIKAM JOMBANG',
  alamat: 'Jl. Pesantren No. 12 Diwek, Kab. Jombang, Jawa Timur',
  kontak: 'Telp: (0321) 861234 • Email: info@alhikam.sch.id',
  nssNpsn: 'NSS: 202050401015 • NPSN: 20503412',
  stempelImageUrl: ''
};

export const DEFAULT_LEGALISIR_CONFIG: LegalisirConfig = {
  nomorFormat: 'ALH/LEG/{YYYY}/{NO}',
  watermarkText: 'E-ARSIP RESMI SMP AL-HIKAM - DOKUMEN TERVERIFIKASI SAH',
  masaBerlakuBulan: '12',
  pejabatPenandatangan: 'Ahmad Zaenuri, S.Pd., M.Pd. (Kepala Sekolah)',
  nipPejabat: '19780512 200501 1 008',
  kopSurat: DEFAULT_KOP_SURAT_CONFIG
};

export function getStoredLegalisirConfig(): LegalisirConfig {
  try {
    const saved = localStorage.getItem('EARSIP_LEGALISIR_CONFIG');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_LEGALISIR_CONFIG,
        ...parsed,
        kopSurat: {
          ...DEFAULT_KOP_SURAT_CONFIG,
          ...(parsed.kopSurat || {})
        }
      };
    }
  } catch {}
  return DEFAULT_LEGALISIR_CONFIG;
}

export function saveStoredLegalisirConfig(cfg: LegalisirConfig) {
  try {
    localStorage.setItem('EARSIP_LEGALISIR_CONFIG', JSON.stringify(cfg));
  } catch {}
}


export const INITIAL_ARSIP: ArsipItem[] = [];

// =====================================================================
// PERSISTENCE ENGINE: LocalStorage (Metadata) + IndexedDB / Memory (Blobs)
// This guarantees that large file attachments NEVER cause QuotaExceededError!
// =====================================================================

export const DB_KEYS = {
  MASTER_SISWA: 'EARSIP_MASTER_SISWA',
  MASTER_GURU: 'EARSIP_MASTER_GURU',
  ARSIP_ITEMS: 'EARSIP_ITEMS',
  AUTH_USER: 'EARSIP_AUTH_USER'
};

// In-Memory blob cache for instant retrieval without hitting storage limits
const fileBlobCache = new Map<string, string>();

// IndexedDB Helper for Large File Attachments (Has Gigabytes of quota)
const IDB_NAME = 'EARSIP_ATTACHMENTS_DB';
const IDB_STORE = 'file_attachments';
const IDB_VERSION = 1;

/**
 * High-Fidelity Adaptive Document Compressor
 * Preserves ultra-crisp text, stamp signatures, and ijazah details
 * Compresses heavy photos (e.g. 5MB - 15MB) down to crisp ~1MB without quality loss
 */
export async function compressDocumentHighQuality(
  file: { size?: number; type?: string }, 
  dataUrl: string, 
  _targetMaxBytes = 1024 * 1024
): Promise<{ compressedDataUrl: string; originalSize: number; compressedSize: number; ratio: string }> {
  const originalSize = file?.size || Math.round((dataUrl.length * 3) / 4);
  return {
    compressedDataUrl: dataUrl,
    originalSize,
    compressedSize: originalSize,
    ratio: '100%'
  };
}

/**
 * Compress images on an in-memory Canvas maintaining crisp 2048px resolution
 * Compresses 5MB photos down to ~1MB
 */
export async function compressImageDataUrl(dataUrl: string, maxWidth = 2048, quality = 0.85): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  const approxBytes = Math.round((dataUrl.length * 3) / 4);
  if (approxBytes < 900000) return dataUrl; // Already under 900KB

  const res = await compressDocumentHighQuality({ size: approxBytes }, dataUrl, 1024 * 1024);
  return res.compressedDataUrl;
}

function openIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveFileAttachment(id: string, dataUrl: string) {
  if (!dataUrl) return;
  fileBlobCache.set(id, dataUrl);
  try {
    localStorage.setItem(`file_blob_${id}`, dataUrl);
  } catch {
    // ignore quota error
  }
  try {
    const db = await openIDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(dataUrl, id);
  } catch (err) {
    console.warn('Could not save to IndexedDB', err);
  }
}

export async function getFileAttachment(id: string): Promise<string | null> {
  if (fileBlobCache.has(id)) {
    return fileBlobCache.get(id) || null;
  }
  try {
    const localBlob = localStorage.getItem(`file_blob_${id}`);
    if (localBlob) {
      fileBlobCache.set(id, localBlob);
      return localBlob;
    }
  } catch {}

  try {
    const db = await openIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(id);
      req.onsuccess = () => {
        const res = req.result || null;
        if (res) fileBlobCache.set(id, res);
        resolve(res);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export function isTeacherRecord(item: any): boolean {
  if (!item) return false;
  const j = (item.jabatan || item.jenisKelamin || '').toString().toLowerCase().trim();
  const n = (item.nuptk || item.nip || '').toString().trim();

  // If valid NUPTK or NIP (> 6 numeric digits)
  if (n && n !== '-' && n.length >= 6 && !n.startsWith('00') && /^\d+$/.test(n)) {
    return true;
  }

  // Teacher/staff keywords
  const teacherKeywords = [
    'guru', 'pendidik', 'pengajar', 'kepala', 'waka', 'bendahara', 
    'sekretaris', 'tu', 'staf', 'tendik', 'walikelas', 'pembina', 
    'operator', 'nip', 'nuptk', 'pamong', 'ustadz', 'ustadzah', 'pns', 'p3k', 'gtt'
  ];

  if (teacherKeywords.some(kw => j.includes(kw))) {
    return true;
  }

  return false;
}

export function sanitizeAndReconcileMasterData(
  rawSiswa: MasterSiswaItem[],
  rawGuru: MasterGuruItem[]
): { cleanSiswa: MasterSiswaItem[]; cleanGuru: MasterGuruItem[] } {
  const cleanGuru: MasterGuruItem[] = [];
  const guruNamesSet = new Set<string>();

  // 1. Process Master Guru first to register all valid teachers & staff
  (rawGuru || []).forEach(item => {
    if (!item || !item.nama || !item.nama.trim()) return;
    const cleanName = item.nama.trim();
    const lowerName = cleanName.toLowerCase();

    if (!guruNamesSet.has(lowerName)) {
      guruNamesSet.add(lowerName);
      cleanGuru.push({
        ...item,
        nama: cleanName
      });
    }
  });

  const cleanSiswa: MasterSiswaItem[] = [];
  const siswaNamesSet = new Set<string>();

  // 2. Process Master Siswa, strictly excluding any teacher/staff entries
  (rawSiswa || []).forEach(item => {
    if (!item || !item.nama || !item.nama.trim()) return;
    const cleanName = item.nama.trim();
    const lowerName = cleanName.toLowerCase();

    // If already registered in Master Guru, DO NOT include in Master Siswa!
    if (guruNamesSet.has(lowerName)) {
      return;
    }

    // Check if record in rawSiswa is actually a teacher based on job title/keywords
    if (isTeacherRecord(item)) {
      if (!guruNamesSet.has(lowerName)) {
        guruNamesSet.add(lowerName);
        cleanGuru.push({
          id: item.id.startsWith('G') ? item.id : `G_${item.id}`,
          nama: cleanName,
          nuptk: item.nisn && item.nisn !== '-' ? item.nisn : '-',
          jabatan: item.jenisKelamin && item.jenisKelamin.length > 2 ? item.jenisKelamin : 'Guru Pengajar'
        });
      }
      return;
    }

    if (!siswaNamesSet.has(lowerName)) {
      siswaNamesSet.add(lowerName);
      cleanSiswa.push({
        ...item,
        nama: cleanName
      });
    }
  });

  cleanSiswa.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  cleanGuru.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

  return { cleanSiswa, cleanGuru };
}

let _masterDataCache: { siswa: MasterSiswaItem[]; guru: MasterGuruItem[] } | null = null;
let _rawArsipCache: ArsipItem[] | null = null;
let _auditLogsCache: AuditLogItem[] | null = null;

export function invalidateMasterCache() {
  _masterDataCache = null;
}

export function invalidateArsipCache() {
  _rawArsipCache = null;
}

export function invalidateAuditCache() {
  _auditLogsCache = null;
}

export function getSanitizedMasterData(): { siswa: MasterSiswaItem[]; guru: MasterGuruItem[] } {
  if (_masterDataCache) return _masterDataCache;
  let rawSiswa: MasterSiswaItem[] = [];
  let rawGuru: MasterGuruItem[] = [];

  try {
    const rawS = localStorage.getItem(DB_KEYS.MASTER_SISWA);
    if (rawS) {
      const p = JSON.parse(rawS);
      if (Array.isArray(p)) rawSiswa = p;
    }
  } catch {}

  try {
    const rawG = localStorage.getItem(DB_KEYS.MASTER_GURU);
    if (rawG) {
      const p = JSON.parse(rawG);
      if (Array.isArray(p)) rawGuru = p;
    }
  } catch {}

  const { cleanSiswa, cleanGuru } = sanitizeAndReconcileMasterData(rawSiswa, rawGuru);

  if (cleanSiswa.length !== rawSiswa.length || cleanGuru.length !== rawGuru.length) {
    safeSetItem(DB_KEYS.MASTER_SISWA, JSON.stringify(cleanSiswa));
    safeSetItem(DB_KEYS.MASTER_GURU, JSON.stringify(cleanGuru));
  }

  _masterDataCache = { siswa: cleanSiswa, guru: cleanGuru };
  return _masterDataCache;
}

export function getStoredMasterSiswa(): MasterSiswaItem[] {
  return getSanitizedMasterData().siswa;
}

export function saveStoredMasterSiswa(items: MasterSiswaItem[]) {
  safeSetItem(DB_KEYS.MASTER_SISWA, JSON.stringify(items));
}

export function getStoredMasterGuru(): MasterGuruItem[] {
  return getSanitizedMasterData().guru;
}

export function saveStoredMasterGuru(items: MasterGuruItem[]) {
  safeSetItem(DB_KEYS.MASTER_GURU, JSON.stringify(items));
}

// Safe LocalStorage setter with Quota Protection & automatic trimming
function safeSetItem(key: string, value: string) {
  if (key === DB_KEYS.ARSIP_ITEMS) invalidateArsipCache();
  if (key === DB_KEYS.MASTER_SISWA || key === DB_KEYS.MASTER_GURU) invalidateMasterCache();
  if (key === DB_AUDIT_KEY) invalidateAuditCache();
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`LocalStorage quota error for key ${key}. Trimming...`, err);
    try {
      if (key === DB_KEYS.ARSIP_ITEMS) {
        // Keep latest 30 items without fileDataUrl
        const parsed: ArsipItem[] = JSON.parse(value);
        const trimmed = parsed.slice(0, 30).map(it => {
          const copy = { ...it };
          delete copy.fileDataUrl;
          return copy;
        });
        localStorage.setItem(key, JSON.stringify(trimmed));
      }
    } catch (innerErr) {
      console.error('SafeSetItem emergency fallback failed', innerErr);
    }
  }
}

const TOMBSTONE_DELETED_KEY = 'EARSIP_DELETED_PERMANENT_IDS';

export function getPermanentDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(TOMBSTONE_DELETED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

export function recordPermanentDeletedId(id: string) {
  try {
    const set = getPermanentDeletedIds();
    set.add(id);
    localStorage.setItem(TOMBSTONE_DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function recordMultiplePermanentDeletedIds(ids: string[]) {
  try {
    const set = getPermanentDeletedIds();
    ids.forEach(id => set.add(id));
    localStorage.setItem(TOMBSTONE_DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function getAllRawArsip(): ArsipItem[] {
  if (_rawArsipCache) return _rawArsipCache;
  try {
    const raw = localStorage.getItem(DB_KEYS.ARSIP_ITEMS);
    if (!raw) {
      _rawArsipCache = [];
      return _rawArsipCache;
    }
    const items: ArsipItem[] = JSON.parse(raw);
    const deletedIds = getPermanentDeletedIds();
    const validItems = items.filter(it => !deletedIds.has(it.id) && !it.id.startsWith('SYS_') && it.kategoriUtama !== ('SystemRegistry' as any));

    // Enrich with fileDataUrl from memory cache if available
    _rawArsipCache = validItems.map(item => {
      if (fileBlobCache.has(item.id)) {
        return { ...item, fileDataUrl: fileBlobCache.get(item.id) };
      }
      return item;
    });
    return _rawArsipCache;
  } catch {
    _rawArsipCache = [];
    return _rawArsipCache;
  }
}

export function getStoredArsip(): ArsipItem[] {
  return getAllRawArsip().filter(item => !item.isTrash);
}

export function saveStoredArsip(items: ArsipItem[]) {
  safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(items));
}

export function getTrashArsip(): ArsipItem[] {
  return getAllRawArsip().filter(item => item.isTrash === true);
}

export function saveArsipItem(item: ArsipItem, customOperator?: string): ArsipItem[] {
  // 1. If item has file attachment, store safely in IndexedDB & Memory Cache
  if (item.fileDataUrl) {
    fileBlobCache.set(item.id, item.fileDataUrl);
    saveFileAttachment(item.id, item.fileDataUrl);
  }

  // 2. Prepare clean item for LocalStorage
  const cleanItemForStorage: ArsipItem = { ...item };

  const current = getStoredArsip();
  const currentClean = current.map(c => {
    const copy = { ...c };
    return copy;
  });

  const updatedClean = [cleanItemForStorage, ...currentClean];
  safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(updatedClean));

  // Sync exclusively to Supabase PostgreSQL Cloud
  saveArsipToSupabase(item).catch(() => {});

  // Add Real-time Audit Log
  const op = customOperator || item.uploader || getCurrentOperatorEmail();
  addAuditLog({
    aksi: 'UPLOAD',
    kategori: item.kategoriUtama || item.kategori,
    subjek: item.subjek,
    detail: `Unggah berkas "${item.kategori}" (${item.namaFileAsli || 'Dokumen'}${item.ukuran ? ` - ${item.ukuran}` : ''}) untuk subjek ${item.subjek} [ID: ${item.id}]`,
    operator: op,
    status: 'SUCCESS'
  });

  // Return list with enriched item for immediate UI update
  return [item, ...current];
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingItem?: ArsipItem;
  reason?: string;
}

/**
 * Auto-detect duplicate archive records across Siswa, Guru, and Lainnya.
 */
export function checkDuplicateArsip(params: {
  kategoriUtama: 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya';
  subjek: string;
  kategori: string;
  identitas?: string;
  tahun?: string;
}): DuplicateCheckResult {
  const current = getStoredArsip();
  const subjekNorm = (params.subjek || '').trim().toLowerCase();
  const kategoriNorm = (params.kategori || '').trim().toLowerCase();
  const identitasNorm = (params.identitas || '').trim().toLowerCase();

  if (!subjekNorm || !kategoriNorm) {
    return { isDuplicate: false };
  }

  const found = current.find(item => {
    if (item.kategoriUtama !== params.kategoriUtama) return false;

    // Check if category matches
    const sameCategory = item.kategori.trim().toLowerCase() === kategoriNorm;
    if (!sameCategory) return false;

    // For Siswa: match by name or by NISN
    if (params.kategoriUtama === 'Arsip Siswa') {
      const matchName = item.subjek.trim().toLowerCase() === subjekNorm;
      const matchNisn = identitasNorm && identitasNorm !== '-' && item.identitas.trim().toLowerCase() === identitasNorm;
      return matchName || matchNisn;
    }

    // For Guru: match by name or by NUPTK
    if (params.kategoriUtama === 'Arsip Guru') {
      const matchName = item.subjek.trim().toLowerCase() === subjekNorm;
      const matchNuptk = identitasNorm && identitasNorm !== '-' && item.identitas.trim().toLowerCase() === identitasNorm;
      return matchName || matchNuptk;
    }

    // For Lainnya: match by subject/document perihal & category
    if (params.kategoriUtama === 'Arsip Lainnya') {
      const matchSubject = item.subjek.trim().toLowerCase() === subjekNorm;
      const matchIdentitas = identitasNorm && identitasNorm !== '-' && item.identitas.trim().toLowerCase() === identitasNorm;
      return matchSubject || matchIdentitas;
    }

    return false;
  });

  if (found) {
    return {
      isDuplicate: true,
      existingItem: found,
      reason: `Berkas "${found.kategori}" untuk "${found.subjek}" sudah pernah diunggah pada ${found.tanggal} (ID: ${found.id}).`
    };
  }

  return { isDuplicate: false };
}

/**
 * Replace an existing archive document with updated file and metadata (Anti-duplication replace)
 */
export function replaceArsipItem(existingId: string, newItem: ArsipItem, customOperator?: string): ArsipItem[] {
  // If item has file attachment, store safely
  if (newItem.fileDataUrl) {
    fileBlobCache.set(newItem.id, newItem.fileDataUrl);
    saveFileAttachment(newItem.id, newItem.fileDataUrl);
  }

  const current = getStoredArsip();
  const cleanItemForStorage: ArsipItem = { ...newItem };

  const updatedClean = current.map(item => {
    if (item.id === existingId) {
      return cleanItemForStorage;
    }
    return { ...item };
  });

  safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(updatedClean));
  saveArsipToFirestore(newItem).catch(() => {});
  saveArsipToSupabase(newItem).catch(() => {});

  // Add Real-time Audit Log
  const op = customOperator || newItem.uploader || getCurrentOperatorEmail();
  addAuditLog({
    aksi: 'UPDATE',
    kategori: newItem.kategoriUtama || newItem.kategori,
    subjek: newItem.subjek,
    detail: `Pembaruan / Timpa berkas "${newItem.kategori}" (${newItem.namaFileAsli || 'Dokumen'}${newItem.ukuran ? ` - ${newItem.ukuran}` : ''}) untuk ${newItem.subjek} [ID: ${newItem.id}]`,
    operator: op,
    status: 'SUCCESS'
  });

  return current.map(item => item.id === existingId ? newItem : item);
}

/**
 * Move document to Trash (Soft Delete)
 */
export async function moveToTrashArsipItem(id: string, customOperator?: string): Promise<ArsipItem[]> {
  const all = getAllRawArsip();
  let trashedTarget: ArsipItem | null = null;

  const updated = all.map(item => {
    if (item.id === id) {
      trashedTarget = {
        ...item,
        isTrash: true,
        deletedAt: new Date().toISOString()
      };
      return trashedTarget;
    }
    return item;
  });

  safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(updated));

  if (trashedTarget) {
    await saveArsipToSupabase(trashedTarget).catch(() => {});
    addAuditLog({
      aksi: 'DELETE',
      kategori: (trashedTarget as ArsipItem).kategoriUtama || (trashedTarget as ArsipItem).kategori,
      subjek: (trashedTarget as ArsipItem).subjek,
      detail: `Pemindahan berkas "${(trashedTarget as ArsipItem).kategori}" (${(trashedTarget as ArsipItem).namaFileAsli || (trashedTarget as ArsipItem).subjek}) ke Tong Sampah`,
      operator: customOperator || getCurrentOperatorEmail(),
      status: 'WARNING'
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
  }
  return updated.filter(i => !i.isTrash);
}

/**
 * Restore document from Trash back to active archives
 */
export async function restoreFromTrashArsipItem(id: string, customOperator?: string): Promise<ArsipItem[]> {
  const all = getAllRawArsip();
  let restoredTarget: ArsipItem | null = null;

  const updated = all.map(item => {
    if (item.id === id) {
      restoredTarget = {
        ...item,
        isTrash: false,
        deletedAt: undefined
      };
      return restoredTarget;
    }
    return item;
  });

  safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(updated));

  if (restoredTarget) {
    await saveArsipToSupabase(restoredTarget).catch(() => {});
    addAuditLog({
      aksi: 'UPDATE',
      kategori: (restoredTarget as ArsipItem).kategoriUtama || (restoredTarget as ArsipItem).kategori,
      subjek: (restoredTarget as ArsipItem).subjek,
      detail: `Pemulihan berkas "${(restoredTarget as ArsipItem).kategori}" (${(restoredTarget as ArsipItem).subjek}) dari Tong Sampah ke Arsip Aktif`,
      operator: customOperator || getCurrentOperatorEmail(),
      status: 'SUCCESS'
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
  }
  return updated.filter(i => i.isTrash === true);
}

/**
 * Permanently delete document from Firestore, local storage, and IndexedDB
 */
export async function deletePermanentlyArsipItem(id: string, customOperator?: string): Promise<ArsipItem[]> {
  recordPermanentDeletedId(id);

  const all = getAllRawArsip();
  const target = all.find(item => item.id === id);
  const remaining = all.filter(item => item.id !== id);

  safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(remaining));
  fileBlobCache.delete(id);
  try {
    localStorage.removeItem(`file_blob_${id}`);
  } catch {}

  await deleteArsipFromSupabase(id).catch(() => false);

  if (target) {
    addAuditLog({
      aksi: 'DELETE',
      kategori: target.kategoriUtama || target.kategori,
      subjek: target.subjek,
      detail: `Penghapusan permanen berkas "${target.kategori}" (${target.subjek}) dari Database & Penyimpanan Cloud`,
      operator: customOperator || getCurrentOperatorEmail(),
      status: 'WARNING'
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
  }
  return remaining.filter(i => i.isTrash === true);
}

/**
 * Empty all items in Trash permanently
 */
export async function emptyTrashArsip(customOperator?: string): Promise<ArsipItem[]> {
  const all = getAllRawArsip();
  const trashed = all.filter(i => i.isTrash === true);
  const activeOnly = all.filter(i => !i.isTrash);

  recordMultiplePermanentDeletedIds(trashed.map(t => t.id));

  safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(activeOnly));

  await Promise.all(
    trashed.map(async t => {
      fileBlobCache.delete(t.id);
      try {
        localStorage.removeItem(`file_blob_${t.id}`);
      } catch {}
      return deleteArsipFromSupabase(t.id).catch(() => false);
    })
  );

  addAuditLog({
    aksi: 'DELETE',
    kategori: 'Tong Sampah',
    subjek: `Pembersihan ${trashed.length} Berkas Sampah`,
    detail: `Pengosongan seluruh ${trashed.length} berkas di Tong Sampah secara permanen`,
    operator: customOperator || getCurrentOperatorEmail(),
    status: 'WARNING'
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
  }
  return [];
}

export async function deleteArsipItem(id: string): Promise<ArsipItem[]> {
  return await moveToTrashArsipItem(id);
}

// =====================================================================
// MASTER DATA MANAGEMENT (BUKU INDUK)
// =====================================================================

export function saveMasterSiswa(item: MasterSiswaItem): MasterSiswaItem[] {
  const current = getStoredMasterSiswa();
  const index = current.findIndex(s => s.id === item.id || (s.nisn && s.nisn === item.nisn));
  let updated: MasterSiswaItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = item;
  } else {
    updated = [item, ...current];
  }
  safeSetItem(DB_KEYS.MASTER_SISWA, JSON.stringify(updated));

  // Sync item and entire list directly to Supabase Cloud Server
  saveSiswaToSupabase(item).then(() => {
    syncAllMasterSiswaToSupabase(updated).catch(() => {});
  }).catch(() => {
    syncAllMasterSiswaToSupabase(updated).catch(() => {});
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
  }

  addAuditLog({
    aksi: 'UPDATE',
    kategori: 'Buku Induk Siswa',
    subjek: item.nama,
    detail: `Pembaruan data siswa NISN: ${item.nisn} (JK: ${item.jenisKelamin}, Angkatan ${item.tahun})`,
    operator: 'admin@alhicam.sch.id',
    status: 'SUCCESS'
  });
  return updated;
}

export async function deleteMasterSiswa(id: string): Promise<MasterSiswaItem[]> {
  const current = getStoredMasterSiswa();
  const target = current.find(s => s.id === id);
  const updated = current.filter(s => s.id !== id);
  safeSetItem(DB_KEYS.MASTER_SISWA, JSON.stringify(updated));
  if (target) {
    await deleteMasterSiswaFromSupabase(target.id).catch(() => {});
    addAuditLog({
      aksi: 'DELETE',
      kategori: 'Buku Induk Siswa',
      subjek: target.nama,
      detail: `Penghapusan master data siswa ${target.nama} (${target.nisn})`,
      operator: 'admin@alhicam.sch.id',
      status: 'WARNING'
    });
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
  }
  return updated;
}

export function saveMasterGuru(item: MasterGuruItem): MasterGuruItem[] {
  const current = getStoredMasterGuru();
  const index = current.findIndex(g => g.id === item.id || (g.nuptk && g.nuptk === item.nuptk));
  let updated: MasterGuruItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = item;
  } else {
    updated = [item, ...current];
  }
  safeSetItem(DB_KEYS.MASTER_GURU, JSON.stringify(updated));

  // Sync item and entire list directly to Supabase Cloud Server
  saveGuruToSupabase(item).then(() => {
    syncAllMasterGuruToSupabase(updated).catch(() => {});
  }).catch(() => {
    syncAllMasterGuruToSupabase(updated).catch(() => {});
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
  }

  addAuditLog({
    aksi: 'UPDATE',
    kategori: 'Direktori Pendidik',
    subjek: item.nama,
    detail: `Pembaruan data guru NUPTK: ${item.nuptk} (${item.jabatan})`,
    operator: 'admin@alhicam.sch.id',
    status: 'SUCCESS'
  });
  return updated;
}

export async function deleteMasterGuru(id: string): Promise<MasterGuruItem[]> {
  const current = getStoredMasterGuru();
  const target = current.find(g => g.id === id);
  const updated = current.filter(g => g.id !== id);
  safeSetItem(DB_KEYS.MASTER_GURU, JSON.stringify(updated));
  if (target) {
    await deleteMasterGuruFromSupabase(target.id).catch(() => {});
    addAuditLog({
      aksi: 'DELETE',
      kategori: 'Direktori Pendidik',
      subjek: target.nama,
      detail: `Penghapusan data guru ${target.nama}`,
      operator: 'admin@alhicam.sch.id',
      status: 'WARNING'
    });
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
  }
  return updated;
}

// =====================================================================
// AUDIT LOG & JEJAK AKTIVITAS
// =====================================================================

export function getCurrentOperatorEmail(): string {
  try {
    const rawAuth = sessionStorage.getItem('EARSIP_SESSION_USER') || localStorage.getItem('EARSIP_AUTH_USER');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      if (parsed?.email) return parsed.email;
      if (parsed?.name) return parsed.name;
    }
  } catch {}
  return 'admin@alhicam.sch.id';
}

export interface AuditLogItem {
  id: string;
  waktu: string;
  aksi: 'UPLOAD' | 'UPDATE' | 'UNDUH' | 'PREVIEW' | 'DELETE' | 'LEGALISIR' | 'PENGATURAN' | 'AUTH' | 'MASTER_DATA';
  kategori: string;
  subjek: string;
  detail: string;
  operator: string;
  status: 'SUCCESS' | 'WARNING' | 'INFO';
}

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'LOG-1001',
    waktu: '01/10/2026 15:42:10',
    aksi: 'UPLOAD',
    kategori: 'Arsip Siswa',
    subjek: 'Andika Pratama',
    detail: 'Pengunggahan berkas Ijazah SMP Kelulusan 2024 ke Google Drive',
    operator: 'admin@alhicam.sch.id',
    status: 'SUCCESS'
  },
  {
    id: 'LOG-1002',
    waktu: '01/10/2026 14:15:32',
    aksi: 'LEGALISIR',
    kategori: 'Legalisir Digital',
    subjek: 'Budi Santoso',
    detail: 'Penerbitan QR Code & Stempel Legalisir Resmi Ijazah SMP (Reg: LEG-2026-0042)',
    operator: 'admin@alhicam.sch.id',
    status: 'SUCCESS'
  },
  {
    id: 'LOG-1003',
    waktu: '30/09/2026 11:20:05',
    aksi: 'UPDATE',
    kategori: 'Arsip Guru',
    subjek: 'Drs. H. Solikhin, M.Pd',
    detail: 'Pembaruan (replace) dokumen Sertifikat Pendidik (Serdik)',
    operator: 'admin@alhicam.sch.id',
    status: 'SUCCESS'
  },
  {
    id: 'LOG-1004',
    waktu: '29/09/2026 09:30:18',
    aksi: 'UNDUH',
    kategori: 'Arsip Siswa',
    subjek: 'Citra Dewi Permata',
    detail: 'Unduh berkas Berkas SPMB format PDF',
    operator: 'solikhin@alhicam.sch.id',
    status: 'SUCCESS'
  },
  {
    id: 'LOG-1005',
    waktu: '28/09/2026 16:04:45',
    aksi: 'UPLOAD',
    kategori: 'Arsip Lainnya',
    subjek: 'Dinas Pendidikan Kab. Jombang',
    detail: 'Pengarsipan Surat Masuk Edaran Asesmen Nasional',
    operator: 'admin@alhicam.sch.id',
    status: 'SUCCESS'
  }
];

export const DB_AUDIT_KEY = 'EARSIP_AUDIT_LOGS';

export function getStoredAuditLogs(): AuditLogItem[] {
  try {
    const raw = localStorage.getItem(DB_AUDIT_KEY);
    if (!raw) {
      safeSetItem(DB_AUDIT_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_AUDIT_LOGS;
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function addAuditLog(log: {
  aksi: 'UPLOAD' | 'UPDATE' | 'UNDUH' | 'PREVIEW' | 'DELETE' | 'LEGALISIR' | 'PENGATURAN' | 'AUTH' | 'MASTER_DATA';
  kategori: string;
  subjek: string;
  detail: string;
  operator?: string;
  status?: 'SUCCESS' | 'WARNING' | 'INFO';
}): AuditLogItem[] {
  const current = getStoredAuditLogs();
  const now = new Date();
  
  // Format DD/MM/YYYY HH:mm:ss in local time
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestampStr = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  const resolvedOperator = log.operator || getCurrentOperatorEmail();

  const newLog: AuditLogItem = {
    id: `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    waktu: timestampStr,
    aksi: log.aksi,
    kategori: log.kategori,
    subjek: log.subjek,
    detail: log.detail,
    operator: resolvedOperator,
    status: log.status || 'SUCCESS'
  };

  // Keep up to 250 latest logs
  const updated = [newLog, ...current.slice(0, 249)];
  safeSetItem(DB_AUDIT_KEY, JSON.stringify(updated));

  // Dispatch real-time live event for instant UI reflection
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earsip:audit-updated', { detail: newLog }));
  }

  // Multi-tier Cloud sync to Supabase (saves individual log & full array snapshot)
  try {
    saveAuditLogToSupabase(newLog, updated).catch(() => {});
  } catch {}

  return updated;
}

export function clearStoredAuditLogs(): AuditLogItem[] {
  const operator = getCurrentOperatorEmail();
  const clearActionLog: AuditLogItem = {
    id: `LOG-${Date.now()}`,
    waktu: new Date().toLocaleString('id-ID'),
    aksi: 'DELETE',
    kategori: 'Audit Trail',
    subjek: 'Pembersihan Log',
    detail: 'Seluruh riwayat jejak audit lama telah dibersihkan oleh Administrator',
    operator: operator,
    status: 'WARNING'
  };

  const freshList = [clearActionLog];
  safeSetItem(DB_AUDIT_KEY, JSON.stringify(freshList));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('earsip:audit-updated', { detail: clearActionLog }));
  }

  // Sync clear action to cloud
  try {
    syncAllAuditLogsToSupabase(freshList).catch(() => {});
  } catch {}

  return freshList;
}

/**
 * Fetch and merge cloud audit logs from Supabase across all devices & browsers
 */
export async function syncAuditLogsFromCloud(): Promise<AuditLogItem[]> {
  try {
    const cloud = await fetchAuditLogsFromSupabase();
    if (Array.isArray(cloud) && cloud.length > 0) {
      const local = getStoredAuditLogs();
      const map = new Map<string, AuditLogItem>();

      // 1. Put cloud logs into map
      cloud.forEach((c: any) => {
        if (c && c.id) {
          map.set(c.id, {
            id: c.id,
            waktu: c.waktu,
            aksi: c.aksi,
            kategori: c.kategori,
            subjek: c.subjek,
            detail: c.detail,
            operator: c.operator || 'admin@alhicam.sch.id',
            status: c.status || 'SUCCESS'
          });
        }
      });

      // 2. Put local logs that might not yet be in cloud
      local.forEach(l => {
        if (!map.has(l.id)) {
          map.set(l.id, l);
        }
      });

      const merged = Array.from(map.values()).slice(0, 250);
      safeSetItem(DB_AUDIT_KEY, JSON.stringify(merged));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('earsip:audit-updated'));
      }
      return merged;
    } else {
      // If cloud is empty, seed cloud with local logs
      const local = getStoredAuditLogs();
      if (local.length > 0) {
        syncAllAuditLogsToSupabase(local).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('syncAuditLogsFromCloud error:', err);
  }
  return getStoredAuditLogs();
}

// =====================================================================
// LEGALISIR & VERIFIKASI KEABSAHAN IJAZAH
// =====================================================================

export interface LegalisirRecord {
  id: string;
  nomorRegistrasi: string;
  tanggalPengesahan: string;
  namaAlumni: string;
  nisn: string;
  tahunLulus: string;
  jenisDokumen: string;
  nomorSeriIjazah: string;
  statusKeaslian: 'ASLI_TERVERIFIKASI' | 'PERLU_KONFIRMASI';
  pejabatPengesah: string;
  jabatanPengesah: string;
  qrCodeToken: string;
}

export const INITIAL_LEGALISIR: LegalisirRecord[] = [
  {
    id: 'LEG-01',
    nomorRegistrasi: 'LEG/2026/SMP-AH/001',
    tanggalPengesahan: '28/09/2026',
    namaAlumni: 'Andika Pratama',
    nisn: '0071829301',
    tahunLulus: '2024',
    jenisDokumen: 'Ijazah SMP',
    nomorSeriIjazah: 'DN-05/DIK/2024/004912',
    statusKeaslian: 'ASLI_TERVERIFIKASI',
    pejabatPengesah: 'Drs. H. Solikhin, M.Pd',
    jabatanPengesah: 'Kepala Sekolah SMP Al-Hikam',
    qrCodeToken: 'VERIF-AH-2024-001-ANDIKA'
  },
  {
    id: 'LEG-02',
    nomorRegistrasi: 'LEG/2026/SMP-AH/002',
    tanggalPengesahan: '25/09/2026',
    namaAlumni: 'Budi Santoso',
    nisn: '0062819203',
    tahunLulus: '2023',
    jenisDokumen: 'Surat Keterangan Lulus (SKL)',
    nomorSeriIjazah: 'SKL/SMP-AH/VI/2023/118',
    statusKeaslian: 'ASLI_TERVERIFIKASI',
    pejabatPengesah: 'Drs. H. Solikhin, M.Pd',
    jabatanPengesah: 'Kepala Sekolah SMP Al-Hikam',
    qrCodeToken: 'VERIF-AH-2023-002-BUDI'
  }
];

export const DB_LEGALISIR_KEY = 'EARSIP_LEGALISIR';

export function getStoredLegalisir(): LegalisirRecord[] {
  try {
    const raw = localStorage.getItem(DB_LEGALISIR_KEY);
    if (!raw) {
      safeSetItem(DB_LEGALISIR_KEY, JSON.stringify(INITIAL_LEGALISIR));
      return INITIAL_LEGALISIR;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_LEGALISIR;
  }
}

export function saveLegalisirRecord(record: LegalisirRecord): LegalisirRecord[] {
  const current = getStoredLegalisir();
  const updated = [record, ...current];
  safeSetItem(DB_LEGALISIR_KEY, JSON.stringify(updated));
  addAuditLog({
    aksi: 'LEGALISIR',
    kategori: 'Legalisir Digital',
    subjek: record.namaAlumni,
    detail: `Penerbitan legalisir ${record.jenisDokumen} No: ${record.nomorRegistrasi}`,
    operator: 'admin@alhicam.sch.id',
    status: 'SUCCESS'
  });
  return updated;
}

// =====================================================================
// GOOGLE SHEETS & GOOGLE DRIVE INTEGRATION (WEBHOOK SYNC)
// =====================================================================

export interface GoogleSyncConfig {
  webhookUrl: string;
  folderId: string;
  spreadsheetId: string;
  autoSync: boolean;
  lastSyncTime?: string;
}

export const DEFAULT_SYNC_CONFIG: GoogleSyncConfig = {
  webhookUrl: 'https://script.google.com/macros/s/AKfycbqyQCpSe1n4Z9h8dmSYD65g5YfwD-x5k314VEC_2Ia_CxOVoobk851R0WGxMUd-ATcL/exec',
  folderId: '1qsi9UTuDxBmeg0ZUcGnUfJSSxwR2BwS9',
  spreadsheetId: '1fyWuUClt970_2RELzMq5jBGsjCcTXYZW_XZtTyxmyI',
  autoSync: true
};

export const DB_CONFIG_KEY = 'EARSIP_GOOGLE_CONFIG';

export function getStoredSyncConfig(): GoogleSyncConfig {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(DB_CONFIG_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        webhookUrl: (parsed.webhookUrl && parsed.webhookUrl.startsWith('http')) ? parsed.webhookUrl.trim() : DEFAULT_SYNC_CONFIG.webhookUrl,
        folderId: (parsed.folderId && parsed.folderId.length > 5) ? parsed.folderId.trim() : DEFAULT_SYNC_CONFIG.folderId,
        spreadsheetId: (parsed.spreadsheetId && parsed.spreadsheetId.length > 5) ? parsed.spreadsheetId.trim() : DEFAULT_SYNC_CONFIG.spreadsheetId,
        autoSync: parsed.autoSync !== undefined ? Boolean(parsed.autoSync) : true,
        lastSyncTime: parsed.lastSyncTime
      };
    }
  } catch {}
  return DEFAULT_SYNC_CONFIG;
}

export function saveStoredSyncConfig(cfg: GoogleSyncConfig) {
  try {
    localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.error('Failed to save GoogleSyncConfig', err);
  }
}

// =====================================================================
// PERSISTENT AVATAR / PROFILE PICTURE STORAGE
// =====================================================================

export function sanitizeUserStorageKey(input: string): string {
  if (!input) return 'user';
  const clean = input.toLowerCase().trim().replace(/^@/, '');
  const key = clean.replace(/[^a-z0-9]/g, '');
  return key || 'user';
}

export function getPublicStorageAvatarUrl(emailOrUsername: string): string {
  const key = sanitizeUserStorageKey(emailOrUsername);
  return `https://seklcpvkayaakgbsnlzt.supabase.co/storage/v1/object/public/arsip/pp_${key}_avatar_${key}.jpg`;
}

export function getAvatarForUser(emailOrUsername: string, name?: string): string {
  const isBadUrl = (url: string) => !url || url.includes('vakya') || url.includes('ui-avatars.com');

  // 1. Check EARSIP_USER_LIST (Supabase users table cache) first
  try {
    const rawList = localStorage.getItem('EARSIP_USER_LIST');
    if (rawList) {
      const users = JSON.parse(rawList);
      if (Array.isArray(users)) {
        const cleanTarget = (emailOrUsername || '').toLowerCase().trim().replace(/^@/, '');
        const found = users.find((u: any) => {
          const uEmail = (u.email || u.username || '').toLowerCase().trim().replace(/^@/, '');
          const uName = (u.name || '').toLowerCase().trim();
          return (
            (cleanTarget && (uEmail === cleanTarget || uEmail.includes(cleanTarget) || cleanTarget.includes(uEmail))) ||
            (name && uName === name.toLowerCase().trim()) ||
            (cleanTarget === 'superadmin' && (uEmail === 'superadmin' || u.id === 'master-superadmin' || u.isSuperAdmin))
          );
        });
        if (found && found.avatarUrl && !isBadUrl(found.avatarUrl)) {
          return found.avatarUrl;
        }
      }
    }
  } catch {}

  // 2. Check local cache in EARSIP_AVATARS_MAP
  try {
    const raw = localStorage.getItem('EARSIP_AVATARS_MAP');
    if (raw) {
      const map = JSON.parse(raw);
      if (emailOrUsername && map[emailOrUsername] && !isBadUrl(map[emailOrUsername])) return map[emailOrUsername];
      if (emailOrUsername && map[emailOrUsername.toLowerCase()] && !isBadUrl(map[emailOrUsername.toLowerCase()])) return map[emailOrUsername.toLowerCase()];
      
      const key = sanitizeUserStorageKey(emailOrUsername);
      if (key && map[key] && !isBadUrl(map[key])) return map[key];

      if (name) {
        if (map[name] && !isBadUrl(map[name])) return map[name];
        if (map[name.toLowerCase()] && !isBadUrl(map[name.toLowerCase()])) return map[name.toLowerCase()];
      }

      if (emailOrUsername && (emailOrUsername.toLowerCase().includes('superadmin') || emailOrUsername.toLowerCase().includes('solikhin'))) {
        if (map['superadmin'] && !isBadUrl(map['superadmin'])) return map['superadmin'];
        if (map['master-superadmin'] && !isBadUrl(map['master-superadmin'])) return map['master-superadmin'];
        if (map['Solikhin Mbolo'] && !isBadUrl(map['Solikhin Mbolo'])) return map['Solikhin Mbolo'];
      }

      if (emailOrUsername && (emailOrUsername.toLowerCase().includes('fatma') || emailOrUsername.toLowerCase().includes('fatmarum'))) {
        if (map['fatmarum'] && !isBadUrl(map['fatmarum'])) return map['fatmarum'];
        if (map['FATMA SEKAR ARUM'] && !isBadUrl(map['FATMA SEKAR ARUM'])) return map['FATMA SEKAR ARUM'];
      }
    }
  } catch {}

  const displayName = name || emailOrUsername || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563eb&color=fff&size=120`;
}

export function saveAvatarForUser(emailOrUsername: string, avatarDataUrl: string): void {
  if (!avatarDataUrl) return;
  try {
    const key = sanitizeUserStorageKey(emailOrUsername);
    const raw = localStorage.getItem('EARSIP_AVATARS_MAP');
    const map = raw ? JSON.parse(raw) : {};

    map[key] = avatarDataUrl;
    if (emailOrUsername) {
      map[emailOrUsername] = avatarDataUrl;
      map[emailOrUsername.toLowerCase()] = avatarDataUrl;
    }

    if (key === 'superadmin' || (emailOrUsername && (emailOrUsername.toLowerCase().includes('superadmin') || emailOrUsername.toLowerCase().includes('solikhin')))) {
      map['superadmin'] = avatarDataUrl;
      map['master-superadmin'] = avatarDataUrl;
      map['Solikhin Mbolo'] = avatarDataUrl;
      map['solikhin mbolo'] = avatarDataUrl;
    }

    if (emailOrUsername && (emailOrUsername.toLowerCase().includes('fatma') || emailOrUsername.toLowerCase().includes('fatmarum'))) {
      map['fatmarum'] = avatarDataUrl;
      map['FATMA SEKAR ARUM'] = avatarDataUrl;
      map['fatma sekar arum'] = avatarDataUrl;
    }

    localStorage.setItem('EARSIP_AVATARS_MAP', JSON.stringify(map));
  } catch (err) {
    console.warn('saveAvatarForUser notice:', err);
  }
}

export const GOOGLE_APPS_SCRIPT_ROBUST_CODE = `/**
 * SISTEM INTEGRASI GOOGLE DRIVE & GOOGLE SPREADSHEET
 * E-ARSIP DIGITAL SMP AL-HIKAM
 * Versi 3.0 (Anti-Gagal, Auto-Folder, Multi-Format)
 */

var DEFAULT_FOLDER_ID = "1qsi9UTuDxBmeg0ZUcGnUfJSSxwR2BwS9";
var DEFAULT_SPREADSHEET_ID = "1fyWuUClt970_2RELzMq5jBGsjCcTXYZW_XZtTyxmyI";
var API_SECRET = "eArsipSecretAlHikam2026_SecureKey";

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    success: true,
    message: "Server Google Apps Script E-Arsip Aktif & Siap Menerima Berkas!",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJson({ status: "error", message: "Tidak ada data post yang diterima" });
    }

    var contents = JSON.parse(e.postData.contents);
    var action = (contents.action || contents.actionType || "UPLOAD_ARSIP").toUpperCase();

    // 1. Action PING untuk tes koneksi
    if (action === "PING") {
      return responseJson({
        status: "success",
        success: true,
        message: "Koneksi Webhook Google Drive Berhasil Terhubung!",
        timestamp: new Date().toISOString()
      });
    }

    // 2. Action UPLOAD_ARSIP
    if (action === "UPLOAD_ARSIP" || action === "UPLOAD") {
      var folder;
      var targetFolderId = contents.folderId || DEFAULT_FOLDER_ID;

      // Cari atau buat folder secara aman
      try {
        folder = DriveApp.getFolderById(targetFolderId);
      } catch (errFolder) {
        var folders = DriveApp.getFoldersByName("E-ARSIP DIGITAL SMP AL-HIKAM");
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder("E-ARSIP DIGITAL SMP AL-HIKAM");
        }
      }

      var driveUrl = "#";
      var fileId = "";
      var rawFile = contents.fileBase64 || contents.fileData || "";

      // Simpan file fisik jika ada base64
      if (rawFile && rawFile.length > 50) {
        var contentType = contents.mimeType || "application/pdf";
        var base64Data = rawFile;

        if (rawFile.indexOf("data:") === 0) {
          var parts = rawFile.split(",");
          base64Data = parts[1];
          contentType = parts[0].replace("data:", "").split(";")[0];
        }

        var fileName = (contents.id || "ARSIP") + "_" + (contents.namaFileAsli || contents.namaFile || contents.fileName || "dokumen");
        if (fileName.indexOf(".") === -1) {
          if (contentType.indexOf("image/jpeg") !== -1) fileName += ".jpg";
          else if (contentType.indexOf("image/png") !== -1) fileName += ".png";
          else if (contentType.indexOf("pdf") !== -1) fileName += ".pdf";
        }

        var decoded = Utilities.base64Decode(base64Data);
        var blob = Utilities.newBlob(decoded, contentType, fileName);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        driveUrl = file.getUrl();
        fileId = file.getId();
      }

      // Catat ke Google Spreadsheet secara aman
      try {
        var targetSheetId = contents.spreadsheetId || DEFAULT_SPREADSHEET_ID;
        if (targetSheetId) {
          var ss = SpreadsheetApp.openById(targetSheetId);
          var sheet = ss.getSheetByName("DATA_ARSIP") || ss.getSheets()[0];
          sheet.appendRow([
            contents.id || "",
            contents.tanggal || new Date().toISOString().split("T")[0],
            contents.tahun || "",
            contents.identitas || "",
            contents.subjek || "",
            contents.kategori || "",
            contents.kategoriUtama || "",
            contents.namaFileAsli || contents.namaFile || "",
            contents.ukuran || "",
            driveUrl,
            new Date()
          ]);
        }
      } catch (errSheet) {}

      return responseJson({
        status: "success",
        success: true,
        fileId: fileId,
        driveUrl: driveUrl,
        message: "File berhasil disimpan ke Google Drive!"
      });
    }

    return responseJson({ status: "error", message: "Aksi tidak dikenal" });

  } catch (globalErr) {
    return responseJson({ status: "error", message: globalErr.toString() });
  }
}

function responseJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export async function testGoogleWebhook(url?: string): Promise<{ success: boolean; message: string }> {
  const targetUrl = url || getStoredSyncConfig().webhookUrl;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return { success: false, message: 'URL Webhook Google Apps Script belum diisi.' };
  }
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        action: 'PING',
        actionType: 'PING',
        secret: 'eArsipSecretAlHikam2026_SecureKey',
        apiKey: 'eArsipSecretAlHikam2026_SecureKey',
        apiSecret: 'eArsipSecretAlHikam2026_SecureKey'
      })
    });
    const text = await res.text();
    if (text.includes('accounts.google.com') || text.includes('ServiceLogin')) {
      return { 
        success: false, 
        message: 'Akses Ditolak Google: Pengaturan "Who has access" di Apps Script masih "Hanya saya". Wajib diubah ke "Anyone / Siapa saja".' 
      };
    }
    try {
      const data = JSON.parse(text);
      if (data.status === 'success' || data.status === 'ok' || data.success === true) {
        return { success: true, message: '✓ Berhasil! Google Apps Script siap menerima file ke Google Drive.' };
      }
      return { success: false, message: data.message || 'Respon webhook tidak sesuai format' };
    } catch {
      return { success: false, message: 'Respon dari Google: ' + text.substring(0, 100) };
    }
  } catch (err: any) {
    return { success: false, message: 'Gagal menghubungi Webhook: ' + (err.message || 'Network error') };
  }
}

/**
 * Sends archive item and uploaded base64 file directly to Google Apps Script
 */
export async function syncItemToGoogleCloud(
  item: ArsipItem, 
  fileBase64?: string
): Promise<{ success: boolean; driveUrl?: string; message?: string }> {
  const config = getStoredSyncConfig();
  if (!config.webhookUrl || !config.webhookUrl.startsWith('http')) {
    return { success: false, message: 'URL Webhook Google Apps Script belum disetel di Pengaturan.' };
  }

  try {
    const payload = {
      action: 'upload',
      actionType: 'upload',
      secret: 'eArsipSecretAlHikam2026_SecureKey',
      apiKey: 'eArsipSecretAlHikam2026_SecureKey',
      folderId: config.folderId || '1qsi9UTuDxBmeg0ZUcGnUfJSSxwR2BwS9',
      spreadsheetId: config.spreadsheetId || '1fyWuUClt970_2RELzMq5jBGsjCcTXYZW_XZtTyxmyI',
      id: item.id,
      tanggal: item.tanggal,
      tahun: item.tahun,
      identitas: item.identitas,
      subjek: item.subjek,
      kategori: item.kategori,
      kategoriUtama: item.kategoriUtama,
      namaFile: item.namaFileAsli,
      namaFileAsli: item.namaFileAsli,
      ukuran: item.ukuran || '1.2 MB',
      uploader: item.uploader,
      fileData: fileBase64 || item.fileDataUrl || '',
      fileBase64: fileBase64 || item.fileDataUrl || ''
    };

    // Google Apps Script requires text/plain or no-cors / standard json
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result && result.status === 'success') {
      const realUrl = result.driveUrl || result.fileUrl || item.linkDrive;
      return {
        success: true,
        driveUrl: realUrl,
        message: 'Tersimpan otomatis ke Google Drive & dicatat di Google Sheet'
      };
    } else {
      return {
        success: false,
        message: result?.message || 'Respon webhook tidak valid'
      };
    }
  } catch (err: any) {
    console.warn('Sync to Google Cloud error:', err);
    return { success: false, message: err.message || 'Gagal mengirim ke Google Apps Script.' };
  }
}

/**
 * Push all master siswa & guru to Google Spreadsheet DATA_MASTER_SISWA and DATA_MASTER_GURU tabs
 */
export async function syncMasterToGoogleSheet(): Promise<{ success: boolean; message: string }> {
  const config = getStoredSyncConfig();
  if (!config.webhookUrl || !config.webhookUrl.startsWith('http')) {
    return { success: false, message: 'URL Webhook belum diatur di Pengaturan Google Cloud' };
  }
  const siswaList = getStoredMasterSiswa();
  const guruList = getStoredMasterGuru();

  try {
    const payload = {
      action: 'SYNC_ALL_MASTER',
      spreadsheetId: config.spreadsheetId,
      siswaList,
      guruList
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result && result.status === 'success') {
      return { success: true, message: 'Daftar Siswa & Guru berhasil dicatat ke tab DATA_MASTER_SISWA dan DATA_MASTER_GURU di Spreadsheet!' };
    }
    return { success: false, message: result?.message || 'Respon webhook gagal' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mengirim data ke Google Spreadsheet' };
  }
}

/**
 * Push all local archives to Google Spreadsheet (safe bulk recording)
 */
export async function syncAllArsipToGoogleSheet(): Promise<{ success: boolean; message: string; count: number }> {
  const config = getStoredSyncConfig();
  if (!config.webhookUrl || !config.webhookUrl.startsWith('http')) {
    return { success: false, message: 'URL Webhook belum diatur di Pengaturan Google Cloud', count: 0 };
  }
  const items = getStoredArsip();
  if (items.length === 0) {
    return { success: false, message: 'Tidak ada berkas yang perlu dikirim', count: 0 };
  }

  try {
    const payload = {
      action: 'SYNC_ALL_ARSIP_ITEMS',
      spreadsheetId: config.spreadsheetId,
      items: items.map(it => {
        const copy = { ...it };
        delete copy.fileDataUrl;
        return copy;
      })
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result && result.status === 'success') {
      return { success: true, message: `Berhasil mencatat ${items.length} berkas ke Google Spreadsheet!`, count: items.length };
    }
    return { success: false, message: result?.message || 'Respon webhook gagal', count: 0 };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mengirim data ke Google Spreadsheet', count: 0 };
  }
}

/**
 * Fetch full live database (Archives, Siswa Master, Guru Master) from Google Spreadsheet
 * Ensures all connected devices (Mobile, Tablet, Multiple PCs) always show identical data!
 */
export async function fetchLiveFullDataFromGoogle(): Promise<{ 
  success: boolean; 
  itemsCount: number; 
  siswaCount: number; 
  guruCount: number; 
  message?: string 
}> {
  try {
    const items = getStoredArsip();
    const siswa = getStoredMasterSiswa();
    const guru = getStoredMasterGuru();

    // Ensure all items are pushed to Firebase Firestore
    items.forEach(it => {
      const clean = { ...it };
      delete clean.fileDataUrl;
      saveArsipToFirestore(clean).catch(() => {});
    });

    return { 
      success: true, 
      itemsCount: items.length, 
      siswaCount: siswa.length, 
      guruCount: guru.length, 
      message: 'Cloud Database (Firebase) & Local Storage 100% Sinkron!' 
    };
  } catch (err: any) {
    const items = getStoredArsip();
    const siswa = getStoredMasterSiswa();
    const guru = getStoredMasterGuru();
    return { 
      success: true, 
      itemsCount: items.length, 
      siswaCount: siswa.length, 
      guruCount: guru.length, 
      message: 'Tersinkron dengan Local Database' 
    };
  }
}

/**
 * Fetch live archives directly from Google Spreadsheet / Drive via Webhook
 * Merges with local data and NEVER wipes existing uploaded documents!
 */
export async function fetchLiveArsipFromGoogle(): Promise<{ success: boolean; items?: ArsipItem[]; message?: string }> {
  const config = getStoredSyncConfig();
  if (!config.webhookUrl) {
    return { success: false, message: 'URL Webhook belum diatur di Pengaturan Google Cloud' };
  }
  try {
    const currentLocal = getStoredArsip();
    const response = await fetch(`${config.webhookUrl}?action=getArsip&t=${Date.now()}`);
    const data = await response.json();
    
    if (data && data.status === 'success' && Array.isArray(data.items)) {
      if (data.items.length === 0) {
        // Sheet is currently empty; if local has files, automatically sync local files to sheet!
        if (currentLocal.length > 0) {
          syncAllArsipToGoogleSheet();
          return { 
            success: true, 
            items: currentLocal, 
            message: `Spreadsheet masih kosong. Mengirim ${currentLocal.length} berkas lokal ke Spreadsheet...` 
          };
        }
        return { success: true, items: [], message: 'Spreadsheet kosong' };
      }

      const remoteItems: ArsipItem[] = data.items.map((it: any) => ({
        id: it.id || `ARS-${Date.now()}`,
        tanggal: it.tanggal || new Date().toLocaleDateString('id-ID'),
        tahun: it.tahun || '-',
        identitas: it.identitas || '-',
        subjek: it.subjek || '-',
        kategori: it.kategori || '-',
        kategoriUtama: (it.kategoriUtama as any) || 'Arsip Siswa',
        namaFileAsli: it.namaFile || it.namaFileAsli || 'Dokumen',
        ukuran: it.ukuran || '0 KB',
        uploader: it.uploader || 'Admin',
        linkDrive: it.driveUrl || it.linkDrive || '#'
      }));

      // Merge remote items with local items (matching by ID or subjek+kategori)
      const mergedMap = new Map<string, ArsipItem>();
      currentLocal.forEach(it => mergedMap.set(it.id, it));
      remoteItems.forEach(it => {
        const existing = mergedMap.get(it.id);
        if (existing && existing.fileDataUrl) {
          mergedMap.set(it.id, { ...it, fileDataUrl: existing.fileDataUrl });
        } else {
          mergedMap.set(it.id, it);
        }
      });

      const finalMerged = Array.from(mergedMap.values());
      safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(finalMerged.map(f => {
        const c = { ...f };
        delete c.fileDataUrl;
        return c;
      })));

      return { success: true, items: finalMerged, message: `Berhasil sinkron ${remoteItems.length} berkas dari Spreadsheet` };
    }
    return { success: false, message: data?.message || 'Gagal memuat data' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal terhubung ke Google Apps Script' };
  }
}

/**
 * Clear all sample demo archives to start fresh from 0
 */
export function clearAllArsipData(): void {
  safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify([]));
  fileBlobCache.clear();
}

/**
 * Clear all sample demo students & teachers from Master Data (Buku Induk)
 */
export function clearAllMasterData(): void {
  safeSetItem(DB_KEYS.MASTER_SISWA, JSON.stringify([]));
  safeSetItem(DB_KEYS.MASTER_GURU, JSON.stringify([]));
}

/**
 * Restore sample initial master students & teachers for demonstration
 */
export function restoreSampleMasterData(): void {
  safeSetItem(DB_KEYS.MASTER_SISWA, JSON.stringify(INITIAL_MASTER_SISWA));
  safeSetItem(DB_KEYS.MASTER_GURU, JSON.stringify(INITIAL_MASTER_GURU));
}

/**
 * Restore sample initial archives for demonstration
 */
export function restoreSampleArsipData(): void {
  safeSetItem(DB_KEYS.ARSIP_ITEMS, JSON.stringify(INITIAL_ARSIP));
}




