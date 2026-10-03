import React, { useState, useMemo } from 'react';
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
  FileSpreadsheet
} from 'lucide-react';
import { 
  AuditLogItem, 
  getStoredAuditLogs 
} from '../data/mockDatabase';

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLogItem[]>(() => getStoredAuditLogs());
  const [filterAction, setFilterAction] = useState<string>('SEMUA');
  const [searchTerm, setSearchTerm] = useState('');

  // Metrics
  const totalLogs = logs.length;
  const totalUploads = logs.filter(l => l.aksi === 'UPLOAD').length;
  const totalUpdates = logs.filter(l => l.aksi === 'UPDATE').length;
  const totalLegalisir = logs.filter(l => l.aksi === 'LEGALISIR').length;

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchAction = filterAction === 'SEMUA' || log.aksi === filterAction;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        log.subjek.toLowerCase().includes(q) || 
        log.detail.toLowerCase().includes(q) || 
        log.operator.toLowerCase().includes(q) ||
        log.kategori.toLowerCase().includes(q);
      return matchAction && matchSearch;
    });
  }, [logs, filterAction, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    let csv = "data:text/csv;charset=utf-8,ID,Waktu,Aksi,Kategori,Subjek,Keterangan,Operator,Status\r\n";
    filteredLogs.forEach(l => {
      csv += `"${l.id}","${l.waktu}","${l.aksi}","${l.kategori}","${l.subjek}","${l.detail}","${l.operator}","${l.status}"\r\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `Audit_Log_Arsip_SMP_AlHikam_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (aksi: AuditLogItem['aksi']) => {
    switch (aksi) {
      case 'UPLOAD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Upload className="w-3 h-3" />
            <span>Upload Berkas</span>
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3" />
            <span>Update / Timpa</span>
          </span>
        );
      case 'LEGALISIR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Stamp className="w-3 h-3" />
            <span>Legalisir</span>
          </span>
        );
      case 'UNDUH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileDown className="w-3 h-3" />
            <span>Unduh Berkas</span>
          </span>
        );
      case 'DELETE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <Trash2 className="w-3 h-3" />
            <span>Hapus Data</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            <Eye className="w-3 h-3" />
            <span>{aksi}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] border border-slate-200/90 animate-fadeIn font-['Poppins'] max-w-full overflow-x-hidden">
      
      {/* Mobile-Minimalist Header (Saves vertical screen space) */}
      <div className="block sm:hidden pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-slate-900 leading-tight truncate">Log & Jejak Audit</h2>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold"
              title="Cetak Berita Acara"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Micro 4-Card Strip on Mobile */}
        <div className="grid grid-cols-4 gap-1.5 text-center mt-2">
          <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[9px] text-slate-500 block">Total</span>
            <strong className="text-xs font-bold text-slate-900">{totalLogs}</strong>
          </div>
          <div className="p-1.5 rounded-xl bg-blue-50/80 border border-blue-200/80">
            <span className="text-[9px] text-blue-700 block">Upload</span>
            <strong className="text-xs font-bold text-blue-900">{totalUploads}</strong>
          </div>
          <div className="p-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80">
            <span className="text-[9px] text-amber-800 block">Timpa</span>
            <strong className="text-xs font-bold text-amber-900">{totalUpdates}</strong>
          </div>
          <div className="p-1.5 rounded-xl bg-purple-50/80 border border-purple-200/80">
            <span className="text-[9px] text-purple-800 block">Legalisir</span>
            <strong className="text-xs font-bold text-purple-900">{totalLegalisir}</strong>
          </div>
        </div>
      </div>

      {/* Desktop Header Banner (Preserved Full Layout on Desktop) */}
      <div className="hidden sm:flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-cyan-400 flex items-center justify-center shadow-lg shadow-slate-900/30 flex-shrink-0 border border-cyan-500/20">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">Log & Jejak Audit Pengarsipan</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Audit Trail ISO / Akreditasi</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rekam jejak otomatis seluruh aktivitas upload dokumen, pembaharuan, unduhan, dan pengesahan berkas
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => window.print()}
            className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Berita Acara</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/20 active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Log CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Hidden on Mobile) */}
      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Total Jejak Audit</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <strong className="text-xl sm:text-2xl font-bold text-slate-900">{totalLogs}</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">Tercatat permanen</span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80">
          <div className="flex items-center justify-between text-blue-700 text-xs mb-1 font-semibold">
            <span>Unggah Berkas</span>
            <Upload className="w-4 h-4 text-blue-600" />
          </div>
          <strong className="text-xl sm:text-2xl font-bold text-blue-900">{totalUploads}</strong>
          <span className="text-[10px] text-blue-600 font-medium block mt-0.5">Dokumen baru</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80">
          <div className="flex items-center justify-between text-amber-800 text-xs mb-1 font-semibold">
            <span>Pembaruan / Timpa</span>
            <RefreshCw className="w-4 h-4 text-amber-600" />
          </div>
          <strong className="text-xl sm:text-2xl font-bold text-amber-900">{totalUpdates}</strong>
          <span className="text-[10px] text-amber-700 font-medium block mt-0.5">Revisi dokumen</span>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80">
          <div className="flex items-center justify-between text-purple-800 text-xs mb-1 font-semibold">
            <span>Legalisir Diterbitkan</span>
            <Stamp className="w-4 h-4 text-purple-600" />
          </div>
          <strong className="text-xl sm:text-2xl font-bold text-purple-900">{totalLegalisir}</strong>
          <span className="text-[10px] text-purple-700 font-medium block mt-0.5">Resmi terstempel</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari subjek, keterangan log, atau operator..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl text-xs sm:text-sm text-slate-800 focus:outline-none transition-all"
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
          >
            <option value="SEMUA">Semua Jenis Aksi</option>
            <option value="UPLOAD">Hanya Upload Berkas</option>
            <option value="UPDATE">Hanya Pembaruan (Replace)</option>
            <option value="LEGALISIR">Hanya Legalisir</option>
            <option value="UNDUH">Hanya Unduh Berkas</option>
            <option value="DELETE">Hanya Penghapusan</option>
          </select>
        </div>
      </div>

      {/* Log Activity Timeline Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/80">
              <th className="py-3 px-4 rounded-l-2xl">Waktu & Tanggal</th>
              <th className="py-3 px-3">Jenis Aktivitas</th>
              <th className="py-3 px-3">Kategori</th>
              <th className="py-3 px-3">Subjek Dokumen</th>
              <th className="py-3 px-3">Detail Keterangan</th>
              <th className="py-3 px-3">Operator</th>
              <th className="py-3 px-4 text-right rounded-r-2xl">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{log.waktu}</span>
                  </div>
                </td>
                <td className="py-3.5 px-3 whitespace-nowrap">
                  {getActionBadge(log.aksi)}
                </td>
                <td className="py-3.5 px-3 text-slate-600 font-medium">
                  {log.kategori}
                </td>
                <td className="py-3.5 px-3 font-bold text-slate-900">
                  {log.subjek}
                </td>
                <td className="py-3.5 px-3 text-slate-600 max-w-xs truncate" title={log.detail}>
                  {log.detail}
                </td>
                <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                  {log.operator}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                    log.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-100/70' : 'text-amber-700 bg-amber-100/70'
                  }`}>
                    {log.status === 'SUCCESS' ? 'Tervalidasi' : 'Peringatan'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
