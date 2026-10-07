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
  ChevronDown,
  X,
  Users,
  Table as TableIcon,
  ClipboardList,
  Save,
  Check,
  RotateCcw,
  Eye,
  FolderOpen,
  CloudUpload
} from 'lucide-react';
import { 
  MasterSiswaItem, 
  MasterGuruItem, 
  ArsipItem,
  getStoredMasterSiswa, 
  getStoredMasterGuru, 
  getStoredArsip,
  getFileAttachment,
  getSanitizedMasterData,
  saveMasterSiswa, 
  deleteMasterSiswa, 
  saveMasterGuru, 
  deleteMasterGuru,
  getActiveKategoriSiswa,
  getActiveKategoriGuru
} from '../data/mockDatabase';
import { clearMasterSiswaInSupabase, clearMasterGuruInSupabase, fetchSanitizedMasterDataFromSupabase } from '../supabase';

interface BukuIndukViewProps {
  onNavigateToArsip: (sub: 'Arsip Siswa' | 'Arsip Guru', namaSubjek: string) => void;
  onPreview?: (item: ArsipItem) => void;
  onNavigateToUpload?: (sub: 'Arsip Siswa' | 'Arsip Guru', namaSubjek: string) => void;
}

interface BatchSiswaRow {
  id?: string;
  nama: string;
  nisn: string;
  tahun: string;
  jenisKelamin: string;
}

interface BatchGuruRow {
  id?: string;
  nama: string;
  nuptk: string;
  jabatan: string;
}

interface ViewingPerson {
  id: string;
  nama: string;
  isSiswa: boolean;
  nisnOrNuptk: string;
  tahunOrJabatan: string;
  jenisKelamin?: string;
}

export default function BukuIndukView({ onNavigateToArsip, onPreview, onNavigateToUpload }: BukuIndukViewProps) {
  const [activeTab, setActiveTab] = useState<'siswa' | 'guru'>('siswa');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTahun, setFilterTahun] = useState('SEMUA');

  // Master Data State
  const [siswaList, setSiswaList] = useState<MasterSiswaItem[]>(() => getSanitizedMasterData().siswa);
  const [guruList, setGuruList] = useState<MasterGuruItem[]>(() => getSanitizedMasterData().guru);

  // Individual Uploaded Files Modal State (Specific replacement for Rekap)
  const [viewingPerson, setViewingPerson] = useState<ViewingPerson | null>(null);

  const reloadMasterData = async () => {
    const supaData = await fetchSanitizedMasterDataFromSupabase().catch(() => null);
    if (supaData) {
      setSiswaList(supaData.siswa);
      setGuruList(supaData.guru);
    } else {
      const { siswa, guru } = getSanitizedMasterData();
      setSiswaList(siswa);
      setGuruList(guru);
    }
  };

  useEffect(() => {
    // Non-blocking deferred cloud reload for instant 60fps menu navigation
    const timer = setTimeout(() => {
      reloadMasterData();
    }, 40);

    const handleCloudUpdate = () => reloadMasterData();
    window.addEventListener('earsip:cloud-synced', handleCloudUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('earsip:cloud-synced', handleCloudUpdate);
    };
  }, []);

  const arsipList = useMemo(() => getStoredArsip(), [siswaList, guruList]);

  // Precomputed archive count lookup map for instantaneous O(1) performance
  const coverageMap = useMemo(() => {
    const targetKategoriSiswa = getActiveKategoriSiswa();
    const targetKategoriGuru = getActiveKategoriGuru();
    const totalSiswa = targetKategoriSiswa.length || 1;
    const totalGuru = targetKategoriGuru.length || 1;

    const countMap = new Map<string, number>();
    arsipList.forEach(a => {
      if (a.kategoriUtama === 'Arsip Siswa' || a.kategoriUtama === 'Arsip Guru') {
        const key = `${a.kategoriUtama}_${a.subjek.trim().toLowerCase()}`;
        countMap.set(key, (countMap.get(key) || 0) + 1);
      }
    });

    return { countMap, totalSiswa, totalGuru };
  }, [arsipList]);

  // Modal State for adding/editing (Interactive Excel Table Grid)
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Batch Rows for Excel-style interactive table
  const [batchSiswaRows, setBatchSiswaRows] = useState<BatchSiswaRow[]>([]);
  const [batchGuruRows, setBatchGuruRows] = useState<BatchGuruRow[]>([]);

  // Pastebox state for copying directly from Excel / Sheets
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Helper to create empty rows
  const createEmptySiswaRows = (count = 5): BatchSiswaRow[] => {
    const defaultYear = new Date().getFullYear().toString();
    return Array.from({ length: count }, () => ({
      nama: '',
      nisn: '',
      tahun: defaultYear,
      jenisKelamin: 'L'
    }));
  };

  const createEmptyGuruRows = (count = 5): BatchGuruRow[] => {
    return Array.from({ length: count }, () => ({
      nama: '',
      nuptk: '',
      jabatan: 'Guru Pengajar'
    }));
  };

  // Distinct Years
  const distinctTahun = useMemo(() => {
    const set = new Set(siswaList.map(s => s.tahun));
    return Array.from(set).sort().reverse();
  }, [siswaList]);

  // Fast O(1) archive coverage calculation
  const getArchiveCoverage = (nama: string, isSiswa: boolean) => {
    const mainCat = isSiswa ? 'Arsip Siswa' : 'Arsip Guru';
    const key = `${mainCat}_${nama.trim().toLowerCase()}`;
    const count = coverageMap.countMap.get(key) || 0;
    const total = isSiswa ? coverageMap.totalSiswa : coverageMap.totalGuru;
    const pct = Math.min(100, Math.round((count / total) * 100));
    return { count, total, pct, isComplete: count >= 3 };
  };

  // Filtered Siswa
  const filteredSiswa = useMemo(() => {
    return siswaList.filter(s => {
      const matchTahun = filterTahun === 'SEMUA' || s.tahun === filterTahun;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q) || s.jenisKelamin.toLowerCase().includes(q);
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

  // Open Modal logic
  const handleOpenAddModal = (existingToEdit?: any) => {
    setShowPasteBox(false);
    setPasteRawText('');
    setEditingItem(existingToEdit || null);

    if (activeTab === 'siswa') {
      if (existingToEdit) {
        setBatchSiswaRows([{
          id: existingToEdit.id,
          nama: existingToEdit.nama,
          nisn: existingToEdit.nisn,
          tahun: existingToEdit.tahun,
          jenisKelamin: existingToEdit.jenisKelamin
        }]);
      } else {
        setBatchSiswaRows(createEmptySiswaRows(5));
      }
    } else {
      if (existingToEdit) {
        setBatchGuruRows([{
          id: existingToEdit.id,
          nama: existingToEdit.nama,
          nuptk: existingToEdit.nuptk,
          jabatan: existingToEdit.jabatan
        }]);
      } else {
        setBatchGuruRows(createEmptyGuruRows(5));
      }
    }

    setShowAddModal(true);
  };

  // Add extra rows to batch table
  const handleAddMoreRows = (count = 5) => {
    if (activeTab === 'siswa') {
      setBatchSiswaRows(prev => [...prev, ...createEmptySiswaRows(count)]);
    } else {
      setBatchGuruRows(prev => [...prev, ...createEmptyGuruRows(count)]);
    }
  };

  // Handle Excel paste parsing
  const handleProcessPasteData = () => {
    if (!pasteRawText.trim()) return;

    const lines = pasteRawText.trim().split(/\r?\n/);
    const yearDefault = new Date().getFullYear().toString();

    if (activeTab === 'siswa') {
      const parsedRows: BatchSiswaRow[] = [];
      lines.forEach(line => {
        if (!line.trim()) return;
        // Split by tab (Excel/Sheets) or comma or semicolon
        const cols = line.includes('\t') ? line.split('\t') : line.split(/[,;]/);
        const nama = (cols[0] || '').trim();
        const nisn = (cols[1] || '').trim();
        const tahun = (cols[2] || '').trim() || yearDefault;
        const jenisKelamin = (cols[3] || '').trim() || 'L';

        if (nama) {
          parsedRows.push({ nama, nisn, tahun, jenisKelamin });
        }
      });

      if (parsedRows.length > 0) {
        // Replace or prepend valid rows
        setBatchSiswaRows(prev => {
          const validExisting = prev.filter(r => r.nama.trim() || r.nisn.trim());
          return [...parsedRows, ...validExisting];
        });
        setShowPasteBox(false);
        setPasteRawText('');
      }
    } else {
      const parsedRows: BatchGuruRow[] = [];
      lines.forEach(line => {
        if (!line.trim()) return;
        const cols = line.includes('\t') ? line.split('\t') : line.split(/[,;]/);
        const nama = (cols[0] || '').trim();
        const nuptk = (cols[1] || '').trim();
        const jabatan = (cols[2] || '').trim() || 'Guru Pengajar';

        if (nama) {
          parsedRows.push({ nama, nuptk, jabatan });
        }
      });

      if (parsedRows.length > 0) {
        setBatchGuruRows(prev => {
          const validExisting = prev.filter(r => r.nama.trim() || r.nuptk.trim());
          return [...parsedRows, ...validExisting];
        });
        setShowPasteBox(false);
        setPasteRawText('');
      }
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  // Direct download file attachment helper
  const handleDownloadFile = async (item: ArsipItem) => {
    try {
      let dataUrl = item.fileDataUrl;
      if (!dataUrl) {
        dataUrl = await getFileAttachment(item.id) || '';
      }
      if (!dataUrl) {
        alert('Berkas sedang disinkronkan dari Cloud. Mohon coba sesaat lagi.');
        return;
      }
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = item.namaFileAsli || `${item.kategori}_${item.subjek}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  // Save All Batch Rows to LocalStorage & Supabase
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'siswa') {
      const validRows = batchSiswaRows.filter(r => r.nama.trim() && r.nisn.trim());
      if (validRows.length === 0) {
        alert('Mohon isi minimal 1 baris siswa dengan Nama Lengkap dan NISN!');
        return;
      }

      setIsSaving(true);
      setSaveSuccessMsg('Menghubungkan ke Supabase Cloud & menyimpan data...');
      await new Promise(r => setTimeout(r, 2200));

      let updatedList = getStoredMasterSiswa();
      validRows.forEach((row, idx) => {
        const newItem: MasterSiswaItem = {
          id: row.id || `S${(Date.now() + idx).toString().slice(-5)}`,
          nama: row.nama.trim(),
          nisn: row.nisn.trim(),
          tahun: row.tahun.trim() || new Date().getFullYear().toString(),
          jenisKelamin: row.jenisKelamin.trim() || 'L'
        };
        updatedList = saveMasterSiswa(newItem);
      });

      setSiswaList(updatedList);
      setIsSaving(false);
      setSaveSuccessMsg(`✓ Berhasil menyimpan ${validRows.length} data siswa ke Master Data!`);
    } else {
      const validRows = batchGuruRows.filter(r => r.nama.trim() && r.nuptk.trim());
      if (validRows.length === 0) {
        alert('Mohon isi minimal 1 baris guru dengan Nama Lengkap dan NUPTK/NIP!');
        return;
      }

      setIsSaving(true);
      setSaveSuccessMsg('Menghubungkan ke Supabase Cloud & menyimpan data...');
      await new Promise(r => setTimeout(r, 2200));

      let updatedList = getStoredMasterGuru();
      validRows.forEach((row, idx) => {
        const newItem: MasterGuruItem = {
          id: row.id || `G${(Date.now() + idx).toString().slice(-5)}`,
          nama: row.nama.trim(),
          nuptk: row.nuptk.trim(),
          jabatan: row.jabatan.trim() || 'Guru Pengajar'
        };
        updatedList = saveMasterGuru(newItem);
      });

      setGuruList(updatedList);
      setIsSaving(false);
      setSaveSuccessMsg(`✓ Berhasil menyimpan ${validRows.length} data guru/tendik ke Master Data!`);
    }

    // Trigger global cloud sync event for instant Master Data updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('earsip:cloud-synced'));
    }

    setTimeout(() => {
      setShowAddModal(false);
      setEditingItem(null);
      setSaveSuccessMsg('');
    }, 1200);
  };

  const handleDelete = async (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus data ${nama} dari master data?`)) {
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
      csvContent += "NISN,Nama Siswa,Angkatan,Jenis Kelamin,Kelengkapan Berkas\r\n";
      filteredSiswa.forEach(s => {
        const cov = getArchiveCoverage(s.nama, true);
        csvContent += `"${s.nisn}","${s.nama}","${s.tahun}","${s.jenisKelamin}","${cov.count}/${cov.total} (${cov.pct}%)"\r\n`;
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
    link.setAttribute("download", `Master_Data_${activeTab === 'siswa' ? 'Siswa' : 'Guru'}_SMP_AlHikam.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl p-3 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] border border-slate-200/90 animate-fadeIn font-['Poppins'] max-w-full overflow-x-hidden">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/25 flex-shrink-0">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-tight">Master Data (Siswa & Guru)</h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Terintegrasi
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Direktori resmi basis data siswa, alumni, dan dewan guru SMP Al-Hikam
            </p>
          </div>
        </div>

        {/* Tab Switcher & Clean Action CTA */}
        <div className="w-full lg:w-auto flex flex-wrap items-center justify-between lg:justify-end gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => {
                setActiveTab('siswa');
                setSearchTerm('');
              }}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'siswa'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Siswa ({siswaList.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('guru');
                setSearchTerm('');
              }}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'guru'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Guru ({guruList.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={async () => {
                if (confirm(`Yakin ingin mengosongkan seluruh data ${activeTab === 'siswa' ? 'Siswa & Alumni' : 'Pendidik & Tendik'}?`)) {
                  if (activeTab === 'siswa') {
                    localStorage.setItem('EARSIP_MASTER_SISWA', JSON.stringify([]));
                    await clearMasterSiswaInSupabase();
                    setSiswaList([]);
                  } else {
                    localStorage.setItem('EARSIP_MASTER_GURU', JSON.stringify([]));
                    await clearMasterGuruInSupabase();
                    setGuruList([]);
                  }
                  alert(`Berhasil mengosongkan seluruh data ${activeTab === 'siswa' ? 'Siswa' : 'Guru'}.`);
                }
              }}
              className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Kosongkan semua data"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kosongkan</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Unduh Spreadsheet CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={() => handleOpenAddModal()}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{activeTab === 'siswa' ? '+ Tambah Siswa' : '+ Tambah Guru'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'siswa' ? 'Cari nama siswa, NISN, atau kelas...' : 'Cari nama guru, NUPTK/NIP, atau jabatan...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-slate-400"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {activeTab === 'siswa' && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="SEMUA">Semua Tahun Angkatan</option>
              {distinctTahun.map(th => (
                <option key={th} value={th}>Angkatan {th}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TABLE VIEW */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-xs">
        {activeTab === 'siswa' ? (
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Siswa / Alumni</th>
                <th className="py-3.5 px-4">NISN</th>
                <th className="py-3.5 px-4">Angkatan</th>
                <th className="py-3.5 px-4">Jenis Kelamin</th>
                <th className="py-3.5 px-4">Kelengkapan Berkas</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">Tidak ada data siswa ditemukan</p>
                      <p className="text-xs text-slate-400">Coba ubah pencarian atau tambah siswa baru di atas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((siswa) => {
                  const cov = getArchiveCoverage(siswa.nama, true);
                  return (
                    <tr key={siswa.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {siswa.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-blue-600 transition-colors">
                              {siswa.nama}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {siswa.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{siswa.nisn || '-'}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">Angkatan {siswa.tahun}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200/60">
                          {siswa.jenisKelamin || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 max-w-[160px]">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                cov.pct >= 80 ? 'bg-emerald-500' : cov.pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'
                              }`} 
                              style={{ width: `${cov.pct}%` }} 
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 font-mono">{cov.count}/{cov.total}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setViewingPerson({
                                id: siswa.id,
                                nama: siswa.nama,
                                isSiswa: true,
                                nisnOrNuptk: siswa.nisn,
                                tahunOrJabatan: `Angkatan ${siswa.tahun}`,
                                jenisKelamin: siswa.jenisKelamin
                              });
                            }}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Lihat Berkas Arsip Real"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAddModal(siswa)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Nama Guru / Tendik</th>
                <th className="py-3.5 px-4">NUPTK / NIP</th>
                <th className="py-3.5 px-4">Jabatan</th>
                <th className="py-3.5 px-4">Kelengkapan Berkas</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGuru.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">Tidak ada data guru ditemukan</p>
                      <p className="text-xs text-slate-400">Coba ubah kata kunci atau tambah guru baru di atas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGuru.map((guru) => {
                  const cov = getArchiveCoverage(guru.nama, false);
                  return (
                    <tr key={guru.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {guru.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-emerald-700 transition-colors">
                              {guru.nama}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {guru.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{guru.nuptk || '-'}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{guru.jabatan}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 max-w-[160px]">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                cov.pct >= 80 ? 'bg-emerald-500' : cov.pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'
                              }`} 
                              style={{ width: `${cov.pct}%` }} 
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 font-mono">{cov.count}/{cov.total}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setViewingPerson({
                                id: guru.id,
                                nama: guru.nama,
                                isSiswa: false,
                                nisnOrNuptk: guru.nuptk,
                                tahunOrJabatan: guru.jabatan
                              });
                            }}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Lihat Berkas Guru Real"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAddModal(guru)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ===================================================================== */}
      {/* REVISED INTERACTIVE EXCEL TABLE GRID MODAL FOR BATCH ADD / EDIT        */}
      {/* ===================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl animate-scaleUp border border-slate-100 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <TableIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight">
                    {editingItem 
                      ? `Edit Data ${activeTab === 'siswa' ? 'Siswa' : 'Guru'}`
                      : `Tambah / Input Massal Data ${activeTab === 'siswa' ? 'Siswa' : 'Guru / Tendik'}`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tabel interaktif bergaya Excel. Ketik langsung atau tempel baris dari Microsoft Excel / Google Sheets!
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              
              {/* Notification Banner */}
              {saveSuccessMsg ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 animate-fadeIn shadow-md">
                  <Check className="w-5 h-5 flex-shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              ) : null}

              {/* Toolbar Controls Above Grid */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-blue-600" />
                    Input Kolektif:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddMoreRows(1)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>+1 Baris</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMoreRows(5)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>+5 Baris</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasteBox(!showPasteBox)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    showPasteBox 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'bg-slate-800 text-white hover:bg-slate-700 shadow-sm'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>{showPasteBox ? 'Tutup Tempel Excel' : '📋 Tempel (Paste) dari Excel / Sheets'}</span>
                </button>
              </div>

              {/* Paste Box Drawer */}
              {showPasteBox && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span>Tempelkan Baris Data dari Excel / Google Sheets</span>
                    </label>
                    <span className="text-[10px] text-amber-700 font-mono">Format: [Nama], [NISN/NUPTK], [Tahun/Jabatan], [Kelas]</span>
                  </div>
                  <textarea
                    rows={4}
                    value={pasteRawText}
                    onChange={(e) => setPasteRawText(e.target.value)}
                    placeholder={
                      activeTab === 'siswa'
                        ? "Salin dari Excel lalu tempel di sini:\nMuhammad Ilham\t0081829301\t2025\t9A\nSiti Rahma\t0081829302\t2025\t9B"
                        : "Salin dari Excel lalu tempel di sini:\nDrs. H. Solikhin, M.Pd\t197405121999031001\tKepala Sekolah\nSiti Aminah, S.Pd\t198208152006042015\tGuru Matematika"
                    }
                    className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteBox(false)}
                      className="px-3 py-1.5 rounded-xl border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessPasteData}
                      className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-sm"
                    >
                      ✓ Terapkan Data Tempelan ke Tabel
                    </button>
                  </div>
                </div>
              )}

              {/* INTERACTIVE TABLE GRID */}
              <form id="batch-form" onSubmit={handleSaveBatch}>
                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                  {activeTab === 'siswa' ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3 w-12 text-center">No</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Nama Lengkap Siswa *</th>
                          <th className="py-2.5 px-3 min-w-[140px]">NIS / NISN *</th>
                          <th className="py-2.5 px-3 w-32">Th Angkatan</th>
                          <th className="py-2.5 px-3 w-32">Jenis Kelamin</th>
                          <th className="py-2.5 px-3 w-12 text-center">Hapus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {batchSiswaRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                            <td className="py-2 px-3 text-center font-bold text-slate-400 font-mono bg-slate-50/50">
                              {idx + 1}
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.nama}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchSiswaRows(prev => {
                                    const copy = [...prev];
                                    copy[idx].nama = val;
                                    return copy;
                                  });
                                }}
                                placeholder="Contoh: Muhammad Ilham"
                                className="w-full px-3 py-2 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none transition-all"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.nisn}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchSiswaRows(prev => {
                                    const copy = [...prev];
                                    copy[idx].nisn = val;
                                    return copy;
                                  });
                                }}
                                placeholder="Contoh: 0081829301"
                                className="w-full px-3 py-2 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-mono font-medium text-slate-800 focus:outline-none transition-all"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.tahun}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchSiswaRows(prev => {
                                    const copy = [...prev];
                                    copy[idx].tahun = val;
                                    return copy;
                                  });
                                }}
                                placeholder="2025"
                                className="w-full px-3 py-2 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none transition-all"
                              />
                            </td>
                            <td className="p-1">
                              <select
                                value={row.jenisKelamin || 'L'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchSiswaRows(prev => {
                                    const copy = [...prev];
                                    copy[idx].jenisKelamin = val;
                                    return copy;
                                  });
                                }}
                                className="w-full px-3 py-2 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none transition-all cursor-pointer"
                              >
                                <option value="L">L (Laki-laki)</option>
                                <option value="P">P (Perempuan)</option>
                              </select>
                            </td>
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (batchSiswaRows.length <= 1) {
                                    setBatchSiswaRows(createEmptySiswaRows(1));
                                  } else {
                                    setBatchSiswaRows(prev => prev.filter((_, i) => i !== idx));
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Hapus baris ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3 w-12 text-center">No</th>
                          <th className="py-2.5 px-3 min-w-[220px]">Nama Lengkap Guru / Tendik *</th>
                          <th className="py-2.5 px-3 min-w-[160px]">NIP / NUPTK *</th>
                          <th className="py-2.5 px-3 min-w-[180px]">Jabatan / Mata Pelajaran</th>
                          <th className="py-2.5 px-3 w-12 text-center">Hapus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {batchGuruRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-emerald-50/20 transition-colors">
                            <td className="py-2 px-3 text-center font-bold text-slate-400 font-mono bg-slate-50/50">
                              {idx + 1}
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.nama}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchGuruRows(prev => {
                                    const copy = [...prev];
                                    copy[idx].nama = val;
                                    return copy;
                                  });
                                }}
                                placeholder="Contoh: Drs. H. Solikhin, M.Pd"
                                className="w-full px-3 py-2 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none transition-all"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.nuptk}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchGuruRows(prev => {
                                    const copy = [...prev];
                                    copy[idx].nuptk = val;
                                    return copy;
                                  });
                                }}
                                placeholder="Contoh: 197405121999031001"
                                className="w-full px-3 py-2 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-mono font-medium text-slate-800 focus:outline-none transition-all"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={row.jabatan}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchGuruRows(prev => {
                                    const copy = [...prev];
                                    copy[idx].jabatan = val;
                                    return copy;
                                  });
                                }}
                                placeholder="Contoh: Guru Matematika"
                                className="w-full px-3 py-2 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none transition-all"
                              />
                            </td>
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (batchGuruRows.length <= 1) {
                                    setBatchGuruRows(createEmptyGuruRows(1));
                                  } else {
                                    setBatchGuruRows(prev => prev.filter((_, i) => i !== idx));
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Hapus baris ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </form>

            </div>

            {/* Modal Footer with SAVE Button */}
            <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 bg-slate-50/50 rounded-b-3xl">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {activeTab === 'siswa'
                    ? `${batchSiswaRows.filter(r => r.nama.trim() && r.nisn.trim()).length} dari ${batchSiswaRows.length} baris terisi valid`
                    : `${batchGuruRows.filter(r => r.nama.trim() && r.nuptk.trim()).length} dari ${batchGuruRows.length} baris terisi valid`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  form="batch-form"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-500/30 active:scale-95 transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>MENYIMPAN DATA...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>SAVE / SIMPAN SEMUA DATA</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL LIHAT BERKAS REAL INDIVIDUAL (PENGGANTI FITUR REKAP SPESIFIK)   */}
      {/* ===================================================================== */}
      {viewingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-3xl w-full shadow-2xl animate-scaleUp border border-slate-100 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-md ${
                  viewingPerson.isSiswa 
                    ? 'bg-blue-600 text-white shadow-blue-500/20' 
                    : 'bg-emerald-600 text-white shadow-emerald-500/20'
                }`}>
                  {viewingPerson.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      {viewingPerson.nama}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      viewingPerson.isSiswa 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {viewingPerson.isSiswa ? 'Siswa' : 'Guru / Tendik'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingPerson.isSiswa 
                      ? `NISN: ${viewingPerson.nisnOrNuptk || '-'} • ${viewingPerson.tahunOrJabatan}` 
                      : `NUPTK/NIP: ${viewingPerson.nisnOrNuptk || '-'} • ${viewingPerson.tahunOrJabatan}`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingPerson(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress & Stat Banner */}
            {(() => {
              const coverage = getArchiveCoverage(viewingPerson.nama, viewingPerson.isSiswa);
              const targetKategori = viewingPerson.isSiswa ? getActiveKategoriSiswa() : getActiveKategoriGuru();
              const personArsip = arsipList.filter(a => 
                a.kategoriUtama === (viewingPerson.isSiswa ? 'Arsip Siswa' : 'Arsip Guru') &&
                a.subjek.trim().toLowerCase() === viewingPerson.nama.trim().toLowerCase()
              );

              return (
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  
                  {/* Status Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700">Kelengkapan Berkas Digital</span>
                      <span className="text-xs font-mono font-bold text-blue-700">
                        {coverage.count} dari {coverage.total} Berkas ({coverage.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          coverage.pct >= 80 ? 'bg-emerald-500' : coverage.pct >= 40 ? 'bg-blue-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${coverage.pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Document Breakdown Cards Grid */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Daftar Dokumen Real ({targetKategori.length} Jenis Kategori)
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {targetKategori.map((cat, idx) => {
                        const fileItem = personArsip.find(a => 
                          a.kategori.trim().toLowerCase() === cat.trim().toLowerCase()
                        );
                        const isUploaded = !!fileItem;

                        return (
                          <div 
                            key={idx}
                            className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                              isUploaded 
                                ? 'bg-emerald-50/40 border-emerald-200/90 shadow-xs' 
                                : 'bg-slate-50/60 border-slate-200/80 border-dashed'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                                  isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200/70 text-slate-400'
                                }`}>
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate leading-snug">
                                    {cat}
                                  </p>
                                  {isUploaded ? (
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                                      {fileItem.namaFileAsli || `${cat}.pdf`}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      Belum ada berkas terunggah
                                    </p>
                                  )}
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                                isUploaded 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {isUploaded ? '✓ Terupload' : 'Belum Ada'}
                              </span>
                            </div>

                            {/* File Info & Action Buttons (Only for Uploaded Files) */}
                            {isUploaded && (
                              <div className="flex items-center justify-between pt-2 border-t border-emerald-100 mt-2.5">
                                <span className="text-[10px] text-slate-400">
                                  {fileItem.tanggal || 'Tersimpan'} {fileItem.ukuran ? `• ${fileItem.ukuran}` : ''}
                                </span>
                                <div className="flex items-center gap-1">
                                  {onPreview && (
                                    <button
                                      onClick={() => onPreview(fileItem)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                                      title="Lihat Berkas"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Lihat</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDownloadFile(fileItem)}
                                    className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                                    title="Unduh Berkas"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-shrink-0">
              <span className="text-[11px] text-slate-400">
                Total {viewingPerson.isSiswa ? 8 : 14} dokumen wajib kearsipan sekolah
              </span>
              <button
                onClick={() => setViewingPerson(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
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
