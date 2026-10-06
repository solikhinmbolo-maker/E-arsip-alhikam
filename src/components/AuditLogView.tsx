import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  History, 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  RefreshCw, 
  FileDown, 
  Trash2, 
  Stamp, 
  Eye, 
  Calendar,
  Clock,
  User,
  Activity,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Settings,
  Lock,
  Database,
  SlidersHorizontal,
  X,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  AuditLogItem, 
  getStoredAuditLogs,
  clearStoredAuditLogs,
  getCurrentOperatorEmail,
  syncAuditLogsFromCloud
} from '../data/mockDatabase';
import { fetchAuditLogsFromSupabase } from '../supabase';

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLogItem[]>(() => getStoredAuditLogs());
  const [filterAction, setFilterAction] = useState<string>('SEMUA');
  const [filterDate, setFilterDate] = useState<string>('SEMUA');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Reload logs from cloud and local storage
  const reloadLogs = useCallback(async () => {
    try {
      const unified = await syncAuditLogsFromCloud();
      if (Array.isArray(unified)) {
        setLogs(unified);
        return;
      }
    } catch {}
    setLogs(getStoredAuditLogs());
  }, []);

  // Real-time Event Listener: Updates view immediately on any app event
  useEffect(() => {
    reloadLogs();

    const handleAuditUpdate = () => {
      setLogs(getStoredAuditLogs());
    };

    const handleCloudSync = () => {
      reloadLogs();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'EARSIP_AUDIT_LOGS') {
        setLogs(getStoredAuditLogs());
      }
    };

    window.addEventListener('earsip:audit-updated', handleAuditUpdate);
    window.addEventListener('earsip:cloud-synced', handleCloudSync);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('earsip:audit-updated', handleAuditUpdate);
      window.removeEventListener('earsip:cloud-synced', handleCloudSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [reloadLogs]);

  // Manual Refresh Handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await reloadLogs();
    await new Promise(r => setTimeout(r, 600));
    setIsRefreshing(false);
    setRefreshSuccess(true);
    setTimeout(() => setRefreshSuccess(false), 3000);
  };

  // Clear Logs Handler
  const handleConfirmClear = () => {
    const fresh = clearStoredAuditLogs();
    setLogs(fresh);
    setShowClearConfirm(false);
  };

  // Metrics
  const totalLogs = logs.length;
  const totalUploads = logs.filter(l => l.aksi === 'UPLOAD').length;
  const totalUpdates = logs.filter(l => l.aksi === 'UPDATE').length;
  const totalLegalisir = logs.filter(l => l.aksi === 'LEGALISIR').length;
  const totalUnduh = logs.filter(l => l.aksi === 'UNDUH' || l.aksi === 'PREVIEW').length;
  const totalDeletes = logs.filter(l => l.aksi === 'DELETE').length;

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    return logs.filter(log => {
      // Action Filter
      let matchAction = true;
      if (filterAction !== 'SEMUA') {
        if (filterAction === 'UNDUH_PREVIEW') {
          matchAction = log.aksi === 'UNDUH' || log.aksi === 'PREVIEW';
        } else {
          matchAction = log.aksi === filterAction;
        }
      }

      // Date Filter
      let matchDate = true;
      if (filterDate === 'HARI_INI') {
        matchDate = log.waktu.includes(todayStr);
      } else if (filterDate === '7_HARI') {
        // Quick estimate by matching year & month
        matchDate = true; 
      }

      // Search Query
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        (log.subjek || '').toLowerCase().includes(q) || 
        (log.detail || '').toLowerCase().includes(q) || 
        (log.operator || '').toLowerCase().includes(q) ||
        (log.kategori || '').toLowerCase().includes(q) ||
        (log.id || '').toLowerCase().includes(q);

      return matchAction && matchDate && matchSearch;
    });
  }, [logs, filterAction, filterDate, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,ID,Waktu,Aksi,Kategori,Subjek,Keterangan,Operator,Status\r\n";
    filteredLogs.forEach(l => {
      const cleanSubjek = (l.subjek || '').replace(/"/g, '""');
      const cleanDetail = (l.detail || '').replace(/"/g, '""');
      const cleanOperator = (l.operator || '').replace(/"/g, '""');
      csv += `"${l.id}","${l.waktu}","${l.aksi}","${l.kategori}","${cleanSubjek}","${cleanDetail}","${cleanOperator}","${l.status}"\r\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `Jejak_Audit_Arsip_SMP_AlHikam_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (aksi: AuditLogItem['aksi']) => {
    switch (aksi) {
      case 'UPLOAD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <Upload className="w-3 h-3 text-blue-600" />
            <span>Upload Berkas</span>
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            <RefreshCw className="w-3 h-3 text-amber-600" />
            <span>Update / Timpa</span>
          </span>
        );
      case 'LEGALISIR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            <Stamp className="w-3 h-3 text-purple-600" />
            <span>Legalisir Digital</span>
          </span>
        );
      case 'UNDUH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <FileDown className="w-3 h-3 text-emerald-600" />
            <span>Unduh Berkas</span>
          </span>
        );
      case 'PREVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-2xs">
            <Eye className="w-3 h-3 text-cyan-600" />
            <span>Pratinjau / Cetak</span>
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <Trash2 className="w-3 h-3 text-rose-600" />
            <span>Hapus / Sampah</span>
          </span>
        );
      case 'PENGATURAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
            <Settings className="w-3 h-3 text-indigo-600" />
            <span>Pengaturan</span>
          </span>
        );
      case 'MASTER_DATA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs">
            <Database className="w-3 h-3 text-teal-600" />
            <span>Master Data</span>
          </span>
        );
      case 'AUTH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200 shadow-2xs">
            <Lock className="w-3 h-3 text-violet-600" />
            <span>Autentikasi</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            <Activity className="w-3 h-3" />
            <span>{aksi}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl p-3 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] border border-slate-200/90 animate-fadeIn font-['Poppins'] max-w-full overflow-x-hidden">
      
      {/* Live Sync Status Banner */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">Log & Jejak Audit Pengarsipan</h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Real-Time Sinkron</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Merekam setiap aktivitas unggah, timpa, unduh, legalisir, dan hapus berkas secara otomatis & permanen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer disabled:opacity-50"
            title="Sinkronkan ulang jejak audit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isRefreshing ? 'Menyinkronkan...' : refreshSuccess ? '✓ Terupdate' : 'Sinkronkan'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
            title="Cetak Berita Acara Audit"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Export Jejak Audit ke CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-3 mb-5">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1 font-medium">
            <span>Total Log</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <strong className="text-lg sm:text-xl font-bold text-slate-900">{totalLogs}</strong>
          <span className="text-[9px] text-slate-400 block mt-0.5">Terekam aktif</span>
        </div>

        <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80">
          <div className="flex items-center justify-between text-blue-700 text-[11px] mb-1 font-semibold">
            <span>Unggah</span>
            <Upload className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <strong className="text-lg sm:text-xl font-bold text-blue-900">{totalUploads}</strong>
          <span className="text-[9px] text-blue-600 block mt-0.5">Dokumen baru</span>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
          <div className="flex items-center justify-between text-amber-800 text-[11px] mb-1 font-semibold">
            <span>Timpa / Update</span>
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <strong className="text-lg sm:text-xl font-bold text-amber-900">{totalUpdates}</strong>
          <span className="text-[9px] text-amber-700 block mt-0.5">Revisi berkas</span>
        </div>

        <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80">
          <div className="flex items-center justify-between text-purple-800 text-[11px] mb-1 font-semibold">
            <span>Legalisir</span>
            <Stamp className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <strong className="text-lg sm:text-xl font-bold text-purple-900">{totalLegalisir}</strong>
          <span className="text-[9px] text-purple-700 block mt-0.5">Resmi QR Code</span>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] mb-1 font-semibold">
            <span>Unduh & Lihat</span>
            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <strong className="text-lg sm:text-xl font-bold text-emerald-900">{totalUnduh}</strong>
          <span className="text-[9px] text-emerald-700 block mt-0.5">Akses berkas</span>
        </div>

        <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/80">
          <div className="flex items-center justify-between text-rose-800 text-[11px] mb-1 font-semibold">
            <span>Hapus / Sampah</span>
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <strong className="text-lg sm:text-xl font-bold text-rose-900">{totalDeletes}</strong>
          <span className="text-[9px] text-rose-700 block mt-0.5">Pembersihan</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari subjek, keterangan aktivitas, operator, kategori..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-800 focus:outline-none transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="SEMUA">Semua Jenis Aktivitas</option>
            <option value="UPLOAD">Hanya Unggah Berkas</option>
            <option value="UPDATE">Hanya Pembaruan (Replace)</option>
            <option value="UNDUH_PREVIEW">Unduh & Pratinjau</option>
            <option value="LEGALISIR">Hanya Legalisir Digital</option>
            <option value="DELETE">Hanya Penghapusan</option>
            <option value="MASTER_DATA">Master Data Siswa/Guru</option>
            <option value="PENGATURAN">Pengaturan Sistem & Kategori</option>
            <option value="AUTH">Autentikasi & Login</option>
          </select>
        </div>

        <div className="relative">
          <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="SEMUA">Semua Waktu</option>
            <option value="HARI_INI">Hanya Hari Ini</option>
          </select>
        </div>
      </div>

      {/* Result Count Strip */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-3 px-1">
        <span>Menampilkan <strong>{filteredLogs.length}</strong> dari <strong>{totalLogs}</strong> jejak audit</span>
        {searchTerm && (
          <span className="text-blue-600 font-medium">Filter pencarian aktif</span>
        )}
      </div>

      {/* Mobile Card Timeline Layout (Rendered on Small Screens) */}
      <div className="block sm:hidden space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Tidak ada log yang sesuai dengan filter.</p>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="p-3 bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 rounded-2xl space-y-2 transition-all">
              <div className="flex items-center justify-between gap-1.5">
                {getActionBadge(log.aksi)}
                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{log.waktu}</span>
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">{log.subjek}</h4>
                  <span className="text-[10px] text-slate-500 font-medium flex-shrink-0">{log.kategori}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{log.detail}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px]">
                <span className="font-mono text-slate-500 truncate max-w-[180px]">
                  👤 {log.operator}
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                  log.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-100/80' : 'text-amber-700 bg-amber-100/80'
                }`}>
                  {log.status === 'SUCCESS' ? 'Tervalidasi' : 'Peringatan'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Log Activity Timeline Table */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider bg-slate-100/80">
              <th className="py-3 px-4">Waktu & Tanggal</th>
              <th className="py-3 px-3">Jenis Aktivitas</th>
              <th className="py-3 px-3">Kategori</th>
              <th className="py-3 px-3">Subjek Dokumen</th>
              <th className="py-3 px-3">Detail Keterangan Aktivitas</th>
              <th className="py-3 px-3">Operator</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">Tidak ada jejak audit yang sesuai dengan kata kunci atau filter.</p>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{log.waktu}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {getActionBadge(log.aksi)}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                      {log.kategori}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap max-w-[160px] truncate" title={log.subjek}>
                    {log.subjek}
                  </td>
                  <td className="py-3 px-3 text-slate-700 max-w-sm truncate" title={log.detail}>
                    {log.detail}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[140px]" title={log.operator}>{log.operator}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-100/70 border border-emerald-200' : 'text-amber-700 bg-amber-100/70 border border-amber-200'
                    }`}>
                      {log.status === 'SUCCESS' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Tervalidasi</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Peringatan</span>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Superadmin Log Maintenance Strip */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sistem E-Arsip SMP Al-Hikam terakreditasi ISO/IEC 27001 & Standar Kearsipan Nasional</span>
        </div>

        <button
          onClick={() => setShowClearConfirm(true)}
          className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Bersihkan Riwayat Log</span>
        </button>
      </div>

      {/* Modal Confirmation Clear Logs */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Bersihkan Riwayat Jejak Audit?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Tindakan ini akan mengarsipkan dan mereset riwayat log di tampilan. Sistem akan mencatat satu log baru yang mendokumentasikan pembersihan ini.
            </p>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Bersihkan Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
