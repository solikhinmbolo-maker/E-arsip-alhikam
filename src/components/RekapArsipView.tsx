import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckSquare, 
  Search, 
  Check, 
  X, 
  GraduationCap, 
  Briefcase, 
  Eye,
  FileCheck,
  ChevronRight,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';
import { 
  MasterSiswaItem, 
  MasterGuruItem, 
  ArsipItem, 
  KATEGORI_SISWA, 
  KATEGORI_GURU,
  getSanitizedMasterData, 
  getStoredArsip 
} from '../data/mockDatabase';
import { fetchSanitizedMasterDataFromSupabase } from '../supabase';

interface RekapArsipViewProps {
  onPreview: (item: ArsipItem) => void;
}

export default function RekapArsipView({ onPreview }: RekapArsipViewProps) {
  const [targetKelompok, setTargetKelompok] = useState<'Siswa' | 'Guru'>('Siswa');
  const [searchName, setSearchName] = useState('');
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');

  const [masterSiswa, setMasterSiswa] = useState<MasterSiswaItem[]>(() => getSanitizedMasterData().siswa);
  const [masterGuru, setMasterGuru] = useState<MasterGuruItem[]>(() => getSanitizedMasterData().guru);
  const [allArsip, setAllArsip] = useState<ArsipItem[]>(() => getStoredArsip());

  const reloadData = async () => {
    const { siswa: localSiswa, guru: localGuru } = getSanitizedMasterData();
    const localArsip = getStoredArsip();

    setAllArsip(localArsip);

    const supaData = await fetchSanitizedMasterDataFromSupabase().catch(() => null);

    if (supaData) {
      setMasterSiswa(supaData.siswa);
      setMasterGuru(supaData.guru);
    } else {
      setMasterSiswa(localSiswa);
      setMasterGuru(localGuru);
    }
  };

  useEffect(() => {
    reloadData();
    const handleCloudUpdate = () => reloadData();
    window.addEventListener('earsip:cloud-synced', handleCloudUpdate);
    return () => window.removeEventListener('earsip:cloud-synced', handleCloudUpdate);
  }, []);

  // Matriks Siswa (Langsung dari Master Data Siswa)
  const siswaMatrix = useMemo(() => {
    return masterSiswa.map((siswa, idx) => {
      const userArchives = allArsip.filter(
        a => a.kategoriUtama === 'Arsip Siswa' && 
        (a.subjek.toLowerCase().includes(siswa.nama.toLowerCase()) || (siswa.nisn && siswa.nisn !== '-' && a.identitas === siswa.nisn))
      );

      const statusMap: { [kat: string]: boolean } = {};
      let completedCount = 0;

      KATEGORI_SISWA.forEach(kat => {
        const found = userArchives.some(a => {
          const aKat = a.kategori.toLowerCase();
          const target = kat.toLowerCase();
          return aKat.includes(target) || target.includes(aKat);
        });
        statusMap[kat] = found;
        if (found) completedCount++;
      });

      return {
        no: idx + 1,
        nama: siswa.nama,
        tahun: siswa.tahun,
        nisn: siswa.nisn,
        jenisKelamin: siswa.jenisKelamin,
        statusMap,
        completedCount,
        total: KATEGORI_SISWA.length,
        userArchives
      };
    });
  }, [masterSiswa, allArsip]);

  // Matriks Guru (Langsung dari Master Data Guru)
  const guruMatrix = useMemo(() => {
    return masterGuru.map((guru, idx) => {
      const userArchives = allArsip.filter(
        a => a.kategoriUtama === 'Arsip Guru' && 
        (a.subjek.toLowerCase().includes(guru.nama.toLowerCase()) || (guru.nuptk && guru.nuptk !== '-' && a.identitas === guru.nuptk))
      );

      const statusMap: { [kat: string]: boolean } = {};
      let completedCount = 0;

      KATEGORI_GURU.forEach(kat => {
        const found = userArchives.some(a => {
          const aKat = a.kategori.toLowerCase();
          const target = kat.toLowerCase();
          return aKat.includes(target) || target.includes(aKat);
        });
        statusMap[kat] = found;
        if (found) completedCount++;
      });

      return {
        no: idx + 1,
        nama: guru.nama,
        nuptk: guru.nuptk,
        jabatan: guru.jabatan,
        statusMap,
        completedCount,
        total: KATEGORI_GURU.length,
        userArchives
      };
    });
  }, [masterGuru, allArsip]);

  // Filtered rows by search
  const filteredSiswa = useMemo(() => {
    const q = searchName.toLowerCase().trim();
    if (!q) return siswaMatrix;
    return siswaMatrix.filter(s => s.nama.toLowerCase().includes(q) || s.nisn.includes(q));
  }, [siswaMatrix, searchName]);

  const filteredGuru = useMemo(() => {
    const q = searchName.toLowerCase().trim();
    if (!q) return guruMatrix;
    return guruMatrix.filter(g => g.nama.toLowerCase().includes(q) || g.nuptk.includes(q));
  }, [guruMatrix, searchName]);

  const currentCategories = targetKelompok === 'Siswa' ? KATEGORI_SISWA : KATEGORI_GURU;

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] border border-slate-200/80 animate-fadeIn font-['Poppins'] max-w-full overflow-x-hidden">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span>Matriks Rekap Kelengkapan Berkas</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Pantau status dokumen yang sudah diunggah atau belum lengkap
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <span>✅ Lengkap</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-xs font-semibold">
            <span>❌ Belum</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 mb-5">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Kelompok:</label>
          <div className="flex rounded-2xl bg-white border border-slate-300 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setTargetKelompok('Siswa')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                targetKelompok === 'Siswa' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Siswa ({masterSiswa.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetKelompok('Guru')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                targetKelompok === 'Guru' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Guru ({masterGuru.length})</span>
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700">
              Cari Nama {targetKelompok}:
            </label>
            {/* Toggle Card vs Table in Mobile */}
            <div className="flex sm:hidden items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-[10px]">
              <button
                type="button"
                onClick={() => setMobileViewMode('cards')}
                className={`px-2 py-0.5 rounded ${mobileViewMode === 'cards' ? 'bg-white font-bold text-blue-600 shadow-xs' : 'text-slate-600'}`}
              >
                Kartu
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('table')}
                className={`px-2 py-0.5 rounded ${mobileViewMode === 'table' ? 'bg-white font-bold text-blue-600 shadow-xs' : 'text-slate-600'}`}
              >
                Tabel
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder={`Ketik nama ${targetKelompok.toLowerCase()} untuk menyaring...`}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* MOBILE-FIRST COMPACT CARDS VIEW (UNTUK LAYAR HP) */}
      <div className={`sm:hidden space-y-3 ${mobileViewMode === 'cards' ? 'block' : 'hidden'}`}>
        {(targetKelompok === 'Siswa' ? filteredSiswa : filteredGuru).map((row: any) => {
          const percent = Math.round((row.completedCount / row.total) * 100);
          const isAll = row.completedCount === row.total;

          return (
            <div key={row.nisn || row.nuptk} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <strong className="text-xs font-bold text-slate-900 block leading-tight">{row.nama}</strong>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {targetKelompok === 'Siswa' ? `NISN: ${row.nisn} • ${row.jenisKelamin} (${row.tahun})` : `NUPTK: ${row.nuptk} • ${row.jabatan}`}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isAll ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {row.completedCount}/{row.total} ({percent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${isAll ? 'bg-emerald-500' : 'bg-blue-600'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Document check tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentCategories.map(kat => {
                  const hasDoc = row.statusMap[kat];
                  const matchedDoc = row.userArchives.find((a: any) => {
                    const aKat = a.kategori.toLowerCase();
                    const target = kat.toLowerCase();
                    return aKat.includes(target) || target.includes(aKat);
                  });

                  return (
                    <button
                      key={kat}
                      type="button"
                      disabled={!hasDoc}
                      onClick={() => matchedDoc && onPreview(matchedDoc)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-all ${
                        hasDoc 
                          ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 cursor-pointer active:scale-95' 
                          : 'bg-white text-slate-400 border border-slate-200 opacity-60'
                      }`}
                    >
                      <span>{hasDoc ? '✅' : '❌'}</span>
                      <span className="truncate max-w-[120px]">{kat}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP MATRIX TABLE (ATAU KETIKA USER MEMILIH MODE TABEL DI HP) */}
      <div className={`${mobileViewMode === 'cards' ? 'hidden sm:block' : 'block'} overflow-x-auto border border-slate-200 rounded-2xl shadow-sm`}>
        <table className="w-full text-left text-xs border-collapse min-w-[950px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <th className="py-3 px-3 w-10 text-center">NO</th>
              <th className="py-3 px-4 min-w-[180px]">NAMA {targetKelompok.toUpperCase()}</th>
              {targetKelompok === 'Siswa' && <th className="py-3 px-3 text-center">TH. LULUS</th>}
              <th className="py-3 px-3 text-center">STATUS</th>
              {currentCategories.map(kat => (
                <th key={kat} className="py-3 px-2 text-center font-bold tracking-tight text-[11px] max-w-[90px] whitespace-normal">
                  {kat.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(targetKelompok === 'Siswa' ? filteredSiswa : filteredGuru).map((row: any, idx) => {
              const percent = Math.round((row.completedCount / row.total) * 100);
              const isAllComplete = row.completedCount === row.total;

              return (
                <tr key={row.nisn || row.nuptk} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <strong className="text-slate-900 block font-semibold">{row.nama}</strong>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {targetKelompok === 'Siswa' ? `NISN: ${row.nisn} • ${row.jenisKelamin}` : `NUPTK: ${row.nuptk} • ${row.jabatan}`}
                    </span>
                  </td>
                  {targetKelompok === 'Siswa' && (
                    <td className="py-3 px-3 text-center text-slate-700 font-semibold">{row.tahun}</td>
                  )}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isAllComplete ? 'bg-emerald-100 text-emerald-800' :
                      row.completedCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {row.completedCount}/{row.total} ({percent}%)
                    </span>
                  </td>
                  {currentCategories.map(kat => {
                    const hasDoc = row.statusMap[kat];
                    const matchedDoc = row.userArchives.find((a: any) => {
                      const aKat = a.kategori.toLowerCase();
                      const target = kat.toLowerCase();
                      return aKat.includes(target) || target.includes(aKat);
                    });

                    return (
                      <td key={kat} className="py-3 px-2 text-center">
                        {hasDoc ? (
                          <button
                            type="button"
                            onClick={() => matchedDoc && onPreview(matchedDoc)}
                            title="Sudah Diunggah: Klik untuk Preview"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors font-bold cursor-pointer"
                          >
                            ✅
                          </button>
                        ) : (
                          <span 
                            title="Belum Diunggah" 
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-600 font-bold"
                          >
                            ❌
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
