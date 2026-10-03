import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  GraduationCap, 
  Briefcase, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  UserCheck, 
  ArrowRight,
  ExternalLink,
  ChevronDown,
  X,
  Users
} from 'lucide-react';
import { 
  MasterSiswaItem, 
  MasterGuruItem, 
  getStoredMasterSiswa, 
  getStoredMasterGuru, 
  getStoredArsip,
  saveMasterSiswa, 
  deleteMasterSiswa, 
  saveMasterGuru, 
  deleteMasterGuru,
  clearAllMasterData,
  restoreSampleMasterData,
  syncMasterToGoogleSheet,
  KATEGORI_SISWA,
  KATEGORI_GURU
} from '../data/mockDatabase';

interface BukuIndukViewProps {
  onNavigateToArsip: (sub: 'Arsip Siswa' | 'Arsip Guru', namaSubjek: string) => void;
}

export default function BukuIndukView({ onNavigateToArsip }: BukuIndukViewProps) {
  const [activeTab, setActiveTab] = useState<'siswa' | 'guru'>('siswa');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTahun, setFilterTahun] = useState('SEMUA');
  const [isSyncingMaster, setIsSyncingMaster] = useState(false);
  const [masterSyncStatus, setMasterSyncStatus] = useState('');

  // Master Data State
  const [siswaList, setSiswaList] = useState<MasterSiswaItem[]>(() => getStoredMasterSiswa());
  const [guruList, setGuruList] = useState<MasterGuruItem[]>(() => getStoredMasterGuru());

  useEffect(() => {
    const handleCloudUpdate = () => {
      setSiswaList(getStoredMasterSiswa());
      setGuruList(getStoredMasterGuru());
    };
    window.addEventListener('earsip:cloud-synced', handleCloudUpdate);
    return () => window.removeEventListener('earsip:cloud-synced', handleCloudUpdate);
  }, []);

  const arsipList = useMemo(() => getStoredArsip(), [siswaList, guruList]);

  // Modal State for adding/editing
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form fields
  const [formNama, setFormNama] = useState('');
  const [formIdentitas, setFormIdentitas] = useState(''); // NISN or NUPTK
  const [formTahun, setFormTahun] = useState(new Date().getFullYear().toString());
  const [formKelasJabatan, setFormKelasJabatan] = useState('');

  // Distinct Years
  const distinctTahun = useMemo(() => {
    const set = new Set(siswaList.map(s => s.tahun));
    return Array.from(set).sort().reverse();
  }, [siswaList]);

  // Archive coverage helper
  const getArchiveCoverage = (nama: string, isSiswa: boolean) => {
    const targetKategori = isSiswa ? KATEGORI_SISWA : KATEGORI_GURU;
    const existing = arsipList.filter(a => 
      a.kategoriUtama === (isSiswa ? 'Arsip Siswa' : 'Arsip Guru') &&
      a.subjek.trim().toLowerCase() === nama.trim().toLowerCase()
    );
    const count = existing.length;
    const total = targetKategori.length;
    const pct = Math.min(100, Math.round((count / total) * 100));
    return { count, total, pct, isComplete: count >= 3 };
  };

  // Filtered Siswa
  const filteredSiswa = useMemo(() => {
    return siswaList.filter(s => {
      const matchTahun = filterTahun === 'SEMUA' || s.tahun === filterTahun;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q) || s.kelas.toLowerCase().includes(q);
      return matchTahun && matchSearch;
    });
  }, [siswaList, filterTahun, searchTerm]);

  // Filtered Guru
  const filteredGuru = useMemo(() => {
    return guruList.filter(g => {
      const q = searchTerm.toLowerCase().trim();
      return !q || g.nama.toLowerCase().includes(q) || g.nuptk.toLowerCase().includes(q) || g.jabatan.toLowerCase().includes(q);
    });
  }, [guruList, searchTerm]);

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formIdentitas.trim()) return;

    if (activeTab === 'siswa') {
      const newItem: MasterSiswaItem = {
        id: editingItem?.id || `S${Date.now().toString().slice(-4)}`,
        nama: formNama.trim(),
        nisn: formIdentitas.trim(),
        tahun: formTahun.trim() || '2025',
        kelas: formKelasJabatan.trim() || '9A'
      };
      const updated = saveMasterSiswa(newItem);
      setSiswaList(updated);
    } else {
      const newItem: MasterGuruItem = {
        id: editingItem?.id || `G${Date.now().toString().slice(-4)}`,
        nama: formNama.trim(),
        nuptk: formIdentitas.trim(),
        jabatan: formKelasJabatan.trim() || 'Guru Pengajar'
      };
      const updated = saveMasterGuru(newItem);
      setGuruList(updated);
    }

    // Reset
    setShowAddModal(false);
    setEditingItem(null);
    setFormNama('');
    setFormIdentitas('');
    setFormKelasJabatan('');
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormNama(item.nama);
    setFormIdentitas(activeTab === 'siswa' ? item.nisn : item.nuptk);
    if (activeTab === 'siswa') {
      setFormTahun(item.tahun);
      setFormKelasJabatan(item.kelas);
    } else {
      setFormKelasJabatan(item.jabatan);
    }
    setShowAddModal(true);
  };

  const handleDelete = async (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus data ${nama} dari buku induk?`)) {
      if (activeTab === 'siswa') {
        const updated = await deleteMasterSiswa(id);
        setSiswaList(updated);
      } else {
        const updated = await deleteMasterGuru(id);
        setGuruList(updated);
      }
    }
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (activeTab === 'siswa') {
      csvContent += "NISN,Nama Siswa,Angkatan,Kelas,Kelengkapan Berkas\r\n";
      filteredSiswa.forEach(s => {
        const cov = getArchiveCoverage(s.nama, true);
        csvContent += `"${s.nisn}","${s.nama}","${s.tahun}","${s.kelas}","${cov.count}/${cov.total} (${cov.pct}%)"\r\n`;
      });
    } else {
      csvContent += "NUPTK/NIP,Nama Guru/Tendik,Jabatan,Kelengkapan Berkas\r\n";
      filteredGuru.forEach(g => {
        const cov = getArchiveCoverage(g.nama, false);
        csvContent += `"${g.nuptk}","${g.nama}","${g.jabatan}","${cov.count}/${cov.total} (${cov.pct}%)"\r\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Buku_Induk_${activeTab === 'siswa' ? 'Siswa' : 'Guru'}_SMP_AlHikam.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] border border-slate-200/90 animate-fadeIn font-['Poppins'] max-w-full overflow-x-hidden">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">Master Data (Siswa & Guru)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Master Data Terintegrasi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Direktori resmi basis data siswa, alumni, dan dewan guru SMP Al-Hikam
            </p>
          </div>
        </div>

        {/* Tab Switcher & Action CTA */}
        <div className="w-full lg:w-auto flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => {
                setActiveTab('siswa');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'siswa'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Siswa & Alumni ({siswaList.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('guru');
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'guru'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Pendidik & Tendik ({guruList.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh Spreadsheet CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setIsSyncingMaster(true);
                setMasterSyncStatus('Sedang mencatat master data ke Google Spreadsheet...');
                const res = await syncMasterToGoogleSheet();
                setIsSyncingMaster(false);
                setMasterSyncStatus(res.success ? `✓ ${res.message}` : `⚠️ ${res.message}`);
                setTimeout(() => setMasterSyncStatus(''), 5000);
              }}
              disabled={isSyncingMaster}
              className="px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              title="Tulis seluruh data siswa & guru ke tab DATA_MASTER_SISWA dan DATA_MASTER_GURU di Google Spreadsheet"
            >
              <ExternalLink className={`w-3.5 h-3.5 ${isSyncingMaster ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncingMaster ? 'Menyinkronkan...' : 'Kirim ke Spreadsheet'}</span>
            </button>

            {(siswaList.length > 0 || guruList.length > 0) ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Kosongkan semua data siswa & guru contoh bawaan agar buku induk mulai bersih dari angka 0?')) {
                    clearAllMasterData();
                    setSiswaList([]);
                    setGuruList([]);
                  }
                }}
                className="px-3 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100/70 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Hapus data contoh demo siswa & guru"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kosongkan Data Demo</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  restoreSampleMasterData();
                  setSiswaList(getStoredMasterSiswa());
                  setGuruList(getStoredMasterGuru());
                }}
                className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Muat kembali data contoh"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Muat Contoh Demo</span>
              </button>
            )}

            <button
              onClick={() => {
                setEditingItem(null);
                setFormNama('');
                setFormIdentitas('');
                setFormKelasJabatan('');
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah {activeTab === 'siswa' ? 'Siswa' : 'Guru'}</span>
            </button>
          </div>
        </div>
      </div>

      {masterSyncStatus && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold animate-fadeIn flex items-center gap-2">
          <span>{masterSyncStatus}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'siswa' ? 'Cari nama siswa, NISN, atau kelas...' : 'Cari nama guru, NUPTK, atau jabatan...'}
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl text-xs sm:text-sm text-slate-800 focus:outline-none transition-all"
          />
        </div>

        {activeTab === 'siswa' ? (
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 sm:py-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl text-xs sm:text-sm text-slate-800 font-medium focus:outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="SEMUA">Semua Tahun Angkatan</option>
              {distinctTahun.map(th => (
                <option key={th} value={th}>Angkatan {th}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>
        ) : (
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900 font-semibold">
            <span>Status PTK Aktif</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px]">SMP AL-HIKAM</span>
          </div>
        )}
      </div>

      {/* Directory Table / Cards Grid */}
      <div className="overflow-x-auto">
        {activeTab === 'siswa' ? (
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/80">
                <th className="py-3 px-4 rounded-l-2xl">Siswa / Alumni</th>
                <th className="py-3 px-3">NISN</th>
                <th className="py-3 px-3">Angkatan</th>
                <th className="py-3 px-3">Kelas</th>
                <th className="py-3 px-3">Kelengkapan Berkas</th>
                <th className="py-3 px-4 text-right rounded-r-2xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSiswa.map((siswa) => {
                const cov = getArchiveCoverage(siswa.nama, true);
                return (
                  <tr key={siswa.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                        {siswa.nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate font-bold text-slate-900">{siswa.nama}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {siswa.id}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-700">{siswa.nisn}</td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800">Angkatan {siswa.tahun}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 font-semibold rounded-md text-[11px] text-slate-700">
                        {siswa.kelas}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{cov.count} / {cov.total} Berkas</span>
                          <span className={`font-bold ${cov.pct >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {cov.pct}%
                          </span>
                        </div>
                        <div className="w-28 sm:w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              cov.pct >= 75 ? 'bg-emerald-500' : cov.pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
                            }`}
                            style={{ width: `${cov.pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onNavigateToArsip('Arsip Siswa', siswa.nama)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
                          title="Buka Berkas Siswa Ini"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(siswa)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                          title="Edit Data"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(siswa.id, siswa.nama)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/80">
                <th className="py-3 px-4 rounded-l-2xl">Nama Guru / Pegawai</th>
                <th className="py-3 px-3">NUPTK / NIP</th>
                <th className="py-3 px-3">Jabatan / Tugas</th>
                <th className="py-3 px-3">Kelengkapan Berkas</th>
                <th className="py-3 px-4 text-right rounded-r-2xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGuru.map((guru) => {
                const cov = getArchiveCoverage(guru.nama, false);
                return (
                  <tr key={guru.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                        {guru.nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate font-bold text-slate-900">{guru.nama}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {guru.id}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-700">{guru.nuptk}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold">
                        {guru.jabatan}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{cov.count} / {cov.total} Berkas</span>
                          <span className={`font-bold ${cov.pct >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {cov.pct}%
                          </span>
                        </div>
                        <div className="w-28 sm:w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              cov.pct >= 75 ? 'bg-emerald-500' : cov.pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
                            }`}
                            style={{ width: `${cov.pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onNavigateToArsip('Arsip Guru', guru.nama)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
                          title="Buka Berkas Guru Ini"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(guru)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                          title="Edit Data"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(guru.id, guru.nama)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                          title="Hapus Guru"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Add / Edit */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-scaleUp border border-slate-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingItem ? 'Edit Data Master' : `Tambah ${activeTab === 'siswa' ? 'Siswa' : 'Guru'} Baru`}
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder={activeTab === 'siswa' ? 'Contoh: Muhammad Ilham Pratama' : 'Contoh: Drs. H. Solikhin, M.Pd'}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {activeTab === 'siswa' ? 'Nomor Induk Siswa Nasional (NISN)' : 'NUPTK / NIP'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formIdentitas}
                  onChange={(e) => setFormIdentitas(e.target.value)}
                  placeholder={activeTab === 'siswa' ? 'Contoh: 0081829301' : 'Contoh: 197405121999031001'}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {activeTab === 'siswa' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Angkatan</label>
                    <input
                      type="text"
                      value={formTahun}
                      onChange={(e) => setFormTahun(e.target.value)}
                      placeholder="2025"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
                    <input
                      type="text"
                      value={formKelasJabatan}
                      onChange={(e) => setFormKelasJabatan(e.target.value)}
                      placeholder="9A / 9B"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan / Mata Pelajaran</label>
                  <input
                    type="text"
                    value={formKelasJabatan}
                    onChange={(e) => setFormKelasJabatan(e.target.value)}
                    placeholder="Contoh: Guru Matematika / Waka Kurikulum"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
