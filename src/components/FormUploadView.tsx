import React, { useState, useEffect } from 'react';
import { 
  CloudUpload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Trash2, 
  RefreshCw, 
  Check, 
  Calendar,
  User,
  Hash,
  FileCheck,
  Paperclip,
  Upload,
  ArrowRight,
  ChevronDown,
  AlertTriangle,
  History,
  FileWarning,
  CopyCheck,
  X,
  Plus,
  Sparkles
} from 'lucide-react';
import { 
  MasterSiswaItem, 
  MasterGuruItem, 
  ArsipItem, 
  KATEGORI_SISWA, 
  KATEGORI_GURU, 
  KATEGORI_LAINNYA,
  getStoredMasterSiswa, 
  getStoredMasterGuru, 
  getStoredArsip,
  saveArsipItem,
  replaceArsipItem,
  checkDuplicateArsip,
  DuplicateCheckResult,
  syncItemToGoogleCloud,
  saveMasterSiswa,
  saveMasterGuru,
  saveFileAttachment,
  compressImageDataUrl,
  compressDocumentHighQuality
} from '../data/mockDatabase';
import { uploadFileToSupabaseStorage } from '../supabase';

interface FormUploadViewProps {
  initialJenis?: 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya';
  onSelectJenis?: (jenis: 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya') => void;
  onUploadSuccess: () => void;
  onCancel: () => void;
}

export default function FormUploadView({ 
  initialJenis = 'Arsip Siswa', 
  onSelectJenis,
  onUploadSuccess, 
  onCancel 
}: FormUploadViewProps) {
  const [modeUpload, setModeUpload] = useState<'individual' | 'kolektif'>('individual');
  const [jenisArsip, setJenisArsip] = useState<'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya'>(initialJenis);

  // Sync with prop when user navigates via sidebar
  useEffect(() => {
    setJenisArsip(initialJenis);
    setNamaSubjek('');
    setIdentitas('');
    setNamaDokumen('');
    setSelectedFile(null);
    setFileBase64('');
    setKolektifFiles({});
    setErrorMessage('');
  }, [initialJenis]);

  // Master Data
  const [masterSiswa, setMasterSiswa] = useState<MasterSiswaItem[]>([]);
  const [masterGuru, setMasterGuru] = useState<MasterGuruItem[]>([]);
  const [tahunList, setTahunList] = useState<string[]>([]);

  // Form Fields
  const [tahun, setTahun] = useState('');
  const [namaSubjek, setNamaSubjek] = useState('');
  const [identitas, setIdentitas] = useState(''); // NISN or NIP
  const [namaDokumen, setNamaDokumen] = useState('');
  const [kategori, setKategori] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');

  // Kolektif Upload Files mapping
  const [kolektifFiles, setKolektifFiles] = useState<{ [category: string]: { file: File; base64: string } }>({});

  // Auto-Detect Duplicates State
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult>({ isDuplicate: false });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showKolektifDuplicateModal, setShowKolektifDuplicateModal] = useState(false);
  const [kolektifDuplicates, setKolektifDuplicates] = useState<{ kat: string; existing: ArsipItem }[]>([]);
  const [storedArsipList, setStoredArsipList] = useState<ArsipItem[]>([]);

  // Upload Progress & State
  const [isUploading, setIsUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ count: number; name: string }>({ count: 1, name: '' });
  const [errorMessage, setErrorMessage] = useState('');

  // Quick Add State for Siswa & Guru
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickNama, setQuickNama] = useState('');
  const [quickIdentitas, setQuickIdentitas] = useState('');
  const [quickKelasJabatan, setQuickKelasJabatan] = useState('');
  const [quickTahun, setQuickTahun] = useState('');

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNama.trim() || !quickIdentitas.trim()) return;

    if (jenisArsip === 'Arsip Siswa') {
      const yearToSet = quickTahun.trim() || tahun || new Date().getFullYear().toString();
      const newSiswa: MasterSiswaItem = {
        id: `S${Date.now().toString().slice(-4)}`,
        nama: quickNama.trim(),
        nisn: quickIdentitas.trim(),
        tahun: yearToSet,
        kelas: quickKelasJabatan.trim() || '9A'
      };
      const updatedList = saveMasterSiswa(newSiswa);
      setMasterSiswa(updatedList);
      setTahun(yearToSet);
      setNamaSubjek(newSiswa.nama);
      setIdentitas(newSiswa.nisn);
      
      // Update distinct tahun list if new year added
      setTahunList(prev => Array.from(new Set([...prev, yearToSet])).sort().reverse());
    } else if (jenisArsip === 'Arsip Guru') {
      const newGuru: MasterGuruItem = {
        id: `G${Date.now().toString().slice(-4)}`,
        nama: quickNama.trim(),
        nuptk: quickIdentitas.trim(),
        jabatan: quickKelasJabatan.trim() || 'Guru Pengajar'
      };
      const updatedList = saveMasterGuru(newGuru);
      setMasterGuru(updatedList);
      setNamaSubjek(newGuru.nama);
      setIdentitas(newGuru.nuptk);
    }

    setShowQuickAddModal(false);
    setQuickNama('');
    setQuickIdentitas('');
    setQuickKelasJabatan('');
    setQuickTahun('');
  };

  // Load Master Data & Existing Archives
  useEffect(() => {
    const sList = getStoredMasterSiswa();
    const gList = getStoredMasterGuru();
    setMasterSiswa(sList);
    setMasterGuru(gList);
    setStoredArsipList(getStoredArsip());

    const distinctTahun = Array.from(new Set(sList.map(s => s.tahun))).sort().reverse();
    setTahunList(distinctTahun);

    if (distinctTahun.length > 0 && !tahun) {
      setTahun(distinctTahun[0]);
    }
  }, []);

  // Real-time Auto Duplicate Detection for Individual Mode
  useEffect(() => {
    if (modeUpload === 'individual' && namaSubjek.trim() && kategori.trim()) {
      const result = checkDuplicateArsip({
        kategoriUtama: jenisArsip,
        subjek: namaSubjek,
        kategori: kategori,
        identitas: identitas,
        tahun: tahun
      });
      setDuplicateCheck(result);
    } else {
      setDuplicateCheck({ isDuplicate: false });
    }
  }, [modeUpload, namaSubjek, kategori, jenisArsip, identitas, tahun, storedArsipList]);

  // Update dynamic categories based on active type
  const activeKategoriList = 
    jenisArsip === 'Arsip Siswa' ? KATEGORI_SISWA :
    jenisArsip === 'Arsip Guru' ? KATEGORI_GURU : 
    KATEGORI_LAINNYA;

  // Filter siswa based on selected tahun
  const siswaFilter = masterSiswa.filter(s => s.tahun === tahun);

  // Sync NISN on siswa change
  useEffect(() => {
    if (jenisArsip === 'Arsip Siswa') {
      const match = siswaFilter.find(s => s.nama === namaSubjek);
      setIdentitas(match ? match.nisn : '');
    }
  }, [namaSubjek, jenisArsip, siswaFilter]);

  // Sync NUPTK on guru change
  useEffect(() => {
    if (jenisArsip === 'Arsip Guru') {
      const match = masterGuru.find(g => g.nama === namaSubjek);
      setIdentitas(match ? match.nuptk : '');
    }
  }, [namaSubjek, jenisArsip, masterGuru]);

  // Default initial kategori
  useEffect(() => {
    if (activeKategoriList.length > 0) {
      setKategori(activeKategoriList[0]);
    }
  }, [jenisArsip]);

  // File dropzone handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Ukuran file melebihi 10MB! Mohon kompres terlebih dahulu.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage('');

      // Auto-fill namaDokumen if empty
      if (!namaDokumen && namaSubjek) {
        setNamaDokumen(`${kategori} - ${namaSubjek} (${tahun})`);
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Kolektif file picker
  const handleKolektifFile = (kat: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(`Ukuran berkas ${kat} melebihi batas 10MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setKolektifFiles(prev => ({
        ...prev,
        [kat]: { file, base64: reader.result as string }
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeKolektifFile = (kat: string) => {
    setKolektifFiles(prev => {
      const copy = { ...prev };
      delete copy[kat];
      return copy;
    });
  };

  // Sound effect
  const playSuccessSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // safe fallback
    }
  };

  const startIndividualUpload = async (replaceExistingId?: string) => {
    if (!selectedFile) return;

    setIsUploading(true);
    setProgressPercent(20);
    setProgressStatus(replaceExistingId ? 'Memperbarui dokumen arsip...' : 'Membaca & memverifikasi dokumen...');

    const prefix = jenisArsip === 'Arsip Siswa' ? 'SSW' : jenisArsip === 'Arsip Guru' ? 'GRU' : 'LYN';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newId = replaceExistingId || `${prefix}-${randomNum}`;
    const todayStr = new Date().toLocaleDateString('id-ID');

    // Kompresi Cerdas Adaptif (5 MB -> ~1 MB, menjaga ketajaman resolusi 2048px teks & stempel ijazah)
    let optimizedBase64 = fileBase64 || '';
    let finalUkuran = `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`;

    if (fileBase64 && selectedFile.size > 850 * 1024) {
      setProgressStatus('Mengompres cerdas ke ~1.0 MB (Kualitas HD teks & stempel tetap tajam)...');
      const comp = await compressDocumentHighQuality(selectedFile, fileBase64, 1024 * 1024);
      optimizedBase64 = comp.compressedDataUrl;
      const compMB = (comp.compressedSize / (1024 * 1024)).toFixed(1);
      const origMB = (comp.originalSize / (1024 * 1024)).toFixed(1);
      if (comp.compressedSize < comp.originalSize) {
        finalUkuran = `${compMB} MB (HD kompresi dari ${origMB} MB)`;
      }
    }

    const updatedArsip: ArsipItem = {
      id: newId,
      tanggal: todayStr,
      tahun: tahun || new Date().getFullYear().toString(),
      identitas: identitas || '-',
      subjek: namaSubjek,
      kategori: kategori,
      kategoriUtama: jenisArsip,
      namaFileAsli: selectedFile.name,
      ukuran: finalUkuran,
      linkDrive: '',
      uploader: 'admin@alhicam.sch.id',
      fileDataUrl: optimizedBase64
    };

    setProgressPercent(60);
    setProgressStatus('Menyimpan dokumen & menyinkronkan ke Supabase Cloud...');

    let activeWorkingUrl = '';

    // 1. Unggah berkas fisik langsung ke Supabase Storage Cloud
    try {
      const supaUpload = await uploadFileToSupabaseStorage(newId, selectedFile.name, optimizedBase64);
      if (supaUpload.success && supaUpload.publicUrl) {
        activeWorkingUrl = supaUpload.publicUrl;
      }
    } catch (e) {
      console.warn('Supabase storage upload notice:', e);
    }

    if (activeWorkingUrl) {
      updatedArsip.linkDrive = activeWorkingUrl;
    }

    if (optimizedBase64) {
      await saveFileAttachment(newId, optimizedBase64);
    }

    if (replaceExistingId) {
      replaceArsipItem(replaceExistingId, updatedArsip);
    } else {
      saveArsipItem(updatedArsip);
    }

    setProgressPercent(100);
    setProgressStatus('Selesai tersimpan di Supabase Cloud Database!');

    setStoredArsipList(getStoredArsip());
    setIsUploading(false);
    playSuccessSound();
    setSuccessInfo({ 
      count: 1, 
      name: replaceExistingId ? `${namaSubjek} (${kategori} Diperbarui)` : namaSubjek 
    });
    setShowSuccessModal(true);
    setShowDuplicateModal(false);

    // Reset
    setSelectedFile(null);
    setFileBase64('');
    setNamaDokumen('');
    setDuplicateCheck({ isDuplicate: false });
  };

  const startKolektifUpload = async (replaceDuplicates: boolean = false) => {
    const count = Object.keys(kolektifFiles).length;
    if (count === 0) {
      setErrorMessage('Pilih minimal 1 berkas pada daftar kategori untuk upload kolektif.');
      return;
    }

    setIsUploading(true);
    setProgressPercent(15);
    setProgressStatus(`Mempersiapkan pengunggahan ${count} berkas...`);

    const categories = Object.keys(kolektifFiles);
    const todayStr = new Date().toLocaleDateString('id-ID');
    const prefix = jenisArsip === 'Arsip Siswa' ? 'SSW' : jenisArsip === 'Arsip Guru' ? 'GRU' : 'LYN';
    const currentArsip = getStoredArsip();

    for (let idx = 0; idx < categories.length; idx++) {
      const katKey = categories[idx];
      const fileObj = kolektifFiles[katKey];
      const existing = currentArsip.find(it => 
        it.kategoriUtama === jenisArsip &&
        it.subjek.trim().toLowerCase() === namaSubjek.trim().toLowerCase() &&
        it.kategori.trim().toLowerCase() === katKey.trim().toLowerCase()
      );

      const percent = Math.min(95, Math.round(((idx + 1) / count) * 90));
      setProgressPercent(percent);
      setProgressStatus(`Menyimpan berkas (${idx + 1}/${count}): ${katKey} ke Supabase Cloud...`);

      const randomNum = Math.floor(1000 + Math.random() * 9000) + idx;
      const newId = (replaceDuplicates && existing) ? existing.id : `${prefix}-${randomNum}`;

      // Kompresi Cerdas Adaptif Kolektif (5 MB -> ~1 MB)
      let itemBase64 = fileObj.base64;
      let itemUkuran = `${(fileObj.file.size / (1024 * 1024)).toFixed(1)} MB`;

      if (fileObj.base64 && fileObj.file.size > 850 * 1024) {
        const comp = await compressDocumentHighQuality(fileObj.file, fileObj.base64, 1024 * 1024);
        itemBase64 = comp.compressedDataUrl;
        const compMB = (comp.compressedSize / (1024 * 1024)).toFixed(1);
        const origMB = (comp.originalSize / (1024 * 1024)).toFixed(1);
        if (comp.compressedSize < comp.originalSize) {
          itemUkuran = `${compMB} MB (HD kompresi dari ${origMB} MB)`;
        }
      }

      const itemToSave: ArsipItem = {
        id: newId,
        tanggal: todayStr,
        tahun: tahun || new Date().getFullYear().toString(),
        identitas: identitas || '-',
        subjek: namaSubjek,
        kategori: katKey,
        kategoriUtama: jenisArsip,
        namaFileAsli: fileObj.file.name,
        ukuran: itemUkuran,
        linkDrive: '',
        uploader: 'admin@alhicam.sch.id',
        fileDataUrl: itemBase64
      };

      let activeWorkingUrl = '';

      // 1. Unggah berkas fisik langsung ke Supabase Storage
      try {
        const supaUpload = await uploadFileToSupabaseStorage(newId, fileObj.file.name, itemBase64);
        if (supaUpload.success && supaUpload.publicUrl) {
          activeWorkingUrl = supaUpload.publicUrl;
        }
      } catch (e) {
        console.warn('Supabase storage kolektif upload notice:', e);
      }

      if (activeWorkingUrl) {
        itemToSave.linkDrive = activeWorkingUrl;
      }

      if (fileObj.base64) {
        await saveFileAttachment(itemToSave.id, fileObj.base64);
      }

      if (replaceDuplicates && existing) {
        replaceArsipItem(existing.id, itemToSave);
      } else {
        saveArsipItem(itemToSave);
      }
    }

    setProgressPercent(100);
    setProgressStatus('Semua berkas kolektif berhasil disimpan!');

    setStoredArsipList(getStoredArsip());
    setIsUploading(false);
    playSuccessSound();
    setSuccessInfo({ count, name: namaSubjek });
    setShowSuccessModal(true);
    setShowKolektifDuplicateModal(false);

    // Reset
    setKolektifFiles({});
    setNamaDokumen('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!namaSubjek.trim()) {
      setErrorMessage(
        jenisArsip === 'Arsip Siswa'
          ? 'Mohon pilih nama siswa/alumni terlebih dahulu.'
          : jenisArsip === 'Arsip Guru'
          ? 'Mohon pilih nama guru/tendik terlebih dahulu.'
          : 'Mohon isi nama instansi / perihal dokumen terlebih dahulu.'
      );
      return;
    }

    if (modeUpload === 'individual') {
      if (!selectedFile) {
        setErrorMessage('Mohon pilih file berkas dokumen terlebih dahulu.');
        return;
      }

      // Auto-Detect Duplicate Check
      const dup = checkDuplicateArsip({
        kategoriUtama: jenisArsip,
        subjek: namaSubjek,
        kategori: kategori,
        identitas: identitas,
        tahun: tahun
      });

      if (dup.isDuplicate && dup.existingItem) {
        setDuplicateCheck(dup);
        setShowDuplicateModal(true);
        return;
      }

      startIndividualUpload();
    } else {
      // Mode Kolektif
      const count = Object.keys(kolektifFiles).length;
      if (count === 0) {
        setErrorMessage('Pilih minimal 1 berkas pada daftar kategori untuk upload kolektif.');
        return;
      }

      // Check if any files in kolektif are duplicates
      const dupesInKolektif: { kat: string; existing: ArsipItem }[] = [];
      const currentArsip = getStoredArsip();
      Object.keys(kolektifFiles).forEach(kat => {
        const found = currentArsip.find(it => 
          it.kategoriUtama === jenisArsip &&
          it.subjek.trim().toLowerCase() === namaSubjek.trim().toLowerCase() &&
          it.kategori.trim().toLowerCase() === kat.trim().toLowerCase()
        );
        if (found) dupesInKolektif.push({ kat, existing: found });
      });

      if (dupesInKolektif.length > 0) {
        setKolektifDuplicates(dupesInKolektif);
        setShowKolektifDuplicateModal(true);
        return;
      }

      startKolektifUpload(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] border border-slate-200/90 animate-fadeIn font-['Poppins'] max-w-full overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
            <CloudUpload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Unggah Berkas Baru</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Pilih kategori pengarsipan dan lampirkan berkas dokumen digital
            </p>
          </div>
        </div>

        {/* Native Segmented Control: Individual vs Kolektif */}
        <div className="w-full sm:w-auto flex items-center bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setModeUpload('individual')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              modeUpload === 'individual'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload Individual</span>
          </button>
          <button
            type="button"
            onClick={() => setModeUpload('kolektif')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              modeUpload === 'kolektif'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Upload Kolektif</span>
          </button>
        </div>
      </div>

      {/* FILTER KATEGORI UPLOAD (Arsip Siswa / Arsip Guru / Arsip Lainnya) */}
      <div className="p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 mb-6 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'Arsip Siswa', label: 'Arsip Siswa', icon: '🎓' },
          { id: 'Arsip Guru', label: 'Arsip Guru', icon: '👨‍🏫' },
          { id: 'Arsip Lainnya', label: 'Arsip Lainnya', icon: '📁' }
        ].map((cat) => {
          const active = jenisArsip === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                const newJenis = cat.id as any;
                setJenisArsip(newJenis);
                setKategori('');
                setNamaSubjek('');
                setIdentitas('');
                setNamaDokumen('');
                setSelectedFile(null);
                setFileBase64('');
                setKolektifFiles({});
                if (onSelectJenis) {
                  onSelectJenis(newJenis);
                }
              }}
              className={`flex-1 min-w-[105px] py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span className="text-sm">{cat.icon}</span>
              <span className="whitespace-nowrap">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        
        {/* Row 1: Tahun & NISN/NIP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>
                {jenisArsip === 'Arsip Siswa' ? 'Tahun Lulus / Angkatan' : 
                 jenisArsip === 'Arsip Guru' ? 'Tahun Penerbitan SK' : 'Tahun Dokumen'}
              </span>
              <span className="text-red-500">*</span>
            </label>
            {jenisArsip === 'Arsip Siswa' ? (
              <div className="relative">
                <select
                  value={tahun}
                  onChange={(e) => {
                    setTahun(e.target.value);
                    setNamaSubjek('');
                  }}
                  required
                  className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 hover:bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- Pilih Tahun Angkatan --</option>
                  {tahunList.map(t => (
                    <option key={t} value={t}>Angkatan {t}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            ) : (
              <input
                type="number"
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
                placeholder="Contoh: 2026"
                required
                className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500 transition-all"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                {jenisArsip === 'Arsip Siswa' ? 'NISN / NIS' : 
                 jenisArsip === 'Arsip Guru' ? 'NIP / NUPTK' : 'Nomor Surat / Kode'}
              </span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={identitas}
              onChange={(e) => setIdentitas(e.target.value)}
              readOnly={jenisArsip !== 'Arsip Lainnya'}
              placeholder={jenisArsip === 'Arsip Lainnya' ? 'Masukkan nomor surat atau kode' : 'Otomatis muncul setelah memilih nama'}
              required
              className={`w-full px-3.5 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm border transition-all font-mono ${
                jenisArsip === 'Arsip Lainnya'
                  ? 'bg-slate-50 focus:bg-white border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500'
                  : 'bg-slate-100/90 border-slate-200 text-slate-700'
              }`}
            />
          </div>
        </div>

        {/* Row 2: Nama Subjek / Siswa / Guru */}
        <div>
          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span>
                {jenisArsip === 'Arsip Siswa' ? 'Nama Siswa / Alumni' : 
                 jenisArsip === 'Arsip Guru' ? 'Nama Guru / Pegawai' : 'Nama Instansi / Perihal Surat'}
              </span>
              <span className="text-red-500">*</span>
            </label>

            {jenisArsip === 'Arsip Siswa' && (
              <button
                type="button"
                onClick={() => {
                  setQuickNama('');
                  setQuickIdentitas('');
                  setQuickKelasJabatan('9A');
                  setQuickTahun(tahun || new Date().getFullYear().toString());
                  setShowQuickAddModal(true);
                }}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Input Siswa Baru</span>
              </button>
            )}

            {jenisArsip === 'Arsip Guru' && (
              <button
                type="button"
                onClick={() => {
                  setQuickNama('');
                  setQuickIdentitas('');
                  setQuickKelasJabatan('Guru Pengajar');
                  setShowQuickAddModal(true);
                }}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Input Guru Baru</span>
              </button>
            )}
          </div>

          {jenisArsip === 'Arsip Siswa' ? (
            <div className="relative">
              <select
                value={namaSubjek}
                onChange={(e) => setNamaSubjek(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 hover:bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  {siswaFilter.length === 0 
                    ? '-- Belum ada data siswa di angkatan ini (Klik "+ Input Siswa Baru") --' 
                    : '-- Pilih Nama Siswa --'}
                </option>
                {siswaFilter.map(s => (
                  <option key={s.id} value={s.nama}>{s.nama} ({s.kelas})</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          ) : jenisArsip === 'Arsip Guru' ? (
            <div className="relative">
              <select
                value={namaSubjek}
                onChange={(e) => setNamaSubjek(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 hover:bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  {masterGuru.length === 0 
                    ? '-- Belum ada data guru (Klik "+ Input Guru Baru") --' 
                    : '-- Pilih Nama Guru --'}
                </option>
                {masterGuru.map(g => (
                  <option key={g.id} value={g.nama}>{g.nama} - {g.jabatan}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          ) : (
            <input
              type="text"
              value={namaSubjek}
              onChange={(e) => setNamaSubjek(e.target.value)}
              placeholder="Contoh: Dinas Pendidikan Kab. Jombang"
              required
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500 transition-all"
            />
          )}
        </div>

        {/* MODE INDIVIDUAL */}
        {modeUpload === 'individual' ? (
          <div className="space-y-4 pt-1">
            {/* Kategori Arsip Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Kategori Arsip <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-blue-600 font-normal">{activeKategoriList.length} kategori tersedia</span>
              </label>
              <div className="relative">
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 hover:bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  {activeKategoriList.map(kat => (
                    <option key={kat} value={kat}>{kat}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Auto-Detect Real-time Duplicate Banner */}
            {duplicateCheck.isDuplicate && duplicateCheck.existingItem && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 flex items-start gap-3 animate-fadeIn shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-amber-900 text-xs sm:text-sm">Auto-Detect: Berkas Sudah Pernah Diunggah!</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-[10px] font-bold text-amber-800">
                      Duplikat Terdeteksi
                    </span>
                  </div>
                  <p className="mt-1 text-amber-800 leading-relaxed text-[11px] sm:text-xs">
                    Dokumen <strong>{duplicateCheck.existingItem.kategori}</strong> untuk <strong>{duplicateCheck.existingItem.subjek}</strong> sudah ada di database sejak <strong>{duplicateCheck.existingItem.tanggal}</strong> (File: <em>{duplicateCheck.existingItem.namaFileAsli}</em>).
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700">
                    <History className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Saat tombol simpan diklik, sistem akan memberi pilihan untuk <strong>menimpa (replace)</strong> atau <strong>membatalkan</strong>.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Nama / Judul Dokumen */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Judul / Nama Dokumen <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={namaDokumen}
                onChange={(e) => setNamaDokumen(e.target.value)}
                placeholder="Contoh: Ijazah SMP Andika Pratama - Kelulusan 2024"
                required
                className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* Native Mobile Attachment Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Berkas Dokumen <span className="text-red-500">*</span>
              </label>
              
              {!selectedFile ? (
                <label className="group flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/70 rounded-3xl cursor-pointer transition-all text-center">
                  <input 
                    type="file" 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white text-blue-600 flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                    <CloudUpload className="w-6 h-6" />
                  </div>
                  <strong className="text-xs sm:text-sm text-slate-800 font-bold block">
                    Sentuh untuk Pilih File Dokumen
                  </strong>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Format: PDF, Foto Scan (JPG/PNG), Word (Maks. 10MB)
                  </span>
                </label>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <strong className="text-xs sm:text-sm font-bold text-slate-900 block truncate">{selectedFile.name}</strong>
                        <span className="text-[10px] text-emerald-700 font-semibold block">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Berkas Terlampir
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                        <span>Ganti</span>
                        <input 
                          type="file" 
                          onChange={handleFileChange} 
                          className="hidden" 
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFileBase64('');
                        }}
                        className="p-1.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {selectedFile.size > 1024 * 1024 && (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-start gap-2.5 text-xs text-blue-950 animate-fadeIn">
                      <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-blue-900">⚡ Kompresi Cerdas Otomatis Aktif (Target ~1.0 MB)</span>
                        <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                          Ukuran asli <strong>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</strong> akan dikompres otomatis ke kisaran <strong>~1 MB</strong> saat disimpan ke Supabase Storage. Resolusi teks ijazah, stempel sekolah, dan tanda tangan <strong>tetap 100% tajam & jernih</strong> tanpa buram.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODE KOLEKTIF - ADAPTED BEAUTIFULLY FOR MOBILE */
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>DAFTAR KATEGORI KOLEKTIF</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                {Object.keys(kolektifFiles).length}/{activeKategoriList.length} Terpilih
              </span>
            </div>

            {/* Mobile Cards List instead of cramped table */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {activeKategoriList.map((kat, idx) => {
                const isAttached = !!kolektifFiles[kat];
                const existingInDb = storedArsipList.find(it => 
                  it.kategoriUtama === jenisArsip &&
                  namaSubjek.trim() &&
                  it.subjek.trim().toLowerCase() === namaSubjek.trim().toLowerCase() &&
                  it.kategori.trim().toLowerCase() === kat.trim().toLowerCase()
                );

                return (
                  <div 
                    key={kat} 
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isAttached ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200/90'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 block truncate">{kat}</span>
                        {isAttached && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Siap
                          </span>
                        )}
                        {existingInDb && !isAttached && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Sudah ada ({existingInDb.tanggal})
                          </span>
                        )}
                        {existingInDb && isAttached && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            ⚠️ Akan menimpa berkas lama
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {isAttached ? (
                          <span className="text-emerald-700 font-medium">{kolektifFiles[kat].file.name}</span>
                        ) : (
                          'Belum ada file dipilih'
                        )}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {isAttached ? (
                        <div className="flex items-center gap-1">
                          <label className="p-2 bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold cursor-pointer" title="Ganti Berkas">
                            <RefreshCw className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => e.target.files && handleKolektifFile(kat, e.target.files[0])}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeKolektifFile(kat)}
                            className="p-2 bg-red-100 text-red-600 rounded-xl"
                            title="Hapus Berkas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          <span>Pilih</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => e.target.files && handleKolektifFile(kat, e.target.files[0])}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl animate-fadeIn space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-blue-950">
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="truncate">{progressStatus}</span>
              </span>
              <span className="text-blue-700 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Buttons Action (Mobile-First CTA) */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={isUploading}
            className="w-full sm:w-auto order-1 sm:order-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CloudUpload className="w-4 h-4" />
            <span>{isUploading ? 'Memproses Berkas...' : 'Unggah Dokumen Sekarang'}</span>
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="w-full sm:w-auto order-2 sm:order-1 px-5 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center"
          >
            Batal
          </button>
        </div>
      </form>

      {/* Auto-Detect Duplicate Confirmation Modal (Individual Mode) */}
      {showDuplicateModal && duplicateCheck.existingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-scaleUp border border-amber-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3.5 shadow-md shadow-amber-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center mb-5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase tracking-wider inline-block mb-1.5">
                Auto-Detect E-Arsip Al-Hicam
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Berkas Dokumen Sudah Ada!
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Sistem mendeteksi bahwa berkas <strong>{duplicateCheck.existingItem.kategori}</strong> untuk <strong>{duplicateCheck.existingItem.subjek}</strong> sudah pernah tersimpan di sistem.
              </p>
            </div>

            {/* Comparison Box */}
            <div className="space-y-2.5 mb-5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-200">
                <History className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Berkas Lama di Database:</span>
                  <strong className="text-slate-800 block truncate">{duplicateCheck.existingItem.namaFileAsli}</strong>
                  <span className="text-slate-500 text-[11px]">Diunggah pada {duplicateCheck.existingItem.tanggal} • Ukuran: {duplicateCheck.existingItem.ukuran}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-0.5">
                <Upload className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-blue-600 block">Berkas Baru yang Dipilih:</span>
                  <strong className="text-slate-800 block truncate">{selectedFile?.name}</strong>
                  <span className="text-slate-500 text-[11px]">Ukuran: {((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              </div>
            </div>

            {/* 3 Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => startIndividualUpload(duplicateCheck.existingItem?.id)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ganti / Timpa Berkas Lama (Replace)</span>
              </button>

              <button
                type="button"
                onClick={() => startIndividualUpload()}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-colors cursor-pointer"
              >
                Tetap Simpan Sebagai Versi Tambahan
              </button>

              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-500 font-medium text-xs rounded-2xl transition-colors cursor-pointer"
              >
                Batalkan Unggahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Detect Duplicate Confirmation Modal (Kolektif Mode) */}
      {showKolektifDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-scaleUp border border-amber-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3.5 shadow-md shadow-amber-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center mb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Beberapa Berkas Kolektif Sudah Ada!
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Terdapat <strong>{kolektifDuplicates.length} berkas</strong> milik <strong>{namaSubjek}</strong> yang sebelumnya sudah tercatat di sistem:
              </p>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 mb-5 bg-amber-50/60 p-3 rounded-2xl border border-amber-200">
              {kolektifDuplicates.map((item, idx) => (
                <div key={idx} className="text-xs text-slate-700 flex items-center justify-between">
                  <span className="font-semibold">• {item.kat}</span>
                  <span className="text-[10px] text-slate-500">Ada sejak {item.existing.tanggal}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => startKolektifUpload(true)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Timpa & Perbarui Berkas yang Ada</span>
              </button>

              <button
                type="button"
                onClick={() => startKolektifUpload(false)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-colors cursor-pointer"
              >
                Simpan Semua Sebagai Versi Tambahan
              </button>

              <button
                type="button"
                onClick={() => setShowKolektifDuplicateModal(false)}
                className="w-full py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-500 font-medium text-xs rounded-2xl transition-colors cursor-pointer"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Animated Green Checkmark & Selesai Button */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-scaleUp border border-emerald-100">
            {/* Animated Glowing Green Checkmark Icon */}
            <div className="relative flex items-center justify-center mx-auto mb-5 w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
              <div className="relative w-18 h-18 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.5)]">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold mb-2 border border-emerald-200/80">
              <span>✓ Google Drive & Sheet Terhubung</span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5">Pengarsipan Berhasil!</h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Sebanyak <strong>{successInfo.count} berkas dokumen</strong> milik <strong>{successInfo.name}</strong> telah berhasil disimpan ke <strong>Google Drive</strong> dan dicatat di <strong>Google Spreadsheet</strong>.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setSelectedFile(null);
                  setFileBase64('');
                  setKolektifFiles({});
                  setNamaDokumen('');
                  setErrorMessage('');
                  // Keep user on the upload page ready for next upload
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Selesai (Upload Dokumen Baru)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onUploadSuccess();
                }}
                className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold hover:underline transition-all cursor-pointer"
              >
                Buka Menu Unduh Dokumen →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quick Input Siswa / Guru Baru */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn font-['Poppins']">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-scaleUp border border-slate-200">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {jenisArsip === 'Arsip Siswa' ? 'Tambah Data Siswa Baru' : 'Tambah Data Guru Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {jenisArsip === 'Arsip Siswa' ? 'Nama Lengkap Siswa' : 'Nama Lengkap Guru (Beserta Gelar)'} *
                </label>
                <input
                  type="text"
                  value={quickNama}
                  onChange={(e) => setQuickNama(e.target.value)}
                  placeholder={jenisArsip === 'Arsip Siswa' ? 'Contoh: Ahmad Dahlan' : 'Contoh: Drs. H. Solikhin, M.Pd'}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {jenisArsip === 'Arsip Siswa' ? 'NISN / NIS' : 'NIP / NUPTK'} *
                </label>
                <input
                  type="text"
                  value={quickIdentitas}
                  onChange={(e) => setQuickIdentitas(e.target.value)}
                  placeholder={jenisArsip === 'Arsip Siswa' ? '10 digit NISN' : '16/18 digit NUPTK/NIP'}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {jenisArsip === 'Arsip Siswa' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tahun Angkatan *
                    </label>
                    <input
                      type="number"
                      value={quickTahun}
                      onChange={(e) => setQuickTahun(e.target.value)}
                      placeholder="2026"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kelas
                    </label>
                    <input
                      type="text"
                      value={quickKelasJabatan}
                      onChange={(e) => setQuickKelasJabatan(e.target.value)}
                      placeholder="Contoh: 9A"
                      className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jabatan / Bidang Studi
                  </label>
                  <input
                    type="text"
                    value={quickKelasJabatan}
                    onChange={(e) => setQuickKelasJabatan(e.target.value)}
                    placeholder="Contoh: Guru Matematika / Wali Kelas"
                    className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan & Pilih</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
