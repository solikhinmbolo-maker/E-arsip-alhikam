import React, { useState, useMemo, useRef } from 'react';
import { 
  Stamp, 
  ShieldCheck, 
  QrCode, 
  Printer, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck2, 
  FileText, 
  Calendar, 
  Award, 
  UserCheck, 
  Plus, 
  X,
  ExternalLink,
  Settings,
  Upload,
  Image as ImageIcon,
  Building2,
  Check,
  Trash2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  LegalisirRecord, 
  getStoredLegalisir, 
  saveLegalisirRecord, 
  getStoredMasterSiswa, 
  getStoredArsip,
  getStoredLegalisirConfig,
  saveStoredLegalisirConfig,
  LegalisirConfig,
  DEFAULT_LEGALISIR_CONFIG
} from '../data/mockDatabase';

export default function LegalisirView() {
  const [records, setRecords] = useState<LegalisirRecord[]>(() => getStoredLegalisir());
  const masterSiswa = useMemo(() => getStoredMasterSiswa(), []);
  const arsipList = useMemo(() => getStoredArsip(), []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecordForPrint, setSelectedRecordForPrint] = useState<LegalisirRecord | null>(null);

  // Legalisir & Kop Surat Config State
  const [legalisirConfig, setLegalisirConfig] = useState<LegalisirConfig>(() => getStoredLegalisirConfig());
  const [showKopConfigModal, setShowKopConfigModal] = useState(false);
  const [kopTab, setKopTab] = useState<'image' | 'text'>('text');
  const [tempConfig, setTempConfig] = useState<LegalisirConfig>(() => getStoredLegalisirConfig());

  // Modal Terbitkan Legalisir Baru
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSiswaNama, setSelectedSiswaNama] = useState('');
  const [jenisDokumen, setJenisDokumen] = useState('Ijazah SMP');
  const [nomorSeri, setNomorSeri] = useState('');

  // Verifier State
  const [verifyInput, setVerifyInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<LegalisirRecord | null | 'NOT_FOUND'>(null);

  // File input refs for kop upload
  const kopBannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stempelInputRef = useRef<HTMLInputElement>(null);

  // Open Kop Config Modal
  const handleOpenKopModal = () => {
    const current = getStoredLegalisirConfig();
    setLegalisirConfig(current);
    setTempConfig(JSON.parse(JSON.stringify(current)));
    setKopTab(current.kopSurat?.mode || 'text');
    setShowKopConfigModal(true);
  };

  // Save Kop Config
  const handleSaveKopConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: LegalisirConfig = {
      ...tempConfig,
      kopSurat: {
        ...tempConfig.kopSurat,
        mode: kopTab
      }
    };
    setLegalisirConfig(updated);
    saveStoredLegalisirConfig(updated);
    setShowKopConfigModal(false);
    window.dispatchEvent(new CustomEvent('earsip:notify', { 
      detail: { message: '✓ Pengaturan Kop Surat & Pengesahan Legalisir berhasil disimpan' } 
    }));
  };

  // Handle Kop Image Upload
  const handleKopBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setTempConfig(prev => ({
        ...prev,
        kopSurat: {
          ...prev.kopSurat,
          kopImageUrl: base64,
          mode: 'image'
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setTempConfig(prev => ({
        ...prev,
        kopSurat: {
          ...prev.kopSurat,
          logoUrl: base64
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Stempel Upload
  const handleStempelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setTempConfig(prev => ({
        ...prev,
        kopSurat: {
          ...prev.kopSurat,
          stempelImageUrl: base64
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  // Auto-fill when selecting student in modal
  const handleSelectSiswa = (nama: string) => {
    setSelectedSiswaNama(nama);
    const found = masterSiswa.find(s => s.nama === nama);
    if (found) {
      setNomorSeri(`DN-05/DIK/${found.tahun}/00${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Submit Legalisir Baru
  const handleCreateLegalisir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswaNama) return;

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1400));

    const s = masterSiswa.find(m => m.nama === selectedSiswaNama);
    const nisn = s ? s.nisn : '-';
    const tahun = s ? s.tahun : new Date().getFullYear().toString();
    const cfg = getStoredLegalisirConfig();
    const regNum = cfg.nomorFormat
      .replace('{YYYY}', new Date().getFullYear().toString())
      .replace('{NO}', `00${records.length + 1}`);
    const token = `VERIF-AH-${tahun}-${Math.floor(100 + Math.random() * 900)}-${selectedSiswaNama.replace(/\s+/g, '').toUpperCase().slice(0, 8)}`;

    const newRecord: LegalisirRecord = {
      id: `LEG-${Date.now().toString().slice(-4)}`,
      nomorRegistrasi: regNum,
      tanggalPengesahan: new Date().toLocaleDateString('id-ID'),
      namaAlumni: selectedSiswaNama,
      nisn: nisn,
      tahunLulus: tahun,
      jenisDokumen: jenisDokumen,
      nomorSeriIjazah: nomorSeri || `DN-05/DIK/${tahun}/009182`,
      statusKeaslian: 'ASLI_TERVERIFIKASI',
      pejabatPengesah: cfg.pejabatPenandatangan || 'Ahmad Zaenuri, S.Pd., M.Pd. (Kepala Sekolah)',
      jabatanPengesah: cfg.pejabatPenandatangan.includes('(') 
        ? cfg.pejabatPenandatangan.slice(cfg.pejabatPenandatangan.indexOf('(') + 1).replace(')', '')
        : 'Kepala Sekolah SMP Al-Hikam',
      qrCodeToken: token
    };

    const updated = saveLegalisirRecord(newRecord);
    setRecords(updated);
    setIsSubmitting(false);
    setShowCreateModal(false);
    setSelectedSiswaNama('');
    setNomorSeri('');
    setSelectedRecordForPrint(newRecord);

    window.dispatchEvent(new CustomEvent('earsip:notify', {
      detail: { message: `✓ Surat Legalisir untuk ${newRecord.namaAlumni} berhasil diterbitkan (${newRecord.nomorRegistrasi})` }
    }));
  };

  // Check verification
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) return;

    setIsVerifying(true);
    setVerificationResult(null);
    await new Promise(r => setTimeout(r, 1200));

    const q = verifyInput.toLowerCase().trim();
    const found = records.find(r => 
      r.nomorRegistrasi.toLowerCase().includes(q) ||
      r.nisn.toLowerCase().includes(q) ||
      r.qrCodeToken.toLowerCase().includes(q) ||
      r.nomorSeriIjazah.toLowerCase().includes(q) ||
      r.namaAlumni.toLowerCase().includes(q)
    );
    setIsVerifying(false);
    setVerificationResult(found || 'NOT_FOUND');
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const q = searchTerm.toLowerCase().trim();
      return !q || r.namaAlumni.toLowerCase().includes(q) || r.nisn.toLowerCase().includes(q) || r.nomorRegistrasi.toLowerCase().includes(q);
    });
  }, [records, searchTerm]);

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] border border-slate-200/90 animate-fadeIn font-['Poppins'] max-w-full">
      
      {/* Mobile-Minimalist Header */}
      <div className="block sm:hidden pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center flex-shrink-0">
              <Stamp className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-slate-900 leading-tight truncate">Verifikasi & Legalisir</h2>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleOpenKopModal}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
              title="Atur Kop Surat & Pejabat"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Kop</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Terbitkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Header Banner */}
      <div className="hidden sm:flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0">
            <Stamp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">Verifikasi & Legalisir Digital</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                Layanan Resmi Alumni
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pengesahan keabsahan ijazah, stempel barcode QR, verifikasi keaslian dokumen, dan cetak lembar legalisir dengan kop surat resmi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenKopModal}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-xs sm:text-sm font-bold flex items-center gap-2 border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Atur Format Kop Surat, Logo Sekolah, dan Pejabat Penandatangan"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>⚙️ Atur Kop Surat & Pejabat</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan Legalisir Baru</span>
          </button>
        </div>
      </div>

      {/* Quick Validation Check Card - Compact on Mobile */}
      <div className="mb-4 sm:mb-8 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="hidden sm:flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Pemeriksaan Validitas Dokumen Arsip</span>
          </div>
          
          <h3 className="text-xs sm:text-lg font-bold text-white mb-1.5 sm:mb-2 leading-tight flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 sm:hidden flex-shrink-0" />
            <span>Cek Keaslian Berkas & QR Token</span>
          </h3>

          <p className="hidden sm:block text-xs text-slate-300 mb-4 leading-relaxed">
            Masukkan Nomor Registrasi Legalisir, NISN, atau Kode Token QR untuk mengonfirmasi keaslian dokumen di pangkalan data resmi {legalisirConfig.kopSurat.namaSekolah || 'SMP Al-Hikam Jombang'}.
          </p>

          <form onSubmit={handleVerify} className="flex flex-row gap-2 mt-2 sm:mt-0">
            <input
              type="text"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder="Nomor Legalisir / NISN / Token..."
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-white/10 border border-white/20 rounded-xl sm:rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:bg-white/20 focus:border-cyan-400 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={isVerifying}
              className="px-4 py-2 sm:px-6 sm:py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all shadow-md shadow-cyan-500/30 flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0 disabled:opacity-60"
            >
              {isVerifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span className="hidden sm:inline">Memeriksa Keaslian...</span>
                  <span className="sm:hidden">Cek...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Verifikasi</span>
                </>
              )}
            </button>
          </form>

          {/* Verification Result Card */}
          {verificationResult && verificationResult !== 'NOT_FOUND' && (
            <div className="mt-4 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 animate-fadeIn flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-emerald-300 text-sm block">DOKUMEN ASLI & TERDAFTAR SECARA RESMI</span>
                <p className="mt-1 text-slate-200">
                  Dokumen <strong>{verificationResult.jenisDokumen}</strong> atas nama <strong>{verificationResult.namaAlumni}</strong> (NISN: {verificationResult.nisn}) dinyatakan sah dan telah dilegalisir resmi oleh Kepala Sekolah ({verificationResult.pejabatPengesah}) dengan No. Reg: <strong>{verificationResult.nomorRegistrasi}</strong>.
                </p>
                <button
                  onClick={() => setSelectedRecordForPrint(verificationResult)}
                  className="mt-2.5 text-[11px] font-bold text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Lihat & Cetak Lembar Pengesahan Resmi</span>
                </button>
              </div>
            </div>
          )}

          {verificationResult === 'NOT_FOUND' && (
            <div className="mt-4 p-4 rounded-2xl bg-red-500/20 border border-red-400/40 text-red-200 animate-fadeIn flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-red-300 block">DOKUMEN TIDAK DITEMUKAN</span>
                <p className="mt-0.5 text-slate-300">
                  Nomor registrasi atau identitas yang dimasukkan tidak cocok dengan basis data legalisir SMP Al-Hikam. Mohon periksa kembali nomor yang Anda ketik.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Riwayat Legalisir Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Riwayat Berkas Yang Telah Dilegalisir</h3>
            <p className="text-xs text-slate-500">Daftar ijazah dan SKL yang telah dibubuhi stempel & QR pengesahan</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama alumni atau No. Reg..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/80">
                <th className="py-3 px-4 rounded-l-2xl">Nomor Registrasi</th>
                <th className="py-3 px-3">Nama Alumni</th>
                <th className="py-3 px-3">NISN</th>
                <th className="py-3 px-3">Dokumen</th>
                <th className="py-3 px-3">No. Seri Ijazah</th>
                <th className="py-3 px-3">Tgl Pengesahan</th>
                <th className="py-3 px-4 text-right rounded-r-2xl">Cetak Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                    {item.nomorRegistrasi}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900">
                    {item.namaAlumni}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-slate-600">{item.nisn}</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {item.jenisDokumen}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs text-slate-700">{item.nomorSeriIjazah}</td>
                  <td className="py-3.5 px-3 text-slate-600">{item.tanggalPengesahan}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedRecordForPrint(item)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Legalisir</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pengaturan Kop Surat & Pengesahan */}
      {showKopConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl animate-scaleUp border border-slate-100 my-4 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Pengaturan Kop Surat & Lembar Legalisir</h3>
                  <p className="text-xs text-slate-500">Sesuaikan kop surat resmi, logo, dan tanda tangan digital</p>
                </div>
              </div>
              <button 
                onClick={() => setShowKopConfigModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scroll Body */}
            <form onSubmit={handleSaveKopConfig} className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Kop Mode Selector Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Pilih Format Kop Surat Yang Digunakan:
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setKopTab('text')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      kopTab === 'text' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>📑 Format Teks & Logo Resmi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKopTab('image')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      kopTab === 'image' 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>🖼️ Unggah Gambar Kop Utuh</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: Unggah Gambar Kop Surat Utuh */}
              {kopTab === 'image' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Unggah Banner / Gambar Kop Surat Lengkap</span>
                    <span className="text-[10px] text-slate-500">Format: JPG, PNG (Maks 3MB)</span>
                  </div>

                  {tempConfig.kopSurat.kopImageUrl ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-white border border-slate-300 rounded-xl">
                        <img 
                          src={tempConfig.kopSurat.kopImageUrl} 
                          alt="Pratinjau Kop Surat" 
                          className="max-h-24 w-auto mx-auto object-contain"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => kopBannerInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Ganti Gambar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTempConfig(prev => ({
                            ...prev,
                            kopSurat: { ...prev.kopSurat, kopImageUrl: '', mode: 'text' }
                          }))}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => kopBannerInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-white hover:bg-blue-50/40 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">Klik untuk memilih file gambar Kop Surat</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Disarankan gambar beresolusi tajam (misal 1200x250 px)</p>
                    </div>
                  )}

                  <input 
                    ref={kopBannerInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleKopBannerUpload} 
                    className="hidden" 
                  />
                </div>
              )}

              {/* Mode 2: Format Teks & Logo Resmi */}
              {kopTab === 'text' && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-300 p-1 flex items-center justify-center flex-shrink-0">
                      <img 
                        src={tempConfig.kopSurat.logoUrl || 'https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png'} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-slate-800 block">Logo Sekolah / Lembaga</span>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="mt-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Unggah Logo Baru (PNG)</span>
                      </button>
                      <input 
                        ref={logoInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Yayasan / Instansi Induk</label>
                    <input
                      type="text"
                      value={tempConfig.kopSurat.namaYayasan}
                      onChange={(e) => setTempConfig(prev => ({
                        ...prev,
                        kopSurat: { ...prev.kopSurat, namaYayasan: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                      placeholder="YAYASAN PONDOK PESANTREN AL-HIKAM"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Satuan Pendidikan / Sekolah</label>
                    <input
                      type="text"
                      value={tempConfig.kopSurat.namaSekolah}
                      onChange={(e) => setTempConfig(prev => ({
                        ...prev,
                        kopSurat: { ...prev.kopSurat, namaSekolah: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      placeholder="SMP AL-HIKAM JOMBANG"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                      <input
                        type="text"
                        value={tempConfig.kopSurat.alamat}
                        onChange={(e) => setTempConfig(prev => ({
                          ...prev,
                          kopSurat: { ...prev.kopSurat, alamat: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                        placeholder="Jl. Pesantren No. 12 Diwek, Kab. Jombang..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Kontak & NPSN</label>
                      <input
                        type="text"
                        value={tempConfig.kopSurat.kontak}
                        onChange={(e) => setTempConfig(prev => ({
                          ...prev,
                          kopSurat: { ...prev.kopSurat, kontak: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                        placeholder="Telp: (0321) 861234 • NPSN: 20503412"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pejabat Penandatangan & Stempel */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Pengaturan Pejabat Penandatangan & Stempel</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Kepala Sekolah / Pejabat</label>
                    <input
                      type="text"
                      value={tempConfig.pejabatPenandatangan}
                      onChange={(e) => setTempConfig(prev => ({ ...prev, pejabatPenandatangan: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      placeholder="Drs. H. Solikhin, M.Pd"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">NIP / NUPTK</label>
                    <input
                      type="text"
                      value={tempConfig.nipPejabat}
                      onChange={(e) => setTempConfig(prev => ({ ...prev, nipPejabat: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                      placeholder="19780512 200501 1 008"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Format Nomor Registrasi Legalisir</label>
                  <input
                    type="text"
                    value={tempConfig.nomorFormat}
                    onChange={(e) => setTempConfig(prev => ({ ...prev, nomorFormat: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                    placeholder="ALH/LEG/{YYYY}/{NO}"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Stempel / Tanda Tangan Sekolah (Opsional)</span>
                    <span className="text-[10px] text-slate-500">Jika dikosongkan, menggunakan stempel digital resmi otomatis</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => stempelInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{tempConfig.kopSurat.stempelImageUrl ? 'Ganti Stempel' : 'Unggah Stempel'}</span>
                  </button>
                  <input 
                    ref={stempelInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleStempelUpload} 
                    className="hidden" 
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Pratinjau Kop Surat Pada Dokumen:
                </span>
                
                {kopTab === 'image' && tempConfig.kopSurat.kopImageUrl ? (
                  <div className="text-center pb-2 border-b-2 border-slate-800">
                    <img src={tempConfig.kopSurat.kopImageUrl} alt="Kop" className="max-h-20 w-auto mx-auto object-contain" />
                  </div>
                ) : (
                  <div className="text-center pb-2 border-b-2 border-slate-800">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <img 
                        src={tempConfig.kopSurat.logoUrl || 'https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png'} 
                        alt="Logo" 
                        className="w-8 h-8 object-contain"
                      />
                      <div>
                        <h5 className="text-[9px] font-semibold uppercase text-slate-600 leading-tight">
                          {tempConfig.kopSurat.namaYayasan || 'YAYASAN PONDOK PESANTREN AL-HIKAM'}
                        </h5>
                        <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                          {tempConfig.kopSurat.namaSekolah || 'SMP AL-HIKAM JOMBANG'}
                        </h4>
                      </div>
                    </div>
                    <p className="text-[8px] text-slate-500 leading-tight">
                      {tempConfig.kopSurat.alamat} • {tempConfig.kopSurat.kontak}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setTempConfig(DEFAULT_LEGALISIR_CONFIG);
                    setKopTab('text');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Reset Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKopConfigModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Simpan Pengaturan Kop
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Terbitkan Legalisir Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl animate-scaleUp border border-slate-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Stamp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Terbitkan Legalisir Resmi</h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLegalisir} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Alumni / Siswa <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSiswaNama}
                  onChange={(e) => handleSelectSiswa(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="" disabled>-- Pilih Nama Alumni --</option>
                  {masterSiswa.map(s => (
                    <option key={s.id} value={s.nama}>{s.nama} (Angkatan {s.tahun}) - NISN: {s.nisn}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Dokumen Yang Dilegalisir <span className="text-red-500">*</span>
                </label>
                <select
                  value={jenisDokumen}
                  onChange={(e) => setJenisDokumen(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="Ijazah SMP">Ijazah SMP</option>
                  <option value="Surat Keterangan Lulus (SKL)">Surat Keterangan Lulus (SKL)</option>
                  <option value="Transkrip Nilai / Rapor">Transkrip Nilai / Rapor</option>
                  <option value="Sertifikat / Piagam">Sertifikat / Piagam Kelulusan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Seri Ijazah / Dokumen Asli
                </label>
                <input
                  type="text"
                  value={nomorSeri}
                  onChange={(e) => setNomorSeri(e.target.value)}
                  placeholder="Contoh: DN-05/DIK/2024/004912"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1">
                <span className="font-bold block">Pengesahan Otomatis:</span>
                <p className="text-[11px] text-blue-700">
                  Kepala Sekolah: <strong>{legalisirConfig.pejabatPenandatangan}</strong> • QR Code dan Barcode Digital akan otomatis digenerate secara unik.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Menerbitkan...' : 'Terbitkan & Buat Stempel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Certificate / Print Modal Sheet */}
      {selectedRecordForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-xl w-full shadow-2xl animate-scaleUp border border-slate-200 my-6">
            
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pratinjau Lembar Legalisir Resmi
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  onClick={() => setSelectedRecordForPrint(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Print Document Layout */}
            <div className="border-4 border-double border-slate-800 p-6 sm:p-8 rounded-2xl relative bg-white print:border-black">
              
              {/* Dynamic Kop Surat */}
              {legalisirConfig.kopSurat.mode === 'image' && legalisirConfig.kopSurat.kopImageUrl ? (
                <div className="text-center pb-4 mb-5 border-b-2 border-slate-800">
                  <img 
                    src={legalisirConfig.kopSurat.kopImageUrl} 
                    alt="Kop Surat Resmi" 
                    className="max-h-28 w-auto mx-auto object-contain"
                  />
                </div>
              ) : (
                <div className="text-center pb-4 mb-5 border-b-2 border-slate-800">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <img 
                      src={legalisirConfig.kopSurat.logoUrl || 'https://i.ibb.co.com/Jw175yjb/file-00000000c4287208bc89c0bb125befc2-1.png'} 
                      alt="Logo" 
                      className="w-12 h-12 object-contain"
                    />
                    <div>
                      <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-600">
                        {legalisirConfig.kopSurat.namaYayasan || 'YAYASAN PONDOK PESANTREN AL-HIKAM'}
                      </h4>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                        {legalisirConfig.kopSurat.namaSekolah || 'SMP AL-HIKAM JOMBANG'}
                      </h3>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {legalisirConfig.kopSurat.alamat} • {legalisirConfig.kopSurat.kontak}
                  </p>
                </div>
              )}

              {/* Title */}
              <div className="text-center mb-6">
                <h4 className="text-sm font-bold tracking-wider uppercase underline text-slate-900">
                  SURAT KETERANGAN PENGESAHAN / LEGALISIR RESMI
                </h4>
                <p className="text-xs font-mono font-semibold text-slate-600 mt-1">
                  Nomor Registrasi: {selectedRecordForPrint.nomorRegistrasi}
                </p>
              </div>

              {/* Content Statement */}
              <p className="text-xs text-slate-700 leading-relaxed mb-4">
                Kepala {legalisirConfig.kopSurat.namaSekolah || 'SMP Al-Hikam Jombang'} dengan ini menerangkan dan menyatakan secara sah bahwa:
              </p>

              <div className="space-y-2 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Nama Siswa / Alumni</span>
                  <span className="col-span-2 font-bold text-slate-900">: {selectedRecordForPrint.namaAlumni}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">NISN</span>
                  <span className="col-span-2 font-mono font-semibold text-slate-800">: {selectedRecordForPrint.nisn}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Tahun Kelulusan</span>
                  <span className="col-span-2 font-semibold text-slate-800">: {selectedRecordForPrint.tahunLulus}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Jenis Dokumen</span>
                  <span className="col-span-2 font-semibold text-slate-800">: {selectedRecordForPrint.jenisDokumen}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Nomor Seri Ijazah</span>
                  <span className="col-span-2 font-mono font-semibold text-slate-800">: {selectedRecordForPrint.nomorSeriIjazah}</span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed mb-8">
                Telah dicocokkan dengan dokumen aslinya yang tersimpan pada Sistem Database Elektronik (E-Arsip) {legalisirConfig.kopSurat.namaSekolah || 'SMP Al-Hikam Jombang'} dan dinyatakan <strong>BENAR & SAH</strong> sesuai aslinya.
              </p>

              {/* Official Seal and Signature */}
              <div className="flex items-end justify-between pt-4">
                {/* QR Code & Security Stamp */}
                <div className="border border-slate-300 p-2.5 rounded-xl text-center bg-slate-50 max-w-[170px]">
                  <div className="w-20 h-20 bg-slate-900 text-white rounded-lg flex items-center justify-center mx-auto mb-1.5 p-1">
                    <QrCode className="w-full h-full text-white" />
                  </div>
                  <span className="text-[8px] font-mono text-slate-500 block leading-tight truncate">
                    {selectedRecordForPrint.qrCodeToken}
                  </span>
                  <span className="text-[8px] font-bold text-emerald-700 block mt-0.5">
                    ✓ TERVERIFIKASI DIGITAL
                  </span>
                </div>

                {/* Stempel & TTD Pejabat */}
                <div className="text-right">
                  <p className="text-xs text-slate-600 mb-1">
                    Jombang, {selectedRecordForPrint.tanggalPengesahan}
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    Kepala {legalisirConfig.kopSurat.namaSekolah || 'SMP Al-Hikam'}
                  </p>

                  <div className="py-4 relative flex items-center justify-end">
                    {legalisirConfig.kopSurat.stempelImageUrl ? (
                      <img 
                        src={legalisirConfig.kopSurat.stempelImageUrl} 
                        alt="Stempel Resmi" 
                        className="max-h-16 w-auto object-contain absolute right-4 pointer-events-none"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-purple-700/80 text-purple-800 text-[8px] font-extrabold flex flex-col items-center justify-center p-1 transform -rotate-12 absolute right-6 pointer-events-none opacity-85">
                        <span className="leading-none text-[7.5px] uppercase">{legalisirConfig.kopSurat.namaSekolah || 'SMP AL-HIKAM'}</span>
                        <span className="my-0.5">★ ★ ★</span>
                        <span className="leading-none text-[7px]">TERLEGALISIR</span>
                      </div>
                    )}
                    <div className="h-12 w-32 border-b border-dashed border-slate-400" />
                  </div>

                  <p className="text-xs font-bold text-slate-900 underline">
                    {legalisirConfig.pejabatPenandatangan || selectedRecordForPrint.pejabatPengesah}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    NIP/NUPTK. {legalisirConfig.nipPejabat || '197405121999031001'}
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
