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
import { getSupabaseClient, fetchSanitizedMasterDataFromSupabase } from '../supabase';

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

  // Viewport visibility tracker so mobile chart entrance animation triggers right when user scrolls to it
  const chartsContainerRef = useRef<HTMLDivElement | null>(null);
  const [isChartsVisible, setIsChartsVisible] = useState(false);

  useEffect(() => {
    const el = chartsContainerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsChartsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsChartsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '60px'
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    return allArsip.slice(0, 5);
  }, [allArsip]);

  // Real-time Storage Calculation (20.0 GB Limit)
  const TOTAL_STORAGE_MB = 20 * 1024; // 20 GB
  const [remoteStorageMB, setRemoteStorageMB] = useState<number | null>(null);

  // Compute used storage from all uploaded archives metadata (Google Drive + Supabase)
  const localCalculatedMB = useMemo(() => {
    let sumMB = 0;
    allArsip.forEach(item => {
      if (!item.ukuran) {
        sumMB += 0.5; // fallback default 500 KB if no metadata
        return;
      }
      const raw = String(item.ukuran).trim().replace(',', '.').toLowerCase();
      const mbMatch = raw.match(/([\d.]+)\s*mb/);
      if (mbMatch && mbMatch[1]) {
        sumMB += parseFloat(mbMatch[1]) || 0;
      } else {
        const kbMatch = raw.match(/([\d.]+)\s*kb/);
        if (kbMatch && kbMatch[1]) {
          sumMB += (parseFloat(kbMatch[1]) || 0) / 1024;
        } else {
          const bMatch = raw.match(/([\d.]+)\s*b/);
          if (bMatch && bMatch[1]) {
            sumMB += (parseFloat(bMatch[1]) || 0) / (1024 * 1024);
          } else {
            const num = parseFloat(raw);
            if (!isNaN(num) && num > 0) {
              sumMB += num;
            }
          }
        }
      }
    });
    return sumMB;
  }, [allArsip]);

  // Query actual files in Supabase Storage bucket 'arsip' (if any files stored directly)
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

  // Choose the larger and true calculated storage to avoid empty bucket override
  const activeUsedMB = Math.max(localCalculatedMB, remoteStorageMB || 0);
  const usedStorageDisplay = activeUsedMB >= 1024 
    ? `${(activeUsedMB / 1024).toFixed(2)} GB`
    : `${activeUsedMB > 0 ? (activeUsedMB >= 10 ? activeUsedMB.toFixed(1) : activeUsedMB.toFixed(2)) : '0.00'} MB`;
  const totalStorageDisplay = '20.0 GB';
  const storagePercentage = Math.max(0.1, Math.min(100, (activeUsedMB / TOTAL_STORAGE_MB) * 100));

  // Siswa per angkatan (Normalized year extraction)
  const cleanYear = (raw: any): string => {
    if (!raw) return 'Lainnya';
    const str = String(raw).trim();
    if (!str || str === '-') return 'Lainnya';
    const match = str.match(/\d{4}/);
    if (match) return match[0];
    return str;
  };

  const siswaPerTahun: { [th: string]: number } = {};
  allSiswa.forEach(s => {
    const yr = cleanYear(s.tahun);
    siswaPerTahun[yr] = (siswaPerTahun[yr] || 0) + 1;
  });

  const angkatanLabels = Object.keys(siswaPerTahun).sort((a, b) => {
    if (a === 'Lainnya') return 1;
    if (b === 'Lainnya') return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  const angkatanData = angkatanLabels.map(th => siswaPerTahun[th]);

  // Donut chart colors
  const donutColors = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

  const prevDonutSignature = useRef<string>('');
  const prevBarSignature = useRef<string>('');

  const donutLabels = useMemo(() => sortedCategories.slice(0, 6).map(e => e[0]), [sortedCategories]);
  const donutData = useMemo(() => sortedCategories.slice(0, 6).map(e => e[1]), [sortedCategories]);
  const currentDonutSignature = useMemo(() => JSON.stringify({ labels: donutLabels, data: donutData }), [donutLabels, donutData]);

  const barLabels = useMemo(() => angkatanLabels.map(th => {
    if (th === 'Lainnya') return 'Tdk Diumumkan';
    if (th.startsWith('Th')) return th;
    return `Th ${th}`;
  }), [angkatanLabels]);
  const currentBarSignature = useMemo(() => JSON.stringify({ labels: barLabels, data: angkatanData }), [barLabels, angkatanData]);

  // Update or build Donut Chart with guaranteed smooth entrance animation
  const updateOrBuildDonutChart = (canvas: HTMLCanvasElement, instanceRef: React.MutableRefObject<Chart | null>) => {
    const labels = donutLabels.length > 0 ? donutLabels : ['Belum Ada'];
    const data = donutData.length > 0 ? donutData : [1];

    if (instanceRef.current) {
      try { instanceRef.current.destroy(); } catch {}
      instanceRef.current = null;
    }

    try {
      instanceRef.current = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: donutColors.slice(0, labels.length || 1),
            borderWidth: 3,
            borderColor: '#ffffff',
            hoverOffset: 8,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 200,
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 2600, // 3x lebih lambat, sangat halus & berputar anggun
            easing: 'easeOutQuart'
          },
          animations: {
            circumference: {
              type: 'number',
              duration: 2600,
              easing: 'easeOutQuart',
              from: 0
            },
            endAngle: {
              type: 'number',
              duration: 2600,
              easing: 'easeOutQuart',
              from: (ctx: any) => {
                if (ctx.type === 'data' && ctx.element && typeof ctx.element.startAngle === 'number') {
                  return ctx.element.startAngle;
                }
                return undefined;
              }
            },
            outerRadius: {
              type: 'number',
              duration: 2600,
              easing: 'easeOutQuart',
              from: 0
            }
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
    } catch (err) {
      console.warn('Failed to initialize donut chart:', err);
    }
  };

  // Update or build Bar Chart with guaranteed smooth entrance animation
  const updateOrBuildBarChart = (canvas: HTMLCanvasElement, instanceRef: React.MutableRefObject<Chart | null>) => {
    const ctx = canvas.getContext('2d');
    let gradient: any = '#2563EB';
    if (ctx) {
      gradient = ctx.createLinearGradient(0, 0, 0, 220);
      gradient.addColorStop(0, 'rgba(37, 99, 235, 1)');
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.85)');
      gradient.addColorStop(1, 'rgba(147, 197, 253, 0.25)');
    }

    if (instanceRef.current) {
      try { instanceRef.current.destroy(); } catch {}
      instanceRef.current = null;
    }

    try {
      instanceRef.current = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: barLabels,
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
          resizeDelay: 200,
          animations: {
            y: {
              duration: 2600, // 3x lebih lambat, naik perlahan dan sangat halus
              easing: 'easeOutQuart',
              from: (ctx: any) => {
                if (ctx.type === 'data') {
                  const scale = ctx.chart.scales.y;
                  return scale ? scale.getPixelForValue(0) : undefined;
                }
              },
              delay: (ctx: any) => {
                if (ctx.type !== 'data' || ctx.mode !== 'default') return 0;
                return ctx.dataIndex * 150; // Efek ombak mengalir bertahap dari kiri ke kanan
              }
            },
            x: {
              duration: 0 // Absolutely no horizontal movement or side slide
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
    } catch (err) {
      console.warn('Failed to initialize bar chart:', err);
    }
  };

  // Seamless tab switch with complete cleanup of previous canvas instance
  const handleSwitchMobileTab = (targetTab: 'kategori' | 'siswa') => {
    if (targetTab === mobileChartTab) return;

    // Destroy the departing chart instance so memory is clean
    if (mobileChartTab === 'kategori') {
      try { mobileDonutChart.current?.destroy(); } catch {}
      mobileDonutChart.current = null;
    } else {
      try { mobileBarChart.current?.destroy(); } catch {}
      mobileBarChart.current = null;
    }

    setMobileChartTab(targetTab);
  };

  useEffect(() => {
    if (!isChartsVisible) return;

    const donutChanged = prevDonutSignature.current !== currentDonutSignature;
    const barChanged = prevBarSignature.current !== currentBarSignature;

    // Mobile Donut (starts completely from zero on fresh blank canvas)
    if (mobileChartTab === 'kategori' && mobileDonutRef.current) {
      if (!mobileDonutChart.current || donutChanged) {
        updateOrBuildDonutChart(mobileDonutRef.current, mobileDonutChart);
      }
    }

    // Mobile Bar (starts completely from zero on fresh blank canvas)
    if (mobileChartTab === 'siswa' && mobileBarRef.current) {
      if (!mobileBarChart.current || barChanged) {
        updateOrBuildBarChart(mobileBarRef.current, mobileBarChart);
      }
    }

    // Desktop Donut
    if (desktopDonutRef.current) {
      if (!desktopDonutChart.current || donutChanged) {
        updateOrBuildDonutChart(desktopDonutRef.current, desktopDonutChart);
      }
    }

    // Desktop Bar
    if (desktopBarRef.current) {
      if (!desktopBarChart.current || barChanged) {
        updateOrBuildBarChart(desktopBarRef.current, desktopBarChart);
      }
    }

    prevDonutSignature.current = currentDonutSignature;
    prevBarSignature.current = currentBarSignature;
  }, [isChartsVisible, mobileChartTab, currentDonutSignature, currentBarSignature]);

  // Clean destruction only when component truly unmounts
  useEffect(() => {
    return () => {
      mobileDonutChart.current?.destroy();
      mobileDonutChart.current = null;
      mobileBarChart.current?.destroy();
      mobileBarChart.current = null;
      desktopDonutChart.current?.destroy();
      desktopDonutChart.current = null;
      desktopBarChart.current?.destroy();
      desktopBarChart.current = null;
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 font-['Poppins'] max-w-full">
      
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
      {/* DESKTOP HERO CARD (ELEGANT SOFT GLASS BANNER)                   */}
      {/* ============================================================== */}
      <section className="hidden sm:block relative overflow-hidden bg-gradient-to-br from-white/90 via-sky-50/60 to-indigo-50/40 backdrop-blur-md border border-blue-200/80 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(30,58,138,0.08)] hover:border-blue-300 transition-all group">
        {/* Soft Colored Accent Line */}
        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-500 via-cyan-400 to-indigo-500 rounded-l-3xl" />
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-200/80 text-blue-600 flex items-center justify-center text-3xl flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Lightbulb className="w-8 h-8 text-blue-600 drop-shadow-xs" />
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Insight Hari Ini</h2>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                Live Update
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200/80">
              <div className="space-y-1">
                <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                  <CloudUpload className="w-3.5 h-3.5 text-blue-600" />
                  Statistik Upload
                </span>
                <p className="text-sm font-bold text-slate-900">
                  +{uploadHariIni} <small className="text-xs font-normal text-slate-500">file baru hari ini</small>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                  <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Kategori Terbesar
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {topKategoriEntry[0]} <small className="text-xs text-emerald-600 font-bold">({topKategoriPct}%)</small>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                  Storage Penyimpanan
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {usedStorageDisplay} <small className="text-xs font-normal text-slate-500">dari {totalStorageDisplay} terpakai</small>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                  <FilePlus className="w-3.5 h-3.5 text-amber-600" />
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

        {/* Widget: Recent Upload Activity Stream (Aktivitas Upload Terbaru - 5 Berkas) */}
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
      {/* 3. KPI METRIC CARDS (ELEGANT SOFT-TINTED GRADIENTS)            */}
      {/* ============================================================== */}
      
      <section className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        
        {/* Total Arsip */}
        <div className="bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-slate-50 border border-blue-200/90 hover:border-blue-400/80 hover:shadow-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 relative overflow-hidden transition-all group">
          <div className="w-1 h-full bg-blue-600 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-950/70">Total Arsip</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-blue-500/15 text-blue-600 border border-blue-200/60 flex items-center justify-center text-sm sm:text-xl shadow-xs group-hover:scale-110 transition-transform">
              <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{totalArsip}</h3>
          <span className="text-[10px] sm:text-xs text-emerald-600 font-bold block mt-1">+12.5% bulan ini</span>
        </div>

        {/* Arsip Siswa */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-slate-50 border border-emerald-200/90 hover:border-emerald-400/80 hover:shadow-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 relative overflow-hidden transition-all group">
          <div className="w-1 h-full bg-emerald-500 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-950/70">Arsip Siswa</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 text-emerald-600 border border-emerald-200/60 flex items-center justify-center text-sm sm:text-xl shadow-xs group-hover:scale-110 transition-transform">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{siswaArsip}</h3>
          <span className="text-[10px] sm:text-xs text-slate-600 font-medium block mt-1">{allSiswa.length} data siswa</span>
        </div>

        {/* Arsip Guru */}
        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-slate-50 border border-amber-200/90 hover:border-amber-400/80 hover:shadow-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 relative overflow-hidden transition-all group">
          <div className="w-1 h-full bg-amber-500 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-950/70">Arsip Guru</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 text-amber-600 border border-amber-200/60 flex items-center justify-center text-sm sm:text-xl shadow-xs group-hover:scale-110 transition-transform">
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{guruArsip}</h3>
          <span className="text-[10px] sm:text-xs text-slate-600 font-medium block mt-1">14 kategori SK</span>
        </div>

        {/* Arsip Lainnya */}
        <div className="bg-gradient-to-br from-purple-50/90 via-indigo-50/40 to-slate-50 border border-purple-200/90 hover:border-purple-400/80 hover:shadow-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 relative overflow-hidden transition-all group">
          <div className="w-1 h-full bg-purple-500 absolute left-0 top-0" />
          <div className="flex items-center justify-between mb-1.5 sm:mb-3">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-950/70">Lain Nya</span>
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-purple-500/15 text-purple-600 border border-purple-200/60 flex items-center justify-center text-sm sm:text-xl shadow-xs group-hover:scale-110 transition-transform">
              <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{lainnyaArsip}</h3>
          <span className="text-[10px] sm:text-xs text-slate-600 font-medium block mt-1">Surat & LPJ</span>
        </div>

      </section>

      {/* ============================================================== */}
      {/* 4. CHARTS SECTION (MOBILE REFINED TABS + DESKTOP SEJAJAR)       */}
      {/* ============================================================== */}
      
      <div ref={chartsContainerRef} className="space-y-4">
        {/* Mobile-Only Segmented Tabs for Charts */}
        <div className="block sm:hidden">
        <div className="flex bg-slate-200/80 p-1 rounded-2xl mb-2.5">
          <button
            onClick={() => handleSwitchMobileTab('kategori')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              mobileChartTab === 'kategori'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kategori Dokumen
          </button>
          <button
            onClick={() => handleSwitchMobileTab('siswa')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              mobileChartTab === 'siswa'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Siswa per Angkatan
          </button>
        </div>

        {/* Conditional Fresh-Mounting Chart Container (Eliminates Canvas Jolt / Flash) */}
        {mobileChartTab === 'kategori' ? (
          <div key="kategori" className="animate-chart-tab bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm min-h-[365px] flex flex-col justify-between">
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
          <div key="siswa" className="animate-chart-tab bg-white rounded-3xl p-4 border border-slate-200/90 shadow-sm min-h-[365px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800">Grafik Siswa per Angkatan</h4>
              <span className="text-[10px] text-blue-600 font-semibold">{allSiswa.length} total siswa</span>
            </div>
            <div className="w-full h-52 relative my-auto">
              <canvas ref={mobileBarRef} />
            </div>
            <div className="text-center pt-2.5 border-t border-slate-100 text-[11px] text-slate-400">
              Total {allSiswa.length} siswa terdaftar di seluruh angkatan
            </div>
          </div>
        )}
      </div>

      {/* Desktop-Only 2 Columns Charts (Sejajar Sesuai Desain Awal) */}
      <section className="hidden sm:grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Kotak Kiri: Upload per Kategori */}
        <div className="bg-gradient-to-br from-slate-50/90 via-blue-50/30 to-indigo-50/20 rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">Upload per Kategori</h4>
              <p className="text-xs text-slate-500">Distribusi persentase & jumlah berkas</p>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 border border-blue-200/60 shadow-xs">
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
                    <div key={label} className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-slate-200/70 text-xs shadow-2xs">
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
                <div className="text-center py-6 px-3 bg-white/70 rounded-2xl border border-dashed border-slate-200">
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
        <div className="bg-gradient-to-br from-slate-50/90 via-sky-50/30 to-blue-50/20 rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between">
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
      </div>

      {/* Desktop-Only Quick Shortcuts Banner */}
      <section className="hidden sm:block relative overflow-hidden bg-gradient-to-br from-indigo-50/80 via-purple-50/30 to-slate-50 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.08)] border border-indigo-200/80 hover:border-indigo-300 transition-all">
        {/* Soft Background Blur Accent */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Ringkasan Statistik Sistem</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium">Statistik langsung basis data master & arsip digital sekolah</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
          {/* Total Siswa */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-indigo-50/30 border border-blue-200/90 hover:border-blue-400 hover:shadow-md backdrop-blur-md transition-all text-left group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 border border-blue-200/80 flex items-center justify-center mb-3 shadow-2xs group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-blue-950/70 uppercase tracking-wider block mb-0.5">Total Siswa</span>
            <strong className="block text-2xl font-extrabold text-slate-900 tracking-tight">{totalSiswa}</strong>
            <span className="text-[11px] text-slate-600 font-medium">Siswa & alumni terdaftar</span>
          </div>

          {/* Total Guru & Tendik */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-emerald-50/30 border border-emerald-200/90 hover:border-emerald-400 hover:shadow-md backdrop-blur-md transition-all text-left group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mb-3 shadow-2xs group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-950/70 uppercase tracking-wider block mb-0.5">Total Guru & Tendik</span>
            <strong className="block text-2xl font-extrabold text-slate-900 tracking-tight">{totalGuru}</strong>
            <span className="text-[11px] text-slate-600 font-medium">Pendidik & kependidikan</span>
          </div>

          {/* Total Arsip */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/50 to-violet-50/30 border border-indigo-200/90 hover:border-indigo-400 hover:shadow-md backdrop-blur-md transition-all text-left group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 border border-indigo-200/80 flex items-center justify-center mb-3 shadow-2xs group-hover:scale-105 transition-transform">
              <FolderOpen className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-indigo-950/70 uppercase tracking-wider block mb-0.5">Total Arsip</span>
            <strong className="block text-2xl font-extrabold text-slate-900 tracking-tight">{totalArsip}</strong>
            <span className="text-[11px] text-slate-600 font-medium">Dokumen digital tersimpan</span>
          </div>

          {/* Total Kategori */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-50/30 border border-amber-200/90 hover:border-amber-400 hover:shadow-md backdrop-blur-md transition-all text-left group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 border border-amber-200/80 flex items-center justify-center mb-3 shadow-2xs group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-amber-950/70 uppercase tracking-wider block mb-0.5">Total Kategori</span>
            <strong className="block text-2xl font-extrabold text-slate-900 tracking-tight">{totalKategori}</strong>
            <span className="text-[11px] text-slate-600 font-medium">Jenis klasifikasi berkas</span>
          </div>
        </div>
      </section>

    </div>
  );
}

export default React.memo(DashboardView);
