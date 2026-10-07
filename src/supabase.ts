import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  ArsipItem, 
  MasterSiswaItem, 
  MasterGuruItem, 
  getAvatarForUser, 
  saveAvatarForUser, 
  sanitizeUserStorageKey, 
  getPublicStorageAvatarUrl,
  sanitizeAndReconcileMasterData,
  getStoredSyncConfig,
  invalidateMasterCache
} from './data/mockDatabase';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isEnabled: boolean;
}

const STORAGE_KEY_SUPABASE = 'EARSIP_SUPABASE_CONFIG';

// Helper to sanitize Supabase URL
export function sanitizeSupabaseUrl(rawUrl: string): string {
  const DEFAULT_FALLBACK = 'https://seklcpvkayaakgbsnlzt.supabase.co';
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return DEFAULT_FALLBACK;
  }
  
  let cleaned = rawUrl.trim();

  // Auto-correct typo where 'vakya' was typed instead of 'vkaya'
  if (cleaned.includes('seklcpvakyaakgbsnlzt')) {
    cleaned = cleaned.replace('seklcpvakyaakgbsnlzt', 'seklcpvkayaakgbsnlzt');
  }

  try {
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'https://' + cleaned;
    }
    const parsed = new URL(cleaned);
    let hostname = parsed.hostname;
    if (!hostname || !hostname.includes('.')) {
      return cleaned;
    }
    if (hostname.endsWith('.supabase.com')) {
      hostname = hostname.replace(/\.supabase\.com$/, '.supabase.co');
    }
    if (hostname.includes('seklcpvakyaakgbsnlzt')) {
      hostname = hostname.replace('seklcpvakyaakgbsnlzt', 'seklcpvkayaakgbsnlzt');
    }
    return `${parsed.protocol}//${hostname}`;
  } catch {
    return cleaned;
  }
}

export const DEFAULT_SUPABASE_URL = 'https://seklcpvkayaakgbsnlzt.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNla2xjcHZrYXlhYWtnYnNubHp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNDMwNjgsImV4cCI6MjEwNjYxOTA2OH0.p2SGTN1Qr-BR5I4qy4wPVM_GoydQNqr4BoUZfLI5nPM';

// Default Supabase configuration (fallback to permanent hardcoded default, env, or localStorage)
export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SUPABASE);
    if (saved) {
      const parsed = JSON.parse(saved);
      let rawUrl = parsed.url || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      if (rawUrl.includes('seklcpvakyaakgbsnlzt')) {
        rawUrl = rawUrl.replace('seklcpvakyaakgbsnlzt', 'seklcpvkayaakgbsnlzt');
      }
      const rawKey = (parsed.anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
      return {
        url: sanitizeSupabaseUrl(rawUrl) || DEFAULT_SUPABASE_URL,
        anonKey: rawKey || DEFAULT_SUPABASE_ANON_KEY,
        isEnabled: parsed.isEnabled !== false
      };
    }
  } catch {}

  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: ((import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY).trim(),
    isEnabled: true
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig) {
  try {
    const cleanConfig = {
      ...config,
      url: sanitizeSupabaseUrl(config.url),
      anonKey: (config.anonKey || '').trim()
    };
    localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(cleanConfig));
    cachedClient = null; // Reset client instance
    
    // Automatically persist to server if valid key is present
    if (cleanConfig.url && cleanConfig.anonKey) {
      syncConfigToServer(cleanConfig).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to save Supabase config to localStorage:', err);
  }
}

export async function syncConfigToServer(config: SupabaseConfig): Promise<boolean> {
  if (!config.url || !config.anonKey) return false;
  try {
    const res = await fetch('/api/server-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: sanitizeSupabaseUrl(config.url),
        anonKey: config.anonKey.trim(),
        isEnabled: true,
        updatedAt: new Date().toISOString()
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchConfigFromServer(): Promise<SupabaseConfig | null> {
  try {
    let res = await fetch('/api/server-config');
    if (!res.ok) {
      res = await fetch('/supabase-config.json');
    }
    if (res.ok) {
      const data = await res.json();
      if (data && data.url && data.anonKey && data.anonKey.trim().length > 10) {
        const fullConfig: SupabaseConfig = {
          url: sanitizeSupabaseUrl(data.url),
          anonKey: data.anonKey.trim(),
          isEnabled: data.isEnabled !== false
        };
        saveStoredSupabaseConfig(fullConfig);
        return fullConfig;
      }
    }
  } catch {
    // quiet fallback
  }
  return null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey || !config.anonKey.trim()) {
    return null;
  }

  try {
    const validUrl = sanitizeSupabaseUrl(config.url);
    const cleanKey = config.anonKey.trim();
    cachedClient = createClient(validUrl, cleanKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          'apikey': cleanKey,
          'Authorization': `Bearer ${cleanKey}`
        }
      }
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Test Supabase connectivity
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return {
      success: false,
      message: 'Supabase URL atau Anon Key belum dikonfigurasi.'
    };
  }

  const validUrl = sanitizeSupabaseUrl(config.url);
  const cleanKey = config.anonKey.trim();

  // 1. Direct Ping test to Supabase REST endpoint to verify network reachability
  let serverReachable = false;
  try {
    const pingRes = await fetch(`${validUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': cleanKey,
        'Authorization': `Bearer ${cleanKey}`
      }
    });
    if (pingRes.ok || pingRes.status === 200 || pingRes.status === 400 || pingRes.status === 401 || pingRes.status === 404) {
      serverReachable = true;
    }
  } catch (pingErr) {
    console.warn('Direct ping notice:', pingErr);
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Gagal inisialisasi Supabase client.'
    };
  }

  try {
    const { data, error } = await client.from('arsip').select('id').limit(1);
    if (error) {
      // If table doesn't exist yet, mention SQL schema
      if (error.code === '42P01' || error.message?.includes('relation "arsip" does not exist') || error.message?.includes('does not exist')) {
        return {
          success: false,
          message: '⚠️ Server Terhubung! Namun tabel "arsip" belum dibuat. Klik tombol "📋 Salin Script SQL Schema" lalu Paste & Run di SQL Editor Supabase Anda.'
        };
      }
      return {
        success: false,
        message: `⚠️ Terhubung ke Server, namun query tabel gagal: ${error.message} (Kode: ${error.code})`
      };
    }

    return {
      success: true,
      message: '✓ Berhasil terhubung ke Supabase PostgreSQL Cloud!'
    };
  } catch (err: any) {
    if (serverReachable) {
      return {
        success: false,
        message: '⚠️ Server Supabase TERHUBUNG! Namun tabel "arsip" belum dibuat. Klik tombol "📋 Salin Script SQL Schema" lalu Run di SQL Editor Supabase.'
      };
    }
    return {
      success: false,
      message: `Gagal koneksi: ${err?.message || 'Memuat...'} Silakan pastikan Anda sudah menjalankan script SQL di Supabase SQL Editor.`
    };
  }
}

/**
 * Fetch all archives from Supabase
 */
export async function fetchArsipFromSupabase(): Promise<ArsipItem[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let allData: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await client
        .from('arsip')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
      } else {
        allData.push(...data);
        if (data.length < limit) {
          hasMore = false;
        } else {
          from += limit;
        }
      }
    }

    if (allData.length === 0) return [];

    return allData
      .filter((row: any) => !row.id.startsWith('SYS_') && row.kategori_utama !== 'SystemRegistry')
      .map((row: any) => ({
        id: row.id,
        tanggal: row.tanggal || '',
        tahun: row.tahun || '',
        identitas: row.identitas || '-',
        subjek: row.subjek || '',
        kategori: row.kategori || '',
        kategoriUtama: row.kategori_utama || 'Arsip Siswa',
        namaFileAsli: row.nama_file_asli || '',
        ukuran: row.ukuran || '',
        linkDrive: row.link_drive || '',
        uploader: row.uploader || 'admin@alhicam.sch.id',
        isTrash: Boolean(row.is_trash),
        deletedAt: row.deleted_at || undefined
      }));
  } catch (err) {
    console.warn('Supabase fetch failed:', err);
    return null;
  }
}

/**
 * Save / Upsert an archive item to Supabase
 */
export async function saveArsipToSupabase(item: ArsipItem): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = {
      id: item.id,
      tanggal: item.tanggal || '',
      tahun: item.tahun || '',
      identitas: item.identitas || '-',
      subjek: item.subjek || '',
      kategori: item.kategori || '',
      kategori_utama: item.kategoriUtama,
      nama_file_asli: item.namaFileAsli,
      ukuran: item.ukuran || '',
      link_drive: item.linkDrive || '',
      uploader: item.uploader || 'admin@alhicam.sch.id',
      is_trash: Boolean(item.isTrash),
      deleted_at: item.isTrash ? (item.deletedAt || new Date().toISOString()) : null,
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from('arsip')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase save exception:', err);
    return false;
  }
}

/**
 * Bulk save / sync all local archives to Supabase
 */
export async function syncAllArsipToSupabase(items: ArsipItem[]): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Koneksi Supabase belum aktif' };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const rows = items.map(item => ({
      id: item.id,
      tanggal: item.tanggal || '',
      tahun: item.tahun || '',
      identitas: item.identitas || '-',
      subjek: item.subjek || '',
      kategori: item.kategori || '',
      kategori_utama: item.kategoriUtama,
      nama_file_asli: item.namaFileAsli,
      ukuran: item.ukuran || '',
      link_drive: item.linkDrive || '',
      uploader: item.uploader || 'admin@alhicam.sch.id',
      is_trash: Boolean(item.isTrash),
      deleted_at: item.isTrash ? (item.deletedAt || new Date().toISOString()) : null,
      updated_at: new Date().toISOString()
    }));

    const CHUNK_SIZE = 100;
    let syncedCount = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await client
        .from('arsip')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error('Supabase bulk sync error:', error);
        return { success: false, count: syncedCount, error: error.message };
      }
      syncedCount += chunk.length;
    }

    return { success: true, count: syncedCount };
  } catch (err: any) {
    console.error('Supabase bulk sync exception:', err);
    return { success: false, count: 0, error: err?.message };
  }
}
export async function deleteArsipFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    // 1. Hapus baris data dari tabel PostgreSQL public.arsip
    const { error } = await client
      .from('arsip')
      .delete()
      .eq('id', id);

    // 2. Hapus berkas fisik langsung dari Supabase Storage Bucket 'arsip'
    try {
      const { data: fileList } = await client.storage.from('arsip').list('', { search: id });
      if (Array.isArray(fileList) && fileList.length > 0) {
        const filesToRemove = fileList.map(f => f.name);
        await client.storage.from('arsip').remove(filesToRemove);
      }
    } catch (e) {
      console.warn('Supabase storage file deletion notice:', e);
    }

    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase delete exception:', err);
    return false;
  }
}

/**
 * Save / update individual user directly in Supabase 'users' table (matches schema: id (uuid), nama, email, password, role)
 */
export async function saveSingleUserToSupabase(
  user: { id?: string; name: string; email: string; role?: string; password?: string; avatarUrl?: string },
  oldEmail?: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Koneksi Supabase belum aktif' };

  const cleanEmail = (user.email || '').trim().toLowerCase().replace(/^@/, '');
  const cleanOldEmail = (oldEmail || '').trim().toLowerCase().replace(/^@/, '');
  const cleanName = user.name || 'Pengguna';
  const cleanRole = user.role || 'Administrator Arsip';
  const cleanPassword = user.password || 'superadmin123';

  // UUID v4 format generator
  const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
  const userUuid = isUuid(user.id) ? user.id! : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '60f357d6-b7f8-49a8-8ec4-' + Date.now().toString(16).padEnd(12, '0'));

  try {
    // Auto-upload photo profile base64 to Supabase Storage bucket 'arsip' to get public HTTP link for cross-device sync
    const avatarKey = sanitizeUserStorageKey(cleanEmail);
    let publicAvatarUrl = user.avatarUrl || getPublicStorageAvatarUrl(avatarKey);

    if (user.avatarUrl && user.avatarUrl.startsWith('data:image')) {
      try {
        const uploadRes = await uploadFileToSupabaseStorage(`pp_${avatarKey}`, `avatar_${avatarKey}.jpg`, user.avatarUrl);
        if (uploadRes.success && uploadRes.publicUrl) {
          publicAvatarUrl = uploadRes.publicUrl;
        }
      } catch (e) {
        console.warn('Avatar storage upload warning:', e);
      }
    }

    if (publicAvatarUrl) {
      saveAvatarForUser(cleanEmail, publicAvatarUrl);
      saveAvatarForUser(avatarKey, publicAvatarUrl);
      if (cleanEmail === 'superadmin' || user.id === 'master-superadmin') {
        saveAvatarForUser('superadmin', publicAvatarUrl);
        saveAvatarForUser('master-superadmin', publicAvatarUrl);
      }
    }

    // 1. Cek baris akun di tabel 'users' secara aman tanpa mengasumsikan nama kolom spesifik
    const { data: allUsers } = await client.from('users').select('*');
    const existing = (allUsers || []).find((u: any) => {
      const uEmail = (u.email || u.username || '').toLowerCase().trim().replace(/^@/, '');
      const uId = u.id;
      return (
        uEmail === cleanEmail ||
        (cleanOldEmail && uEmail === cleanOldEmail) ||
        (user.id && uId === user.id) ||
        ((cleanEmail === 'superadmin' || cleanOldEmail === 'superadmin') && (uEmail === 'superadmin' || uId === 'master-superadmin'))
      );
    });

    // Helper penyesuaian payload adaptif (otomatis hapus kolom yang tidak ada di skema database)
    const executeAdaptiveUserWrite = async (operation: 'update' | 'insert', payload: any, targetId?: string) => {
      let currentPayload = { ...payload };
      let maxAttempts = 6;
      
      while (maxAttempts > 0) {
        maxAttempts--;
        let res: any;
        if (operation === 'update' && targetId) {
          res = await client.from('users').update(currentPayload).eq('id', targetId);
        } else {
          res = await client.from('users').insert([currentPayload]);
        }

        if (!res.error) {
          return { success: true };
        }

        const msg = res.error.message || '';
        console.warn(`Supabase user ${operation} notice:`, msg);

        // Deteksi kolom yang belum ada di schema cache Supabase
        const colMatch = msg.match(/Could not find the '(\w+)' column/i) || msg.match(/column "?(\w+)"? of relation/i);
        if (colMatch && colMatch[1]) {
          const badCol = colMatch[1];
          if (currentPayload[badCol] !== undefined) {
            delete currentPayload[badCol];
            continue;
          }
        }

        // Jika error UUID id
        if (msg.includes('invalid input syntax for type uuid') || msg.includes('uuid')) {
          if (currentPayload.id) {
            delete currentPayload.id;
            continue;
          }
        }

        // Hapus kolom opsional bertahap jika error persist
        if (currentPayload.email && (msg.includes('email') || res.error.code === '42703')) {
          delete currentPayload.email;
          continue;
        }
        if (currentPayload.nama && (msg.includes('nama') || res.error.code === '42703')) {
          delete currentPayload.nama;
          continue;
        }
        if (currentPayload.username && (msg.includes('username') || res.error.code === '42703')) {
          delete currentPayload.username;
          continue;
        }
        if (currentPayload.avatar_url && (msg.includes('avatar_url') || res.error.code === '42703')) {
          delete currentPayload.avatar_url;
          continue;
        }

        return { success: false, error: msg };
      }
      return { success: false, error: 'Gagal sinkronisasi akun pengguna' };
    };

    if (existing && existing.id) {
      // Update data baris yang sudah ada
      const updateData: any = {
        name: cleanName,
        nama: cleanName,
        username: cleanEmail,
        email: cleanEmail,
        password: cleanPassword,
        role: cleanRole,
        status: 'Aktif',
        avatar_url: publicAvatarUrl || user.avatarUrl || '',
        avatar: publicAvatarUrl || user.avatarUrl || ''
      };

      return await executeAdaptiveUserWrite('update', updateData, existing.id);
    } else {
      // Insert data akun baru ke Supabase
      const insertPayload: any = {
        id: userUuid,
        name: cleanName,
        nama: cleanName,
        username: cleanEmail,
        email: cleanEmail,
        password: cleanPassword,
        role: cleanRole,
        status: 'Aktif',
        avatar_url: publicAvatarUrl || user.avatarUrl || '',
        avatar: publicAvatarUrl || user.avatarUrl || ''
      };

      return await executeAdaptiveUserWrite('insert', insertPayload);
    }
  } catch (err: any) {
    console.error('saveSingleUserToSupabase exception:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Save user profile data to Supabase 'users' table
 */
export async function saveUserProfileToSupabase(user: { email: string; name: string; role?: string; avatarUrl?: string; password?: string }): Promise<boolean> {
  const res = await saveSingleUserToSupabase(user);
  return res.success;
}

/**
 * Delete user directly from Supabase 'users' table
 */
export async function deleteUserFromSupabase(email: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const cleanEmail = email.trim().toLowerCase().replace(/^@/, '');
    const { error } = await client.from('users').delete().or(`email.ilike.${cleanEmail},email.ilike.@${cleanEmail}`);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Sync entire user list to Supabase 'users' table
 */
export async function syncAllUsersToSupabase(users: Array<{ id?: string; name: string; email: string; role: string; status?: string; password?: string; avatarUrl?: string }>): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !Array.isArray(users) || users.length === 0) return { success: false, count: 0 };

  let successCount = 0;
  let lastError = '';

  for (const u of users) {
    const res = await saveSingleUserToSupabase(u);
    if (res.success) {
      successCount++;
    } else if (res.error) {
      lastError = res.error;
    }
  }

  return { success: successCount > 0, count: successCount, error: lastError || undefined };
}

/**
 * Fetch all users directly from Supabase 'users' table (with auto-seed if empty)
 */
export async function fetchUsersFromSupabase(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('users')
      .select('*');

    if (error) {
      console.warn('Supabase fetch users warning:', error.message);
      return null;
    }

    // Jika tabel users di Supabase masih kosong melompong (seperti di screenshot user),
    // otomatis MASUKKAN akun master Solikhin Mbolo ke Supabase!
    if (!Array.isArray(data) || data.length === 0) {
      await saveSingleUserToSupabase({
        name: 'Solikhin Mbolo',
        email: 'superadmin',
        password: 'superadmin123',
        role: 'Super Administrator'
      });

      return [
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
    }

    return data.map((d: any) => {
      const email = d.email || d.username || '';
      const name = d.name || d.nama || 'Pengguna';
      const rawAvatar = d.avatar_url || d.avatar || d.photo || '';
      const avatarUrl = (rawAvatar && !rawAvatar.includes('ui-avatars.com')) 
        ? rawAvatar 
        : getAvatarForUser(email, name);

      if (rawAvatar && !rawAvatar.includes('ui-avatars.com')) {
        saveAvatarForUser(email, rawAvatar);
        if (d.username) saveAvatarForUser(d.username, rawAvatar);
      }

      return {
        id: d.id || `usr-${email}`,
        name,
        email,
        role: d.role || 'Administrator Arsip',
        status: d.status || 'Aktif',
        password: d.password || 'superadmin123',
        avatarUrl,
        isSuperAdmin: (d.role || '').toLowerCase().includes('super') || email.toLowerCase() === 'superadmin'
      };
    });
  } catch {
    return null;
  }
}

/**
 * Direct Live Authentication against Supabase 'users' table
 */
export async function authenticateFromSupabaseDirect(usernameInput: string, passwordInput: string): Promise<{ success: boolean; user?: any; message: string }> {
  const cleanInput = usernameInput.trim().toLowerCase().replace(/^@/, '');
  const cleanPass = passwordInput.trim();

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('users')
        .select('*');

      if (!error && Array.isArray(data) && data.length > 0) {
        const found = data.find((d: any) => {
          const dEmail = (d.email || d.username || '').toLowerCase().trim().replace(/^@/, '');
          const dNama = (d.name || d.nama || '').toLowerCase().trim();
          return dEmail === cleanInput || dNama === cleanInput || (cleanInput === 'superadmin' && (dEmail === 'superadmin' || dEmail === 'superadmin@01'));
        });

        if (found) {
          if (found.status === 'Nonaktif') {
            return { success: false, message: 'Akun Anda sedang dinonaktifkan oleh Super Administrator.' };
          }

          const dbPassword = (found.password || ((found.email === 'superadmin' || found.username === 'superadmin' || found.id === 'master-superadmin') ? 'superadmin123' : '')).trim();
          if (cleanPass === dbPassword) {
            const userEmail = found.email || found.username || 'superadmin';
            const userName = found.name || found.nama || 'Solikhin Mbolo';
            return {
              success: true,
              user: {
                id: found.id,
                email: userEmail,
                name: userName,
                role: found.role || 'Administrator Arsip',
                avatarUrl: (found.avatar_url && !found.avatar_url.includes('ui-avatars.com')) 
                  ? found.avatar_url 
                  : getAvatarForUser(userEmail, userName)
              },
              message: 'Login berhasil!'
            };
          } else {
            return { success: false, message: 'Username / Paswword tidak sesuai, silahkan coba lagi..!' };
          }
        }
      }
    } catch (err) {
      console.warn('Supabase auth fallback:', err);
    }
  }

  return { success: false, message: 'Username / Paswword tidak sesuai, silahkan coba lagi..!' };
}

/**
 * Save / Upsert single Siswa to Supabase
 */
export async function saveSiswaToSupabase(item: MasterSiswaItem): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const row = {
      id: item.id,
      nisn: item.nisn || '',
      nama: item.nama || '',
      kelas: item.jenisKelamin || '',
      angkatan: item.tahun || ''
    };
    const { error } = await client
      .from('master_siswa')
      .upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase save siswa error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save siswa exception:', err);
    return false;
  }
}

/**
 * Save / Upsert single Guru to Supabase
 */
export async function saveGuruToSupabase(item: MasterGuruItem): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const row = {
      id: item.id,
      nuptk: item.nuptk || '',
      nama: item.nama || '',
      jabatan: item.jabatan || ''
    };
    const { error } = await client
      .from('master_guru')
      .upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase save guru error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save guru exception:', err);
    return false;
  }
}

/**
 * Delete single Siswa from Supabase
 */
export async function deleteMasterSiswaFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('master_siswa').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete single Guru from Supabase
 */
export async function deleteMasterGuruFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('master_guru').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Bulk sync all Siswa to Supabase
 */
export async function syncAllMasterSiswaToSupabase(items: MasterSiswaItem[]): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Koneksi Supabase belum aktif' };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, count: 0 };
  }
  try {
    const rows = items.map(s => ({
      id: s.id,
      nisn: s.nisn || '',
      nama: s.nama || '',
      kelas: s.jenisKelamin || '',
      angkatan: s.tahun || ''
    }));

    const CHUNK_SIZE = 100;
    let syncedCount = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await client
        .from('master_siswa')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error('Supabase bulk sync siswa error:', error);
        return { success: false, count: syncedCount, error: error.message };
      }
      syncedCount += chunk.length;
    }
    return { success: true, count: syncedCount };
  } catch (err: any) {
    console.error('Supabase bulk sync siswa exception:', err);
    return { success: false, count: 0, error: err?.message };
  }
}

/**
 * Bulk sync all Guru to Supabase
 */
export async function syncAllMasterGuruToSupabase(items: MasterGuruItem[]): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Koneksi Supabase belum aktif' };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, count: 0 };
  }
  try {
    const rows = items.map(g => ({
      id: g.id,
      nuptk: g.nuptk || '',
      nama: g.nama || '',
      jabatan: g.jabatan || ''
    }));

    const CHUNK_SIZE = 100;
    let syncedCount = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await client
        .from('master_guru')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error('Supabase bulk sync guru error:', error);
        return { success: false, count: syncedCount, error: error.message };
      }
      syncedCount += chunk.length;
    }
    return { success: true, count: syncedCount };
  } catch (err: any) {
    console.error('Supabase bulk sync guru exception:', err);
    return { success: false, count: 0, error: err?.message };
  }
}
export async function fetchSanitizedMasterDataFromSupabase(): Promise<{
  siswa: MasterSiswaItem[];
  guru: MasterGuruItem[];
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // Pagination helper to fetch all rows beyond default REST API limits
    const fetchAllRows = async (tableName: string) => {
      let allRows: any[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await client.from(tableName).select('*').range(from, from + limit - 1);
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allRows.push(...data);
          if (data.length < limit) {
            hasMore = false;
          } else {
            from += limit;
          }
        }
      }
      return allRows;
    };

    const [rawSiswaData, rawGuruData] = await Promise.all([
      fetchAllRows('master_siswa'),
      fetchAllRows('master_guru')
    ]);

    const rawSiswaList: MasterSiswaItem[] = Array.isArray(rawSiswaData)
      ? rawSiswaData.map((row: any) => ({
          id: row.id,
          nisn: row.nisn || '',
          nama: row.nama || '',
          jenisKelamin: row.jenis_kelamin || row.kelas || row.jabatan || '',
          tahun: row.angkatan || ''
        }))
      : [];

    const rawGuruList: MasterGuruItem[] = Array.isArray(rawGuruData)
      ? rawGuruData.map((row: any) => ({
          id: row.id,
          nuptk: row.nuptk || '',
          nama: row.nama || '',
          jabatan: row.jabatan || ''
        }))
      : [];

    const { cleanSiswa, cleanGuru } = sanitizeAndReconcileMasterData(rawSiswaList, rawGuruList);

    // Auto-purge misplaced records from Supabase tables asynchronously
    const guruNames = new Set(cleanGuru.map(g => g.nama.trim().toLowerCase()));
    const siswaNames = new Set(cleanSiswa.map(s => s.nama.trim().toLowerCase()));

    // Delete teachers from master_siswa table
    const misplacedTeacherIdsInSiswaTable = (Array.isArray(rawSiswaData) ? rawSiswaData : [])
      .filter((row: any) => row.id && row.nama && guruNames.has(row.nama.trim().toLowerCase()))
      .map((row: any) => row.id);

    if (misplacedTeacherIdsInSiswaTable.length > 0) {
      client.from('master_siswa').delete().in('id', misplacedTeacherIdsInSiswaTable).then(() => {});
    }

    // Delete students from master_guru table
    const misplacedStudentIdsInGuruTable = (Array.isArray(rawGuruData) ? rawGuruData : [])
      .filter((row: any) => row.id && row.nama && !guruNames.has(row.nama.trim().toLowerCase()) && siswaNames.has(row.nama.trim().toLowerCase()))
      .map((row: any) => row.id);

    if (misplacedStudentIdsInGuruTable.length > 0) {
      client.from('master_guru').delete().in('id', misplacedStudentIdsInGuruTable).then(() => {});
    }

    // Merge remote data with existing localStorage data so no local student/teacher records are lost
    let mergedSiswa = cleanSiswa;
    let mergedGuru = cleanGuru;

    if (typeof localStorage !== 'undefined') {
      try {
        const localSiswaRaw = localStorage.getItem('EARSIP_MASTER_SISWA');
        const localGuruRaw = localStorage.getItem('EARSIP_MASTER_GURU');
        const localSiswaList: MasterSiswaItem[] = localSiswaRaw && Array.isArray(JSON.parse(localSiswaRaw)) ? JSON.parse(localSiswaRaw) : [];
        const localGuruList: MasterGuruItem[] = localGuruRaw && Array.isArray(JSON.parse(localGuruRaw)) ? JSON.parse(localGuruRaw) : [];

        const siswaMap = new Map<string, MasterSiswaItem>();
        cleanSiswa.forEach(s => { if (s?.id || s?.nama) siswaMap.set(s.id || s.nama.trim().toLowerCase(), s); });
        localSiswaList.forEach(s => {
          if (!s?.id && !s?.nama) return;
          const key = s.id || s.nama.trim().toLowerCase();
          if (!siswaMap.has(key)) {
            siswaMap.set(key, s);
          }
        });
        mergedSiswa = Array.from(siswaMap.values());

        const guruMap = new Map<string, MasterGuruItem>();
        cleanGuru.forEach(g => { if (g?.id || g?.nama) guruMap.set(g.id || g.nama.trim().toLowerCase(), g); });
        localGuruList.forEach(g => {
          if (!g?.id && !g?.nama) return;
          const key = g.id || g.nama.trim().toLowerCase();
          if (!guruMap.has(key)) {
            guruMap.set(key, g);
          }
        });
        mergedGuru = Array.from(guruMap.values());

        localStorage.setItem('EARSIP_MASTER_SISWA', JSON.stringify(mergedSiswa));
        localStorage.setItem('EARSIP_MASTER_GURU', JSON.stringify(mergedGuru));
        invalidateMasterCache();

        // Auto-push any local records missing in Supabase Cloud
        if (mergedSiswa.length > cleanSiswa.length) {
          syncAllMasterSiswaToSupabase(mergedSiswa).catch(() => {});
        }
        if (mergedGuru.length > cleanGuru.length) {
          syncAllMasterGuruToSupabase(mergedGuru).catch(() => {});
        }
      } catch (err) {
        console.warn('Error merging local & Supabase master data:', err);
      }
    }

    return { siswa: mergedSiswa, guru: mergedGuru };
  } catch (err) {
    console.warn('Supabase fetch sanitized master exception:', err);
    return null;
  }
}

/**
 * Fetch all Siswa from Supabase
 */
export async function fetchMasterSiswaFromSupabase(): Promise<MasterSiswaItem[] | null> {
  const res = await fetchSanitizedMasterDataFromSupabase();
  return res ? res.siswa : null;
}

export async function clearMasterSiswaInSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('master_siswa').delete().neq('id', '___NEVER_MATCH___');
    return !error;
  } catch {
    return false;
  }
}

export async function clearMasterGuruInSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('master_guru').delete().neq('id', '___NEVER_MATCH___');
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch all Guru from Supabase
 */
export async function fetchMasterGuruFromSupabase(): Promise<MasterGuruItem[] | null> {
  const res = await fetchSanitizedMasterDataFromSupabase();
  return res ? res.guru : null;
}

/**
 * Upload file base64 directly to Supabase Storage bucket 'arsip'
 */
export async function uploadFileToSupabaseStorage(
  id: string,
  fileName: string,
  base64OrBlob: string | Blob
): Promise<{ success: boolean; publicUrl?: string; message?: string }> {
  const client = getSupabaseClient();
  if (!client || !base64OrBlob) {
    return { success: false, message: 'Supabase client belum aktif atau file kosong' };
  }

  try {
    let blob: Blob;
    let mimeType = 'application/octet-stream';

    if (base64OrBlob instanceof Blob) {
      blob = base64OrBlob;
      mimeType = blob.type || 'application/octet-stream';
    } else {
      const parts = base64OrBlob.split(',');
      if (parts.length > 1) {
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        blob = new Blob([array], { type: mimeType });
      } else {
        blob = new Blob([base64OrBlob], { type: mimeType });
      }
    }

    const safeExt = mimeType.includes('pdf') ? '.pdf' : mimeType.includes('png') ? '.png' : '.jpg';
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${id}_${cleanName}${cleanName.includes('.') ? '' : safeExt}`;

    const { error } = await client.storage
      .from('arsip')
      .upload(storagePath, blob, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      console.warn('Supabase storage upload error:', error);
      let errorMsg = error.message;
      if (error.message.includes('Bucket not found') || (error as any).statusCode === 404) {
        errorMsg = 'Bucket "arsip" belum dibuat di Supabase Storage.';
      } else if (error.message.includes('row-level security') || (error as any).statusCode === 403 || (error as any).statusCode === '403') {
        errorMsg = 'Izin upload ditolak (Storage RLS Policy). Jalankan script SQL izin storage di Supabase.';
      }
      return { success: false, message: errorMsg };
    }

    const { data: publicUrlData } = client.storage
      .from('arsip')
      .getPublicUrl(storagePath);

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      message: 'File berhasil diunggah ke Supabase Storage!'
    };
  } catch (err: any) {
    console.warn('Supabase storage exception:', err);
    return { success: false, message: err.message || 'Gagal upload ke Supabase Storage' };
  }
}

// Cached config to avoid repeated network calls
let cachedDriveConfig: { scriptUrl: string; scriptSecret: string } | null = null;

async function getDriveScriptConfig(): Promise<{ scriptUrl: string; scriptSecret: string } | null> {
  if (cachedDriveConfig && cachedDriveConfig.scriptUrl) {
    return cachedDriveConfig;
  }

  // Priority 1: Fetch server environment config (/api/drive/config) configured on Vercel
  try {
    const res = await fetch('/api/drive/config');
    if (res.ok) {
      const data = await res.json();
      if (data.hasConfig && data.scriptUrl && data.scriptUrl.startsWith('http')) {
        cachedDriveConfig = {
          scriptUrl: data.scriptUrl.trim(),
          scriptSecret: data.scriptSecret || 'eArsipSecretAlHikam2026_SecureKey'
        };
        return cachedDriveConfig;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch drive config from server:', err);
  }

  // Priority 2: Check localStorage sync config from Settings
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('EARSIP_GOOGLE_CONFIG') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.webhookUrl && parsed.webhookUrl.startsWith('http') && !parsed.webhookUrl.includes('AKfycbqyQCp')) {
        cachedDriveConfig = {
          scriptUrl: parsed.webhookUrl.trim(),
          scriptSecret: 'eArsipSecretAlHikam2026_SecureKey'
        };
        return cachedDriveConfig;
      }
    }
  } catch {}

  return null;
}

// Convert File to Base64 in browser without losing quality
function fileToBase64Raw(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload original file directly to Google Drive Private Storage with live real-time progress callback
 */
export async function uploadFileToGoogleDriveApi(
  file: File,
  metadata: {
    id: string;
    subjek: string;
    identitas?: string;
    kategori: string;
    kategoriUtama: string;
    tahun?: string;
    customFilename?: string;
  },
  onProgress?: (percent: number, statusText: string) => void
): Promise<{ success: boolean; fileId?: string; driveUrl?: string; fileName?: string; error?: string; message?: string }> {
  try {
    const desiredFilename = metadata.customFilename || file.name || `arsip_${Date.now()}`;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    
    if (onProgress) {
      onProgress(15, `Menyiapkan berkas "${desiredFilename}" (${sizeMb} MB)...`);
    }

    const syncCfg = getStoredSyncConfig();
    const targetFolderId = syncCfg.folderId || '1qsi9UTuDxBmeg0ZUcGnUfJSSxwR2BwS9';
    const targetSheetId = syncCfg.spreadsheetId || '1fyWuUClt970_2RELzMq5jBGsjCcTXYZW_XZtTyxmyI';

    // 1. PRIMARY ENGINE: Upload via Serverless Proxy (/api/drive/upload) for reliable server-to-server transfer (No CORS issues)
    const canUseServerProxy = file.size < 4.2 * 1024 * 1024; // Vercel 4.5MB limit safe threshold
    
    if (canUseServerProxy) {
      try {
        if (onProgress) {
          onProgress(35, `Mengirim berkas ke Google Drive (${sizeMb} MB)...`);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('customFilename', desiredFilename);
        formData.append('folderId', targetFolderId);
        formData.append('spreadsheetId', targetSheetId);
        formData.append('subjek', metadata.subjek || '');
        formData.append('identitas', metadata.identitas || '');
        formData.append('kategori', metadata.kategori || '');
        formData.append('kategoriUtama', metadata.kategoriUtama || '');
        formData.append('tahun', metadata.tahun || '');
        formData.append('id', metadata.id || '');

        let currentProgress = 35;
        const progressTimer = setInterval(() => {
          if (currentProgress < 90) {
            currentProgress += 5;
            if (onProgress) {
              onProgress(currentProgress, `Menyimpan di Google Drive (${currentProgress}%)...`);
            }
          }
        }, 200);

        const proxyRes = await fetch('/api/drive/upload', {
          method: 'POST',
          body: formData
        });

        clearInterval(progressTimer);

        if (proxyRes.ok) {
          const proxyResult = await proxyRes.json();
          const validId = proxyResult.fileId || (proxyResult.driveUrl ? proxyResult.driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] : null);
          if (proxyResult.success && validId) {
            if (onProgress) {
              onProgress(100, '✓ Berkas berhasil tersimpan di Google Drive!');
            }
            return {
              success: true,
              fileId: validId,
              driveUrl: proxyResult.driveUrl || `https://drive.google.com/file/d/${validId}/view?usp=drivesdk`,
              fileName: desiredFilename,
              message: '✓ Berkas berhasil tersimpan di Google Drive!'
            };
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy upload attempted, falling back to direct upload:', proxyErr);
      }
    }

    // 2. SECONDARY ENGINE: Direct Browser Upload (For large files > 4MB or when proxy needs fallback)
    const cfg = await getDriveScriptConfig();
    const effectiveScriptUrl = cfg?.scriptUrl || syncCfg.webhookUrl;

    if (effectiveScriptUrl && effectiveScriptUrl.startsWith('http')) {
      if (onProgress) {
        onProgress(50, `Mengirim berkas (${sizeMb} MB) langsung ke Google Apps Script...`);
      }

      const rawBase64 = await fileToBase64Raw(file);
      const targetSecret = cfg?.scriptSecret || 'eArsipSecretAlHikam2026_SecureKey';

      const payload = {
        secret: targetSecret,
        apiKey: targetSecret,
        action: 'upload',
        actionType: 'upload',
        folderId: targetFolderId,
        spreadsheetId: targetSheetId,
        fileName: desiredFilename,
        namaFileAsli: desiredFilename,
        namaFile: desiredFilename,
        mimeType: file.type || 'application/octet-stream',
        fileBase64: rawBase64,
        fileData: rawBase64,
        kategori: metadata.kategori || '',
        kategoriUtama: metadata.kategoriUtama || '',
        tahun: metadata.tahun || '',
        subjek: metadata.subjek || '',
        identitas: metadata.identitas || '',
        id: metadata.id || '',
        ukuran: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      };

      let directResult: any = null;

      try {
        const directRes = await fetch(effectiveScriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(payload)
        });

        const directText = await directRes.text();
        try {
          directResult = JSON.parse(directText);
        } catch {
          if (directText.includes('drive.google.com/file/d/')) {
            directResult = { status: 'success', driveUrl: directText };
          }
        }
      } catch (directErr) {
        console.warn('Direct upload error:', directErr);
      }

      const createdFileId = directResult?.fileId || directResult?.id || 
        (directResult?.driveUrl ? directResult.driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] : null);

      if (createdFileId) {
        if (onProgress) {
          onProgress(100, '✓ Berkas berhasil tersimpan di Google Drive!');
        }
        return {
          success: true,
          fileId: createdFileId,
          driveUrl: directResult?.driveUrl || `https://drive.google.com/file/d/${createdFileId}/view?usp=drivesdk`,
          fileName: desiredFilename,
          message: '✓ Berkas berhasil tersimpan di Google Drive!'
        };
      }

      if (directResult && directResult.message) {
        return {
          success: false,
          error: `Google Apps Script: ${directResult.message}`
        };
      }
    }

    return {
      success: false,
      error: 'Gagal mengunggah berkas ke Google Drive. Pastikan URL Google Apps Script pada Vercel atau menu Setting sudah aktif dan benar.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat mengunggah berkas.'
    };
  }
}

/**
 * Live test to verify Supabase Storage bucket 'arsip' and RLS permission
 */
export async function testSupabaseStorage(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Koneksi Supabase belum aktif.' };
  }

  try {
    const testBlob = new Blob(['PING_SMP_ALHICAM'], { type: 'text/plain' });
    const testPath = `_test_ping_${Date.now()}.txt`;

    const { error } = await client.storage
      .from('arsip')
      .upload(testPath, testBlob, { upsert: true });

    if (error) {
      if (error.message.includes('Bucket not found') || (error as any).statusCode === 404) {
        return { 
          success: false, 
          message: '❌ Bucket "arsip" BELUM DIBUAT di Supabase Storage! Klik "+ New bucket" ➔ nama: "arsip" ➔ centang "Public bucket".' 
        };
      }
      if (error.message.includes('row-level security') || error.message.includes('RLS') || (error as any).statusCode === 403 || (error as any).statusCode === '403') {
        return { 
          success: false, 
          message: '❌ Izin Upload Ditolak (RLS Policy). Jalankan script SQL Storage di menu SQL Editor Supabase.' 
        };
      }
      return { success: false, message: `❌ Gagal akses Storage: ${error.message}` };
    }

    // Bersihkan file ping
    await client.storage.from('arsip').remove([testPath]);

    return { 
      success: true, 
      message: '✓ Berhasil! Bucket "arsip" aktif & siap menerima file foto/PDF!' 
    };
  } catch (err: any) {
    return { 
      success: false, 
      message: '❌ Gagal akses Storage: Server Supabase belum merespon atau Bucket "arsip" belum dibuat. Silakan salin & jalankan script SQL Schema di Supabase SQL Editor.' 
    };
  }
}

/**
 * Subscribe to realtime changes on Supabase 'arsip' table
 */
export function subscribeToSupabaseArsip(onUpdate: (items: ArsipItem[]) => void) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  // Initial fetch
  fetchArsipFromSupabase().then(items => {
    if (items) onUpdate(items);
  });

  const channel = client
    .channel('arsip_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'arsip' },
      () => {
        fetchArsipFromSupabase().then(items => {
          if (items) onUpdate(items);
        });
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Subscribe to realtime changes on Supabase 'users' table
 */
export function subscribeToSupabaseUsers(onUpdate: (users: any[]) => void) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  fetchUsersFromSupabase().then(users => {
    if (users && users.length > 0) onUpdate(users);
  });

  const channel = client
    .channel('users_realtime_channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      () => {
        fetchUsersFromSupabase().then(users => {
          if (users && users.length > 0) onUpdate(users);
        });
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Save Audit Log and full registry snapshot to Supabase Cloud
 */
export async function saveAuditLogToSupabase(log: any, fullLogsSnapshot?: any[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: log.id,
      waktu: log.waktu,
      aksi: log.aksi,
      kategori: log.kategori,
      subjek: log.subjek,
      detail: log.detail,
      operator: log.operator || 'admin@alhicam.sch.id',
      status: log.status || 'SUCCESS'
    };

    // 1. Try upserting into table 'audit_logs'
    try {
      await client
        .from('audit_logs')
        .upsert([payload], { onConflict: 'id' });
    } catch {}

    // 2. Snapshot to 'arsip' table as guaranteed system registry row
    if (fullLogsSnapshot && Array.isArray(fullLogsSnapshot)) {
      const snapshotPayload = {
        id: 'SYS_AUDIT_LOG_SNAPSHOT',
        tanggal: new Date().toLocaleDateString('id-ID'),
        tahun: new Date().getFullYear().toString(),
        identitas: '-',
        subjek: 'Jejak Audit Global Sistem',
        kategori: 'Audit Trail',
        kategori_utama: 'SystemRegistry',
        nama_file_asli: 'audit_logs.json',
        ukuran: `${(JSON.stringify(fullLogsSnapshot).length / 1024).toFixed(1)} KB`,
        link_drive: JSON.stringify(fullLogsSnapshot.slice(0, 250)),
        uploader: 'system',
        is_trash: false
      };

      try {
        await client
          .from('arsip')
          .upsert([snapshotPayload], { onConflict: 'id' });
      } catch {}
    }

    // 3. Save file snapshot to Supabase Storage Bucket 'arsip'
    if (fullLogsSnapshot && Array.isArray(fullLogsSnapshot)) {
      const blob = new Blob([JSON.stringify(fullLogsSnapshot.slice(0, 250))], { type: 'application/json' });
      try {
        await client.storage
          .from('arsip')
          .upload('system_meta/audit_logs.json', blob, { upsert: true });
      } catch {}
    }

    return true;
  } catch (err) {
    console.warn('saveAuditLogToSupabase warning:', err);
    return false;
  }
}

/**
 * Save complete array of audit logs to Supabase
 */
export async function syncAllAuditLogsToSupabase(logs: any[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !Array.isArray(logs)) return false;

  try {
    const snapshotPayload = {
      id: 'SYS_AUDIT_LOG_SNAPSHOT',
      tanggal: new Date().toLocaleDateString('id-ID'),
      tahun: new Date().getFullYear().toString(),
      identitas: '-',
      subjek: 'Jejak Audit Global Sistem',
      kategori: 'Audit Trail',
      kategori_utama: 'SystemRegistry',
      nama_file_asli: 'audit_logs.json',
      ukuran: `${(JSON.stringify(logs).length / 1024).toFixed(1)} KB`,
      link_drive: JSON.stringify(logs.slice(0, 250)),
      uploader: 'system',
      is_trash: false
    };

    try {
      await client
        .from('arsip')
        .upsert([snapshotPayload], { onConflict: 'id' });
    } catch {}

    const blob = new Blob([JSON.stringify(logs.slice(0, 250))], { type: 'application/json' });
    try {
      await client.storage
        .from('arsip')
        .upload('system_meta/audit_logs.json', blob, { upsert: true });
    } catch {}

    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch authoritative Audit Logs from Supabase Cloud
 */
export async function fetchAuditLogsFromSupabase(): Promise<any[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Try 'audit_logs' dedicated table
    try {
      const { data: tableData, error: tableErr } = await client
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(250);

      if (!tableErr && Array.isArray(tableData) && tableData.length > 0) {
        return tableData;
      }
    } catch {}

    // 2. Try snapshot row in 'arsip' table
    try {
      const { data: rowData, error: rowErr } = await client
        .from('arsip')
        .select('link_drive')
        .eq('id', 'SYS_AUDIT_LOG_SNAPSHOT')
        .single();

      if (!rowErr && rowData?.link_drive) {
        const parsed = JSON.parse(rowData.link_drive);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    // 3. Try storage bucket file
    try {
      const { data: fileBlob, error: fileErr } = await client.storage
        .from('arsip')
        .download('system_meta/audit_logs.json');

      if (!fileErr && fileBlob) {
        const text = await fileBlob.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    return null;
  } catch (err) {
    console.warn('fetchAuditLogsFromSupabase error:', err);
    return null;
  }
}

/**
 * Subscribe to realtime changes on Supabase audit logs across all devices
 */
export function subscribeToSupabaseAuditLogs(onUpdate: (logs: any[]) => void) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  fetchAuditLogsFromSupabase().then(logs => {
    if (logs && logs.length > 0) onUpdate(logs);
  });

  const channel = client
    .channel('audit_logs_realtime_broadcast')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'arsip', filter: 'id=eq.SYS_AUDIT_LOG_SNAPSHOT' },
      () => {
        fetchAuditLogsFromSupabase().then(logs => {
          if (logs && logs.length > 0) onUpdate(logs);
        });
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'audit_logs' },
      () => {
        fetchAuditLogsFromSupabase().then(logs => {
          if (logs && logs.length > 0) onUpdate(logs);
        });
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Ready-to-use SQL Schema for Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `-- =========================================================
-- SKEMA DATABASE E-ARSIP SMP AL-HIKAM JOMBANG (SUPABASE SQL)
-- Salin dan jalankan script ini di menu "SQL Editor" pada Supabase
-- =========================================================

-- 1. TABEL ARSIP DOKUMEN DIGITAL (Terhubung ke Google Drive)
CREATE TABLE IF NOT EXISTS public.arsip (
    id TEXT PRIMARY KEY,
    tanggal TEXT,
    tahun TEXT,
    identitas TEXT DEFAULT '-',
    subjek TEXT NOT NULL,
    kategori TEXT NOT NULL,
    kategori_utama TEXT NOT NULL,
    nama_file_asli TEXT,
    ukuran TEXT,
    link_drive TEXT,
    uploader TEXT DEFAULT 'superadmin',
    is_trash BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indeks untuk pencarian super cepat
CREATE INDEX IF NOT EXISTS idx_arsip_subjek ON public.arsip (subjek);
CREATE INDEX IF NOT EXISTS idx_arsip_identitas ON public.arsip (identitas);
CREATE INDEX IF NOT EXISTS idx_arsip_kategori ON public.arsip (kategori_utama, kategori);
CREATE INDEX IF NOT EXISTS idx_arsip_is_trash ON public.arsip (is_trash);

-- 2. TABEL MASTER DATA SISWA (Buku Induk Siswa)
CREATE TABLE IF NOT EXISTS public.master_siswa (
    id TEXT PRIMARY KEY,
    nisn TEXT,
    nama TEXT NOT NULL,
    kelas TEXT,
    angkatan TEXT,
    jk TEXT,
    status TEXT DEFAULT 'Aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABEL MASTER DATA GURU & PEGAWAI
CREATE TABLE IF NOT EXISTS public.master_guru (
    id TEXT PRIMARY KEY,
    nuptk TEXT,
    nip TEXT,
    nama TEXT NOT NULL,
    jabatan TEXT,
    tugas TEXT,
    jk TEXT,
    status TEXT DEFAULT 'Aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABEL USERS (MANAJEMEN PENGGUNA SISTEM)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    nama TEXT,
    role TEXT NOT NULL DEFAULT 'Administrator Arsip',
    status TEXT NOT NULL DEFAULT 'Aktif',
    password TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Pastikan kolom email, nama, username, avatar_url selalu ada jika tabel sudah terlanjur dibuat
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='email') THEN
    ALTER TABLE public.users ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='nama') THEN
    ALTER TABLE public.users ADD COLUMN nama TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='username') THEN
    ALTER TABLE public.users ADD COLUMN username TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='avatar_url') THEN
    ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Inisialisasi Akun Super Administrator Utama
INSERT INTO public.users (id, name, username, email, nama, role, status, password)
VALUES ('master-superadmin', 'Solikhin Mbolo', 'superadmin', 'superadmin', 'Solikhin Mbolo', 'Super Administrator', 'Aktif', 'superadmin123')
ON CONFLICT (username) DO NOTHING;

-- 5. ATUR HAK AKSES KEAMANAN (Row Level Security)
ALTER TABLE public.arsip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Izinkan akses baca dan tulis penuh untuk Anon Key (Frontend Web)
DROP POLICY IF EXISTS "Public Full Access Arsip" ON public.arsip;
CREATE POLICY "Public Full Access Arsip" ON public.arsip FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Siswa" ON public.master_siswa;
CREATE POLICY "Public Full Access Siswa" ON public.master_siswa FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Guru" ON public.master_guru;
CREATE POLICY "Public Full Access Guru" ON public.master_guru FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access Users" ON public.users;
CREATE POLICY "Public Full Access Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 6. AKTIFKAN REALTIME REPLICATION SUPABASE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'arsip'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arsip;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'master_siswa'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.master_siswa;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'master_guru'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.master_guru;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 7. IZIN AKSES STORAGE BUCKET 'arsip' (Upload & Baca Berkas Fisik)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('arsip', 'arsip', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Storage Upload" ON storage.objects;
CREATE POLICY "Public Storage Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'arsip');

DROP POLICY IF EXISTS "Public Storage Read" ON storage.objects;
CREATE POLICY "Public Storage Read" ON storage.objects FOR SELECT USING (bucket_id = 'arsip');

DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;
CREATE POLICY "Public Storage Update" ON storage.objects FOR UPDATE USING (bucket_id = 'arsip');
`;
