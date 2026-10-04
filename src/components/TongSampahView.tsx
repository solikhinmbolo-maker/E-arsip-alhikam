import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  Trash, 
  Search, 
  AlertTriangle, 
  FileText, 
  User, 
  Calendar,
  CheckCircle2,
  X,
  RefreshCw
} from 'lucide-react';
import { 
  ArsipItem, 
  getTrashArsip, 
  restoreFromTrashArsipItem, 
  deletePermanentlyArsipItem, 
  emptyTrashArsip 
} from '../data/mockDatabase';

export default function TongSampahView() {
  const [dataVersion, setDataVersion] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [deleteTargetItem, setDeleteTargetItem] = useState<ArsipItem | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const handleUpdate = () => setDataVersion(v => v + 1);
    window.addEventListener('earsip:cloud-synced', handleUpdate);
    return () => window.removeEventListener('earsip:cloud-synced', handleUpdate);
  }, []);

  const trashData = useMemo(() => {
    return getTrashArsip();
  }, [dataVersion]);

  const filteredTrash = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return trashData;
    return trashData.filter(item => 
      `${item.subjek} ${item.identitas} ${item.kategori} ${item.namaFileAsli}`.toLowerCase().includes(q)
    );
  }, [trashData, searchTerm]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleRestore = async (item: ArsipItem) => {
    setIsProcessing(true);
    setProcessingMsg(`Memulihkan berkas...`);
    await new Promise(r => setTimeout(r, 1800));
    await restoreFromTrashArsipItem(item.id);
    setIsProcessing(false);
    showToast(`✓ Berkas "${item.subjek}" berhasil dipulihkan ke arsip aktif.`);
  };

  const handleConfirmDeletePermanent = async () => {
    if (!deleteTargetItem) return;
    setIsProcessing(true);
    setProcessingMsg(`Menghapus permanen...`);
    await new Promise(r => setTimeout(r, 1800));
    await deletePermanentlyArsipItem(deleteTargetItem.id);
    setIsProcessing(false);
    showToast(`🗑️ Berkas "${deleteTargetItem.subjek}" telah dihapus secara permanen dari Database & Cloud.`);
    setDeleteTargetItem(null);
  };

  const handleConfirmEmptyTrash = async () => {
    setIsProcessing(true);
    setProcessingMsg('Membersihkan sampah...');
    await new Promise(r => setTimeout(r, 2000));
    await emptyTrashArsip();
    setIsProcessing(false);
    showToast('🗑️ Seluruh berkas di folder Sampah telah dibersihkan secara permanen.');
    setShowEmptyConfirm(false);
  };

  return (
    <div className="bg-white rounded-3xl p-3 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] border border-slate-200/80 animate-fadeIn font-['Poppins'] max-w-full overflow-x-hidden">
      
      {/* Processing Loader Banner */}
      {isProcessing && (
        <div className="mb-4 p-3.5 bg-blue-600 text-white rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-md animate-fadeIn">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
          <span>{processingMsg}</span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="mb-4 p-3.5 bg-slate-900 text-white rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg animate-fadeIn">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER SAMPAH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b-2 border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl shadow-inner flex-shrink-0">
            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Sampah & Pemulihan Berkas</span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-mono font-bold">
                {trashData.length} Berkas
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Berkas yang dihapus disimpan sementara di sini sebelum dihapus permanen dari Database & Supabase Storage.
            </p>
          </div>
        </div>

        {trashData.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEmptyConfirm(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Trash className="w-4 h-4" />
            <span>Kosongkan Sampah</span>
          </button>
        )}
      </div>

      {/* SEARCH BAR */}
      <div className="mb-5 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari berkas di folder sampah berdasarkan nama, identitas, atau judul..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all shadow-sm"
        />
      </div>

      {/* TABLE DATA SAMPAH */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
              <th className="py-3.5 px-4">Tgl Dihapus</th>
              <th className="py-3.5 px-4">Subjek / Nama Dokumen</th>
              <th className="py-3.5 px-4">Identitas & Kategori</th>
              <th className="py-3.5 px-4 text-center">Aksi Pemulihan & Hapus Permanen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTrash.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-14 text-center text-slate-400">
                  <Trash2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-700">Folder Sampah Kosong</p>
                  <p className="text-xs text-slate-400 mt-1">Tidak ada berkas terhapus di folder sampah saat ini.</p>
                </td>
              </tr>
            ) : (
              filteredTrash.map((item) => (
                <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                    <span className="font-medium text-slate-800 block">
                      {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('id-ID') : item.tanggal}
                    </span>
                    <span className="text-[10px] text-red-500 font-semibold block mt-0.5">
                      Status: Di Sampah
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <strong className="text-slate-900 block font-semibold">{item.subjek}</strong>
                    <span className="text-xs text-slate-500 font-mono">{item.namaFileAsli}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs border border-slate-200">
                        {item.identitas || '-'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        {item.kategori}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestore(item)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Pulihkan Berkas Kembali ke Arsip Aktif"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Pulihkan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTargetItem(item)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Hapus Permanen dari Database & Cloud"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        <span>Hapus Permanen</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL KONFIRMASI HAPUS PERMANEN SATU ITEM */}
      {deleteTargetItem && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0F172A] border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-scaleUp text-white">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold mb-1">Hapus Permanen?</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Berkas <strong className="text-red-400">"{deleteTargetItem.subjek}"</strong> akan dihapus selamanya dari Supabase Cloud Database & Storage.
            </p>

            {isProcessing && (
              <div className="mb-5 space-y-2 animate-fadeIn">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full animate-pulse w-full" />
                </div>
                <p className="text-[11px] text-red-400 font-semibold flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Sedang menghapus permanen dari server...</span>
                </p>
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setDeleteTargetItem(null)}
                className={`flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors ${
                  isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmDeletePermanent}
                className={`flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  isProcessing ? 'opacity-90 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash className="w-3.5 h-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI KOSONGKAN SAMPAH */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0F172A] border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-scaleUp text-white">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <Trash className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold mb-1">Kosongkan Sampah?</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Seluruh <strong className="text-red-400">{trashData.length} berkas</strong> di folder Sampah akan dihapus secara permanen dari Database & Cloud Storage.
            </p>

            {isProcessing && (
              <div className="mb-5 space-y-2 animate-fadeIn">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full animate-pulse w-full" />
                </div>
                <p className="text-[11px] text-red-400 font-semibold flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Membersihkan seluruh folder sampah...</span>
                </p>
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowEmptyConfirm(false)}
                className={`flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors ${
                  isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmEmptyTrash}
                className={`flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  isProcessing ? 'opacity-90 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Membersihkan...</span>
                  </>
                ) : (
                  <>
                    <Trash className="w-3.5 h-3.5" />
                    <span>Kosongkan</span>
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
