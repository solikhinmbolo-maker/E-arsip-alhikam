import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Lightbulb, 
  FolderOpen, 
  GraduationCap, 
  Briefcase, 
  Boxes, 
  CloudUpload, 
  FolderCheck, 
  HardDrive, 
  FilePlus, 
  ArrowUpRight,
  Download,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart2,
  Sparkles,
  ChevronRight,
  Search,
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { Chart, registerables } from 'chart.js';
import { getStoredArsip, getStoredMasterSiswa, getStoredMasterGuru } from '../data/mockDatabase';
import { getSupabaseClient } from '../supabase';

Chart.register(...registerables);

interface DashboardViewProps {
  onNavigate: (view: 'upload' | 'unduh' | 'audit-log' | 'laporan', subcategory?: 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya') => void;
  dataVersion?: number;
}

function DashboardView({ onNavigate, dataVersion: dataVersionProp }: DashboardViewProps) {
  const desktopDonutRef = useRef<HTMLCanvasElement | null>(null);
  const desktopBarRef = useRef<HTMLCanvasElement | null>(null);
  const mobileDonutRef = useRef<HTMLCanvasElement | null>(null);
  const mobileBarRef = useRef<HTMLCanvasElement | null>(null);

  const desktopDonutChart = useRef<Chart | null>(null);
  const desktopBarChart = useRef<Chart | null>(null);
  const mobileDonutChart = useRef<Chart | null>(null);
  const mobileBarChart = useRef<Chart | null>(null);

  // Tab switch for mobile charts view
  const [mobileChartTab, setMobileChartTab] = useState<'kategori' | 'siswa'>('kategori');

  // Reactive state to update whenever cloud data is synced
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setDataVersion(v => v + 1);
    window.addEventListener('earsip:cloud-synced', handleUpdate);
    return () => window.removeEventListener('earsip:cloud-synced', handleUpdate);
  }, []);

  const effectiveVersion = (dataVersionProp ?? 0) + dataVersion;

  // Live data reference (silky-smooth reactive memo without unmounting)
  const allArsip = useMemo(() => getStoredArsip(), [effectiveVersion]);
  const allSiswa = useMemo(() => getStoredMasterSiswa(), [effectiveVersion]);
  const allGuru = useMemo(() => getStoredMasterGuru(), [effectiveVersion]);

  // Calculate Metrics
  const totalSiswa = allSiswa.length;
  const totalGuru = allGuru.length;
  const totalArsip = allArsip.length;
  const siswaArsip = allArsip.filter(a => a.kategoriUtama === 'Arsip Siswa').length;
  const guruArsip = allArsip.filter(a => a.kategoriUtama === 'Arsip Guru').length;
  const lainnyaArsip = allArsip.filter(a => a.kategoriUtama === 'Arsip Lainnya').length;

  const todayStr = new Date().toLocaleDateString('id-ID');
  const uploadHariIni = allArsip.filter(a => a.tanggal === todayStr).length;

  // Category distribution
  const kategoriCountMap: { [cat: string]: number } = {};
  allArsip.forEach(a => {
    kategoriCountMap[a.kategori] = (kategoriCountMap[a.kategori] || 0) + 1;
  });
  const totalKategori = Object.keys(kategoriCountMap).length;

  const sortedCategories = Object.entries(kategoriCountMap).sort((a, b) => b[1] - a[1]);
  const topKategoriEntry = sortedCategories[0] || ['Belum Ada', 0];
  const topKategoriPct = totalArsip > 0 ? Math.round((topKategoriEntry[1] / totalArsip) * 100) : 0;
  const latestItem = allArsip[0] ? `${allArsip[0].subjek} (${allArsip[0].kategori})` : '-';

  // Unique subjects count for completeness calculation
  const siswaWithArsipCount = useMemo(() => {
    return new Set(
      allArsip
        .filter(a => a.kategoriUtama === 'Arsip Siswa')
        .map(a => a.subjek.trim().toLowerCase())
    ).size;
  }, [allArsip]);

  const guruWithArsipCount = useMemo(() => {
    return new Set(
      allArsip
        .filter(a => a.kategoriUtama === 'Arsip Guru')
        .map(a => a.subjek.trim().toLowerCase())
    ).size;
  }, [allArsip]);

  const siswaCompletenessPct = totalSiswa > 0 ? Math.min(100, Math.round((siswaWithArsipCount / totalSiswa) * 100)) : 0;
  const guruCompletenessPct = totalGuru > 0 ? Math.min(100, Math.round((guruWithArsipCount / totalGuru) * 100)) : 0;

  const recentActivity = useMemo(() => {
    return allArsip.slice(0, 3);
  }, [allArsip]);

  // Real-time Supabase Storage Calculation (1.0 GB Free Tier limit)
  const TOTAL_STORAGE_MB = 1024; // 1 GB
  const [remoteStorageMB, setRemoteStorageMB] = useState<number | null>(null);

  // Compute used storage from local archives metadata
  const localCalculatedMB = useMemo(() => {
    let sumMB = 0;
    allArsip.forEach(item => {
      if (!item.ukuran) return;
      const str = item.ukuran.toLowerCase();
      const mbMatch = str.match(/([\d.]+)\s*mb/);
      if (mbMatch && mbMatch[1]) {
        sumMB += parseFloat(mbMatch[1]) || 0;
      } else {
        const kbMatch = str.match(/([\d.]+)\s*kb/);
        if (kbMatch && kbMatch[1]) {
          sumMB += (parseFloat(kbMatch[1]) || 0) / 1024;
        }
      }
    });
    return sumMB;
  }, [allArsip]);

  // Query actual files in Supabase Storage bucket 'arsip'
  useEffect(() => {
    let isMounted = true;
    const fetchRemoteSize = async () => {
      try {
        const client = getSupabaseClient();
        if (!client) return;
        const { data, error } = await client.storage.from('arsip').list('', { limit: 1000 });
        if (!error && Array.isArray(data) && data.length > 0) {
          let sumBytes = 0;
          data.forEach((f: any) => {
            if (f.metadata?.size) {
              sumBytes += Number(f.metadata.size);
            }
          });
          if (sumBytes > 0 && isMounted) {
            setRemoteStorageMB(sumBytes / (1024 * 1024));
          }
        }
      } catch {
        // Fallback to local metadata calculation
      }
    };
    fetchRemoteSize();
    return () => { isMounted = false; };
  }, [allArsip, dataVersion]);

  const activeUsedMB = remoteStorageMB !== null ? remoteStorageMB : localCalculatedMB;
  const usedStorageDisplay = activeUsedMB >= 1024 
    ? `${(activeUsedMB / 1024).toFixed(2)} GB`
    : `${activeUsedMB > 0 ? activeUsedMB.toFixed(1) : '0.0'} MB`;
  const totalStorageDisplay = '1.0 GB';
  const storagePercentage = Math.max(0.2, Math.min(100, (activeUsedMB / TOTAL_STORAGE_MB) * 100));

  // Siswa per angkatan
  const siswaPerTahun: { [th: string]: number } = {};
  allSiswa.forEach(s => {
    siswaPerTahun[s.tahun] = (siswaPerTahun[s.tahun] || 0) + 1;
  });
  const angkatanLabels = Object.keys(siswaPerTahun).sort();
  const angkatanData = angkatanLabels.map(th => siswaPerTahun[th]);

  // Donut chart colors
  const donutColors = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

  // Helper function to build Donut Chart with Super Slow-Motion & Smooth Easing
  const buildDonutChart = (canvas: HTMLCanvasElement, instanceRef: React.MutableRefObject<Chart | null>) => {
    const labels = sortedCategories.slice(0, 6).map(e => e[0]);
    const data = sortedCategories.slice(0, 6).map(e => e[1]);

    if (instanceRef.current) {
      instanceRef.current.destroy();
      instanceRef.current = null;
    }

    instanceRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['Belum Ada'],
        datasets: [{
          data: data.length > 0 ? data : [1],
          backgroundColor: donutColors.slice(0, labels.length || 1),
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverOffset: 10,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 2500, // Cinematic 2.5s slow-motion rotation & scale-in
          easing: 'easeOutQuart'
        },
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            padding: 10,
            cornerRadius: 10
          }
        }
      }
    });
  };

  // Helper function to build Bar Chart with Staggered Cascading Slow-Motion
  const buildBarChart = (canvas: HTMLCanvasElement, instanceRef: React.MutableRefObject<Chart | null>) => {
    const ctx = canvas.getContext('2d');
    let gradient: any = '#2563EB';
    if (ctx) {
      gradient = ctx.createLinearGradient(0, 0, 0, 220);
      gradient.addColorStop(0, 'rgba(37, 99, 235, 1)'); // Deep Blue
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.85)'); // Vibrant Blue
      gradient.addColorStop(1, 'rgba(147, 197, 253, 0.25)'); // Soft Light Blue
    }

    if (instanceRef.current) {
      instanceRef.current.destroy();
      instanceRef.current = null;
    }

    instanceRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: angkatanLabels.map(th => `Th ${th}`),
        datasets: [{
          label: 'Jumlah Siswa',
          data: angkatanData,
          backgroundColor: gradient,
          borderRadius: 12,
          maxBarThickness: 52
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 2600, // Cinematic 2.6s slow-motion rise
          easing: 'easeOutExpo',
          delay: (ctx: any) => {
            if (ctx.type !== 'data' || ctx.mode !== 'default') return 0;
            return ctx.dataIndex * 380; // Cascading delay: each bar rises one by one!
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            padding: 10,
            cornerRadius: 10
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, weight: 'bold' }, color: '#64748B' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { precision: 0, font: { size: 11 }, color: '#94A3B8' }
          }
        }
      }
    });
  };

  useEffect(() => {
    // Re-render both charts with the cinematic slowmo animation on every refresh / auto-detect
    const timer = setTimeout(() => {
      // 1. Mobile Charts initialization
      if (mobileDonutRef.current) {
        buildDonutChart(mobileDonutRef.current, mobileDonutChart);
      }
      if (mobileBarRef.current) {
        buildBarChart(mobileBarRef.current, mobileBarChart);
      }

      // 2. Desktop Charts initialization
      if (desktopDonutRef.current) {
        buildDonutChart(desktopDonutRef.current, desktopDonutChart);
      }
      if (desktopBarRef.current) {
        buildBarChart(desktopBarRef.current, desktopBarChart);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mobileDonutChart.current) {
        mobileDonutChart.current.destroy();
        mobileDonutChart.current = null;
      }
      if (mobileBarChart.current) {
        mobileBarChart.current.destroy();
        mobileBarChart.current = null;
      }
      if (desktopDonutChart.current) {
        desktopDonutChart.current.destroy();
        desktopDonutChart.current = null;
      }
      if (desktopBarChart.current) {
        desktopBarChart.current.destroy();
        desktopBarChart.current = null;
      }
    };
  }, [mobileChartTab, effectiveVersion]);

  return (
    <div className="space-y-4 sm:space-y-6 font-['Poppins'] max-w-full overflow-x-hidden">
      
      {/* ============================================================== */}
      {/* 1. MOBILE EXECUTIVE HERO (COMPACT & CROPPED UPWARDS)           */}
      {/* ============================================================== */}
      <section className="block sm:hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0B132B] text-white rounded-2xl p-3.5 shadow-md border border-slate-700/60">
          
          {/* Subtle Ambient Light Decoration */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />

          {/* Top Label */}
          <div className="relative z-10 flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                Database E-Arsip Aktif
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 font-semibold px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40">
              Storage {storagePercentage.toFixed(1)}%
            </span>
          </div>

          {/* Highlight Number & Storage Progress */}
          <div className="relative z-10 mb-2.5">
            <span className="text-[11px] text-slate-400 font-medium block">Total Dokumen Tersimpan</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-extrabold text-white tracking-tight">{totalArsip}</span>
              <span className="text-xs font-semibold text-emerald-400">Berkas Digital</span>
            </div>

            {/* Storage Progress Bar */}
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>Storage Penyimpanan</span>
                <span className="text-slate-300 font-semibold">{usedStorageDisplay} / {totalStorageDisplay}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Micro Category Strip */}
          <div className="relative z-10 grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80 text-center">
            <div className="bg-slate-800/60 rounded-lg p-1.5 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">Siswa</span>
              <strong className="text-xs font-bold text-white block mt-0.5">{siswaArsip}</strong>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-1.5 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">Guru</span>
              <strong className="text-xs font-bold text-white block mt-0.5">{guruArsip}</strong>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-1.5 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 block">Lainnya</span>
              <strong className="text-xs font-bold text-white block mt-0.5">{lainnyaArsip}</strong>
            </div>
          </div>

        </div>
      </section>

      {/* ============================================================== */}
      {/* DESKTOP HERO CARD (TETAP SAMA SEPERTI ASLINYA)                  */}
      {/* ============================================================== */}
      <section className="hidden sm:block relative overflow-hidden bg-gradient-to-r from-blue-50 via-white to-slate-50 border border-blue-200/80 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-600 to-indigo-600" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">
            <Lightbulb className="w-8 h-8 text-blue-600" />
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Insight Hari Ini</h2>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live Update
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200/80">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <CloudUpload className="w-3.5 h-3.5 text-blue-500" />
                  Statistik Upload
                </span>
                <p className="text-sm font-bold text-slate-900">
                  +{uploadHariIni} <small className="text-xs font-normal text-slate-500">file baru hari ini</small>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <FolderCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Kategori Terbesar
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {topKategoriEntry[0]} <small className="text-xs text-emerald-600 font-semibold">({topKategoriPct}%)</small>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                  Storage Penyimpanan
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {usedStorageDisplay} <small className="text-xs font-normal text-slate-500">dari {totalStorageDisplay} terpakai</small>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <FilePlus className="w-3.5 h-3.5 text-amber-500" />
                  Arsip Terbaru Hari Ini
                </span>
                <p className="text-sm font-bold text-slate-900 truncate" title={latestItem}>
                  {latestItem}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. MOBILE DASHBOARD EXECUTIVE OVERVIEW (CLEAN COMPACT WHITE)    */}
      {/* ============================================================== */}
      <section className="block sm:hidden space-y-2.5">
        {/* Header & Status Badge */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Ringkasan E-Arsip</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200/80">
            SMP Al-Hikam
          </span>
        </div>

        {/* Widget 1: Status Kelengkapan & Storage Meter (PURE WHITE COMPACT CARD) */}
        <div className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block leading-none">Kesehatan Arsip Digital</span>
              <h3 className="text-xs font-bold text-slate-900 mt-1">Tingkat Kelengkapan Dokumen</h3>
            </div>
            <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-2">
            {/* Siswa Completeness Bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  Arsip Siswa
                </span>
                <span className="font-bold text-blue-600">{siswaCompletenessPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                  style={{ width: `${siswaCompletenessPct}%` }} 
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {siswaWithArsipCount} dari {totalSiswa} siswa terdata di database
              </span>
            </div>

            {/* Guru Completeness Bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Arsip Guru
                </span>
                <span className="font-bold text-emerald-600">{guruCompletenessPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500" 
                  style={{ width: `${guruCompletenessPct}%` }} 
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {guruWithArsipCount} dari {totalGuru} guru terdata di database
              </span>
            </div>

            {/* Storage Cloud Meter */}
            <div className="pt-1.5 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                  Supabase Cloud Storage
                </span>
                <span className="font-bold text-indigo-600">{usedStorageDisplay}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                  style={{ width: `${storagePercentage}%` }} 
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Terpakai dari {totalStorageDisplay}</span>
                <span className="text-indigo-600 font-semibold">{(100 - storagePercentage).toFixed(0)}% Sisa Storage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Recent Upload Activity Stream (MATCHING WIDGET 1 TYPOGRAPHY & HEADER) */}
        <div className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block leading-none">Log Berkas Masuk</span>
              <h3 className="text-xs font-bold text-slate-900 mt-1">Aktivitas Upload Terbaru</h3>
            </div>
            <div className="p-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
              <FilePlus className="w-3.5 h-3.5" />
            </div>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-1.5">
              {recentActivity.map((item) => (
                <div 
                  key={item.id}
                  className="p-2 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      item.kategoriUtama === 'Arsip Siswa' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.kategoriUtama === 'Arsip Siswa' ? 'SSW' : 'GRU'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{item.subjek}</h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {item.kategori} • <span className="font-mono text-slate-600">{item.ukuran}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex-shrink-0 ml-1.5">
                    ✓ Tersimpan
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2.5 text-center text-xs text-slate-400">
              Belum ada berkas diunggah.
            </div>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. KPI METRIC CARDS (DESKTOP ONLY - HIDDEN ON MOBILE)          */}
      {/* ============================================================== */}
      
      <section className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        
        {/* Total Arsip */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="w-1 h-full bg-blue-600 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Total Arsip</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm sm:text-xl">
              <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{totalArsip}</h3>
          <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold block mt-1">+12.5% bulan ini</span>
        </div>

        {/* Arsip Siswa */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="w-1 h-full bg-emerald-500 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Arsip Siswa</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm sm:text-xl">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{siswaArsip}</h3>
          <span className="text-[10px] sm:text-xs text-slate-500 block mt-1">{allSiswa.length} data siswa</span>
        </div>

        {/* Arsip Guru */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="w-1 h-full bg-amber-500 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Arsip Guru</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm sm:text-xl">
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{guruArsip}</h3>
          <span className="text-[10px] sm:text-xs text-slate-500 block mt-1">14 kategori SK</span>
        </div>

        {/* Arsip Lainnya */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="w-1 h-full bg-purple-500 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Lain Nya</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm sm:text-xl">
              <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{lainnyaArsip}</h3>
          <span className="text-[10px] sm:text-xs text-slate-500 block mt-1">Surat & LPJ</span>
        </div>

      </section>

      {/* ============================================================== */}
      {/* 4. CHARTS SECTION (MOBILE REFINED TABS + DESKTOP SEJAJAR)       */}
      {/* ============================================================== */}
      
      {/* Mobile-Only Segmented Tabs for Charts */}
      <div className="block sm:hidden">
        <div className="flex bg-slate-200/80 p-1 rounded-2xl mb-2.5">
          <button
            onClick={() => setMobileChartTab('kategori')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mobileChartTab === 'kategori'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Kategori Dokumen
          </button>
          <button
            onClick={() => setMobileChartTab('siswa')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              mobileChartTab === 'siswa'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600'
            }`}
          >
            Siswa per Angkatan
          </button>
        </div>

        {mobileChartTab === 'kategori' ? (
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800">Distribusi Kategori</h4>
              <span className="text-[10px] font-semibold text-slate-400">{totalArsip} total file</span>
            </div>
            <div className="relative w-44 h-44 mx-auto my-2">
              <canvas ref={mobileDonutRef} />
            </div>
            <div className="space-y-1 mt-2.5">
              {sortedCategories.slice(0, 4).map(([label, count], i) => {
                const pct = totalArsip > 0 ? ((count / totalArsip) * 100).toFixed(0) : '0';
                return (
                  <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: donutColors[i % donutColors.length] }} 
                      />
                      <span className="font-medium text-slate-700 truncate max-w-[140px]">{label}</span>
                    </div>
                    <span className="font-bold text-slate-900">{pct}% <small className="text-slate-400 font-normal">({count})</small></span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800">Grafik Siswa per Angkatan</h4>
              <span className="text-[10px] text-blue-600 font-semibold">{allSiswa.length} total siswa</span>
            </div>
            <div className="w-full h-48 relative">
              <canvas ref={mobileBarRef} />
            </div>
          </div>
        )}
      </div>

      {/* Desktop-Only 2 Columns Charts (Sejajar Sesuai Desain Awal) */}
      <section className="hidden sm:grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Kotak Kiri: Upload per Kategori */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">Upload per Kategori</h4>
              <p className="text-xs text-slate-500">Distribusi persentase & jumlah berkas</p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <PieIcon className="w-4 h-4" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-6 my-auto py-2">
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex-shrink-0 flex items-center justify-center mx-auto sm:mx-0">
              <canvas ref={desktopDonutRef} />
            </div>

            <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
              {sortedCategories.length > 0 ? (
                sortedCategories.slice(0, 5).map(([label, count], i) => {
                  const pct = totalArsip > 0 ? ((count / totalArsip) * 100).toFixed(1) : '0';
                  return (
                    <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: donutColors[i % donutColors.length] }} 
                        />
                        <span className="font-medium text-slate-700 truncate max-w-[130px]">{label}</span>
                      </div>
                      <div className="text-right">
                        <strong className="text-slate-900">{pct}%</strong>
                        <span className="text-slate-400 text-[10px] ml-1">({count})</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 px-3 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-700">Belum Ada Berkas Terunggah</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Data grafik akan terisi otomatis setelah Anda mengunggah dokumen pertama.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kotak Kanan: Grafik Jumlah Siswa */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">Grafik Jumlah Siswa</h4>
              <p className="text-xs text-slate-500">Berdasarkan tahun angkatan master data</p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Angkatan</span>
            </span>
          </div>

          <div className="w-full h-56 relative">
            <canvas ref={desktopBarRef} />
          </div>
        </div>

      </section>

      {/* Desktop-Only Quick Shortcuts Banner */}
      <section className="hidden sm:block bg-[#0F172A] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Ringkasan Statistik Sistem</h3>
            <p className="text-xs text-slate-400">Statistik langsung basis data master & arsip digital sekolah</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Siswa</span>
            <strong className="block text-2xl font-black text-white">{totalSiswa}</strong>
            <span className="text-[11px] text-slate-400">Siswa & alumni terdaftar</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Guru & Tendik</span>
            <strong className="block text-2xl font-black text-white">{totalGuru}</strong>
            <span className="text-[11px] text-slate-400">Pendidik & kependidikan</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-left">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <FolderOpen className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Arsip</span>
            <strong className="block text-2xl font-black text-white">{totalArsip}</strong>
            <span className="text-[11px] text-slate-400">Dokumen digital tersimpan</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Kategori</span>
            <strong className="block text-2xl font-black text-white">{totalKategori}</strong>
            <span className="text-[11px] text-slate-400">Jenis klasifikasi berkas</span>
          </div>
        </div>
      </section>

    </div>
  );
}

export default React.memo(DashboardView);
