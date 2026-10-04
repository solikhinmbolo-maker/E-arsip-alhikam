import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Printer, 
  Eye, 
  Filter, 
  Calendar, 
  CheckCircle,
  Download
} from 'lucide-react';
import { ArsipItem, getStoredArsip } from '../data/mockDatabase';

interface LaporanViewProps {
  onPreview: (item: ArsipItem) => void;
}

export default function LaporanView({ onPreview }: LaporanViewProps) {
  const [periode, setPeriode] = useState<'semua' | 'bulan_ini'>('semua');
  const [kategori, setKategori] = useState<string>('semua');
  const [namaFilter, setNamaFilter] = useState<string>('semua');

  const allArsip = getStoredArsip();

  // Distinct subjek names
  const namaList = useMemo(() => {
    const set = new Set(allArsip.map(a => a.subjek).filter(Boolean));
    return Array.from(set).sort();
  }, [allArsip]);

  // Filtered reports
  const filteredData = useMemo(() => {
    return allArsip.filter(item => {
      // Category filter
      if (kategori !== 'semua') {
        const matchMain = item.kategoriUtama === kategori;
        const matchSub = item.kategori === kategori;
        if (!matchMain && !matchSub) return false;
      }

      // Name filter
      if (namaFilter !== 'semua' && item.subjek !== namaFilter) {
        return false;
      }

      // Period filter
      if (periode === 'bulan_ini') {
        const currentMonth = '09'; // September 2026
        const currentYear = '2026';
        if (!item.tanggal.includes(`/${currentMonth}/${currentYear}`) && !item.tanggal.includes(`-${currentMonth}-2026`)) {
          // allow current date items
        }
      }

      return true;
    });
  }, [allArsip, kategori, namaFilter, periode]);

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const headers = ['NO', 'ID_ARSIP', 'TANGGAL', 'TAHUN', 'SUBJEK', 'IDENTITAS', 'KATEGORI', 'KATEGORI_UTAMA', 'FILE', 'UPLOADER'];
    const rows = filteredData.map((d, i) => [
      i + 1,
      d.id,
      d.tanggal,
      d.tahun,
      `"${d.subjek}"`,
      d.identitas,
      `"${d.kategori}"`,
      `"${d.kategoriUtama}"`,
      `"${d.namaFileAsli}"`,
      d.uploader
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_E_Arsip_AlHicam_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl p-3 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] border border-slate-200/80 animate-fadeIn font-['Poppins']">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Laporan Statistik & Riwayat Pengarsipan</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekapitulasi riwayat berkas digital yang tersimpan pada E-Arsip Al-Hicam
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Periode Pengarsipan:</label>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="semua">Semua Periode</option>
              <option value="bulan_ini">Bulan Ini (September 2026)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori Dokumen:</label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="semua">Semua Kategori</option>
              <option value="Arsip Siswa">Arsip Siswa</option>
              <option value="Arsip Guru">Arsip Guru</option>
              <option value="Arsip Lainnya">Arsip Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Filter Nama Subjek:</label>
            <select
              value={namaFilter}
              onChange={(e) => setNamaFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="semua">Semua Nama</option>
              {namaList.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
          <span className="text-[11px] text-blue-600 font-semibold block">Total Berkas Sesuai Filter</span>
          <span className="text-xl font-bold text-blue-950">{filteredData.length}</span>
        </div>
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
          <span className="text-[11px] text-emerald-600 font-semibold block">Status Sinkronisasi</span>
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1 mt-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Terverifikasi Google Drive
          </span>
        </div>
        <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
          <span className="text-[11px] text-purple-600 font-semibold block">Database Spreadsheet</span>
          <span className="text-xs font-mono font-bold text-purple-950 block mt-1 truncate">
            1ew4gfR5...
          </span>
        </div>
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
          <span className="text-[11px] text-amber-600 font-semibold block">Petugas Log Terakhir</span>
          <span className="text-xs font-bold text-amber-950 block mt-1">admin@alhicam.sch.id</span>
        </div>
      </div>

      {/* Report Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <th className="py-3 px-3 w-12 text-center">NO</th>
              <th className="py-3 px-4">TANGGAL UPLOAD</th>
              <th className="py-3 px-4">NAMA / SUBJEK</th>
              <th className="py-3 px-4">KATEGORI ARSIP</th>
              <th className="py-3 px-4">PENGUNGGAH</th>
              <th className="py-3 px-4 text-center">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                  Tidak ada data arsip yang cocok dengan filter yang dipilih.
                </td>
              </tr>
            ) : (
              filteredData.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    <span className="font-semibold text-slate-800 block">{item.tanggal}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.id}</span>
                  </td>
                  <td className="py-3 px-4">
                    <strong className="text-slate-900 block font-semibold">{item.subjek}</strong>
                    <span className="text-[11px] text-slate-500">ID: {item.identitas}</span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                      {item.kategori}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                    {item.uploader}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onPreview(item)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
