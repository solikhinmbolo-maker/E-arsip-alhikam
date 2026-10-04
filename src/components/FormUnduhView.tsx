import React, { useState, useMemo, useEffect } from 'react';
import { 
  FolderOpen, 
  ShieldCheck, 
  Search, 
  Calendar, 
  Filter, 
  Eye, 
  Printer, 
  Download, 
  CloudDownload, 
  FileText,
  User,
  ChevronDown,
  Trash2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  X
} from 'lucide-react';
import { ArsipItem, getStoredArsip, moveToTrashArsipItem, getFileAttachment } from '../data/mockDatabase';

interface FormUnduhViewProps {
  kategoriMenu?: 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya';
  onSelectKategoriMenu?: (kat: 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya') => void;
  onPreview: (item: ArsipItem) => void;
}

export default function FormUnduhView({ 
  kategoriMenu = 'Arsip Siswa', 
  onSelectKategoriMenu,
  onPreview 
}: FormUnduhViewProps) {
  const [activeKategori, setActiveKategori] = useState<'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya'>(kategoriMenu);
  const [filterTahun, setFilterTahun] = useState('SEMUA');
  const [filterJenis, setFilterJenis] = useState('SEMUA');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingItemName, setDownloadingItemName] = useState('');
  const [isSyncingFromGoogle, setIsSyncingFromGoogle] = useState(false);
  const [isPushingToGoogle, setIsPushingToGoogle] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [trashConfirmItem, setTrashConfirmItem] = useState<ArsipItem | null>(null);
  const [isMovingToTrash, setIsMovingToTrash] = useState(false);
  const [trashToast, setTrashToast] = useState('');
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    setActiveKategori(kategoriMenu);
  }, [kategoriMenu]);

  const handleMoveToTrash = async (item: ArsipItem) => {
    if (isMovingToTrash) return;
    setIsMovingToTrash(true);
    try {
      // Smooth visual feedback for moving to trash
      await new Promise(r => setTimeout(r, 650));
      await moveToTrashArsipItem(item.id);
      setTrashToast(`✓ Berkas "${item.subjek}" (${item.kategori}) berhasil dipindahkan ke folder Sampah.`);
      setTimeout(() => setTrashToast(''), 4500);
    } catch (err) {
      console.error('Error moving to trash:', err);
    } finally {
      setIsMovingToTrash(false);
      setTrashConfirmItem(null);
    }
  };

  useEffect(() => {
    const handleCloudUpdate = () => setDataVersion((v: number) => v + 1);
    window.addEventListener('earsip:cloud-synced', handleCloudUpdate);
    return () => window.removeEventListener('earsip:cloud-synced', handleCloudUpdate);
  }, []);

  // Get data directly from stored active archives
  const allArsip = useMemo(() => getStoredArsip(), [dataVersion]);

  // Filter based on active category
  const scopedData = useMemo(() => {
    return allArsip.filter(item => {
      if (activeKategori) {
        return item.kategoriUtama === activeKategori;
      }
      return true;
    });
  }, [allArsip, activeKategori]);

  // Distinct Years & Categories for filters
  const distinctTahun = useMemo(() => {
    const set = new Set(scopedData.map(d => d.tahun).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [scopedData]);

  const distinctJenis = useMemo(() => {
    const set = new Set(scopedData.map(d => d.kategori).filter(Boolean));
    return Array.from(set).sort();
  }, [scopedData]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return scopedData.filter(item => {
      const matchTahun = filterTahun === 'SEMUA' || String(item.tahun).trim() === filterTahun;
      const matchJenis = filterJenis === 'SEMUA' || String(item.kategori).trim() === filterJenis;
      
      const q = searchTerm.toLowerCase().trim();
      const combined = `${item.subjek} ${item.identitas} ${item.kategori} ${item.tahun} ${item.namaFileAsli}`.toLowerCase();
      const matchSearch = !q || combined.includes(q);

      return matchTahun && matchJenis && matchSearch;
    });
  }, [scopedData, filterTahun, filterJenis, searchTerm]);

  // Handle Robust Download
  const handleDownload = async (item: ArsipItem) => {
    setIsDownloading(true);
    setDownloadingItemName(item.namaFileAsli || item.subjek);
    setDownloadProgress(30);

    try {
      let fileContent = item.fileDataUrl || await getFileAttachment(item.id);
      setDownloadProgress(70);

      const element = document.createElement('a');
      if (fileContent) {
        element.setAttribute('href', fileContent);
      } else if (item.linkDrive && item.linkDrive.startsWith('http')) {
        element.setAttribute('href', item.linkDrive);
        element.setAttribute('target', '_blank');
      } else {
        const fallbackText = `Dokumen E-Arsip Al-Hicam\nNama: ${item.subjek}\nKategori: ${item.kategori}\nTahun: ${item.tahun}\nID: ${item.id}`;
        const blob = new Blob([fallbackText], { type: 'text/plain;charset=utf-8' });
        element.setAttribute('href', URL.createObjectURL(blob));
      }

      element.setAttribute('download', item.namaFileAsli || `${item.subjek}_${item.kategori}.txt`);
      document.body.appendChild(element);
      setDownloadProgress(100);
      await new Promise(r => setTimeout(r, 300));
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Handle Print
  const handlePrint = (item: ArsipItem) => {
    onPreview(item);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="bg-white rounded-3xl p-3 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] border border-slate-200/80 animate-fadeIn font-['Poppins'] max-w-full overflow-x-hidden">
      
      {/* Toast Notification for Trash Action */}
      {trashToast && (
        <div className="mb-4 p-3.5 bg-slate-900 text-white rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{trashToast}</span>
          </div>
          <button onClick={() => setTrashToast('')} className="text-slate-400 hover:text-white cursor-pointer ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER EMERALD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b-2 border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-inner flex-shrink-0">
            <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-emerald-950 flex items-center gap-1.5 flex-wrap">
              <span>Daftar Unduh:</span>
              <span className="text-emerald-600">{activeKategori}</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Akses, cetak, dan unduh berkas digital</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Terhubung Supabase Cloud</span>
          </div>
        </div>
      </div>

      {/* FILTER KATEGORI UNDUH (Arsip Siswa / Arsip Guru / Arsip Lainnya) */}
      <div className="p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 mb-5 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'Arsip Siswa', label: 'Arsip Siswa', icon: '🎓' },
          { id: 'Arsip Guru', label: 'Arsip Guru', icon: '👨‍🏫' },
          { id: 'Arsip Lainnya', label: 'Arsip Lainnya', icon: '📁' }
        ].map((cat) => {
          const active = activeKategori === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                const newCat = cat.id as any;
                setActiveKategori(newCat);
                setFilterTahun('SEMUA');
                setFilterJenis('SEMUA');
                if (onSelectKategoriMenu) {
                  onSelectKategoriMenu(newCat);
                }
              }}
              className={`flex-1 min-w-[105px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                active
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="text-sm">{cat.icon}</span>
              <span className="whitespace-nowrap">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* FILTER BERTINGKAT & SMART SEARCH */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 mb-5">
        
        {/* Dropdown Filter Tahun */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-blue-500" />
            <span>Tahun:</span>
          </label>
          <div className="relative">
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 appearance-none cursor-pointer shadow-sm"
            >
              <option value="SEMUA">Semua Tahun</option>
              {distinctTahun.map(th => (
                <option key={th} value={th}>Tahun {th}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Dropdown Filter Jenis Dokumen */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-emerald-500" />
            <span>Kategori:</span>
          </label>
          <div className="relative">
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 appearance-none cursor-pointer shadow-sm"
            >
              <option value="SEMUA">Semua Kategori</option>
              {distinctJenis.map(jn => (
                <option key={jn} value={jn}>{jn}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Smart Search */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
            <Search className="w-3 h-3 text-indigo-500" />
            <span>Cari Cepat (Nama / NISN / Berkas):</span>
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik nama siswa atau judul berkas..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Progress Bar Animasi Unduh */}
      {isDownloading && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl mb-5 animate-fadeIn space-y-1.5">
          <div className="flex justify-between items-center text-xs font-semibold text-emerald-900">
            <span className="flex items-center gap-1.5 truncate">
              <CloudDownload className="w-4 h-4 text-emerald-600 animate-bounce flex-shrink-0" />
              <span className="truncate">Mengunduh: <strong>{downloadingItemName}</strong></span>
            </span>
            <span className="text-emerald-700 font-bold ml-2">{downloadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-600 transition-all duration-200 rounded-full"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* MOBILE-FIRST CARD LIST (TAMPILAN KHUSUS HP YANG SANGAT RAPI) */}
      <div className="block sm:hidden space-y-3">
        {filteredData.length === 0 ? (
          <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-xs text-slate-700">Berkas tidak ditemukan</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          filteredData.map((item) => (
            <div key={item.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 shadow-sm space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {item.kategori}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{item.tanggal}</span>
              </div>

              <div>
                <strong className="text-xs font-bold text-slate-900 block">{item.subjek}</strong>
                <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                  ID: {item.identitas || '-'} • Th: {item.tahun}
                </p>
              </div>

              {/* Action Buttons on Mobile Card */}
              <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => onPreview(item)}
                  className="py-1.5 px-1 bg-white hover:bg-slate-100 text-blue-600 border border-blue-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(item)}
                  className="py-1.5 px-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(item)}
                  className="py-1.5 px-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrashConfirmItem(item)}
                  className="py-1.5 px-1 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 shadow-sm"
                  title="Pindahkan ke Tong Sampah"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW (TETAP SAMA SEPERTI ASLINYA) */}
      <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
              <th className="py-3.5 px-4">Tanggal & Tahun</th>
              <th className="py-3.5 px-4">Subjek / Nama</th>
              <th className="py-3.5 px-4">NISN / NIP / Identitas</th>
              <th className="py-3.5 px-4">Kategori Dokumen</th>
              <th className="py-3.5 px-4 text-center">Aksi Dokumen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">Dokumen tidak ditemukan</p>
                  <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter tahun atau kata kunci pencarian Anda</p>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    <span className="font-semibold text-slate-800 block">{item.tanggal}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                      Th: {item.tahun || '-'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-900 block font-semibold">{item.subjek}</strong>
                    <span className="text-xs text-slate-500 font-mono">{item.namaFileAsli}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 border border-slate-200">
                      <User className="w-3 h-3 text-slate-400" />
                      {item.identitas || '-'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                      {item.kategori}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onPreview(item)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                        title="Lihat Preview Dokumen"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrint(item)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                        title="Cetak Dokumen"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                        title="Unduh Berkas Langsung"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTrashConfirmItem(item)}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                        title="Pindahkan ke Sampah"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL KONFIRMASI PEMINDAHAN KE SAMPAH */}
      {trashConfirmItem && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn font-['Poppins']">
          <div className="bg-[#0F172A] border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-scaleUp text-white">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold mb-1">Pindahkan ke Sampah?</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Dokumen <strong className="text-red-400">"{trashConfirmItem.subjek}"</strong> akan dipindahkan ke folder Sampah. Anda masih dapat memulihkannya kapan saja.
            </p>

            {/* Loading progress indicator */}
            {isMovingToTrash && (
              <div className="mb-5 space-y-2 animate-fadeIn">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full animate-pulse w-full" />
                </div>
                <p className="text-[11px] text-amber-400 font-semibold flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Sedang memindahkan berkas ke folder sampah...</span>
                </p>
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={isMovingToTrash}
                onClick={() => setTrashConfirmItem(null)}
                className={`flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors ${
                  isMovingToTrash ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isMovingToTrash}
                onClick={() => handleMoveToTrash(trashConfirmItem)}
                className={`flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  isMovingToTrash ? 'opacity-90 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {isMovingToTrash ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memindahkan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus ke Sampah</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
