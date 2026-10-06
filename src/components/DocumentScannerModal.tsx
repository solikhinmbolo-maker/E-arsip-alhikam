import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  X, 
  RotateCw, 
  Check, 
  Sparkles, 
  Contrast, 
  SunMedium, 
  RefreshCw, 
  Layers, 
  Sliders, 
  Image as ImageIcon,
  Zap,
  ZapOff
} from 'lucide-react';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (scannedFile: File) => void;
  docTitle?: string;
}

type ScanFilter = 'magic' | 'bw' | 'grayscale' | 'original';

export default function DocumentScannerModal({
  isOpen,
  onClose,
  onScanComplete,
  docTitle = 'Dokumen'
}: DocumentScannerModalProps) {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ScanFilter>('magic');
  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(105);
  const [contrast, setContrast] = useState<number>(125);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setRotation(0);
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      if (capabilities && 'torch' in capabilities) {
        setHasTorch(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Tidak dapat mengakses kamera secara langsung. Anda dapat mengambil foto melalui opsi kamera ponsel di bawah.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      setCameraStream(null);
    }
  };

  const toggleTorch = async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (track) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }]
        });
        setTorchOn(!torchOn);
      } catch (err) {
        console.warn('Torch toggle error:', err);
      }
    }
  };

  // Capture image from live video
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Handle fallback file upload if camera API blocked
  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCapturedImage(event.target.result as string);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setRotation(0);
    setActiveFilter('magic');
    setBrightness(105);
    setContrast(125);
    startCamera();
  };

  // Process and finalize scanned document
  const handleApplyScan = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = capturedImage;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      const isRotated = rotation === 90 || rotation === 270;
      canvas.width = isRotated ? img.height : img.width;
      canvas.height = isRotated ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle Rotation
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Apply Filters directly to pixel buffer for true CamScanner document clarity
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Filter math parameters
      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const brightnessOffset = brightness - 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Apply Brightness
        r += brightnessOffset;
        g += brightnessOffset;
        b += brightnessOffset;

        // Apply Contrast
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        if (activeFilter === 'magic') {
          // Magic CamScanner Filter: Brighten paper whites, darken text inks
          const avg = (r * 0.299 + g * 0.587 + b * 0.114);
          if (avg > 140) {
            // Paper highlight
            r = Math.min(255, r * 1.15 + 15);
            g = Math.min(255, g * 1.15 + 15);
            b = Math.min(255, b * 1.15 + 15);
          } else {
            // Text shadow sharpening
            r = Math.max(0, r * 0.85);
            g = Math.max(0, g * 0.85);
            b = Math.max(0, b * 0.85);
          }
        } else if (activeFilter === 'bw') {
          // Pure Black & White Document Threshold
          const gray = (r * 0.299 + g * 0.587 + b * 0.114);
          const threshold = 135;
          const val = gray > threshold ? 255 : 0;
          r = val;
          g = val;
          b = val;
        } else if (activeFilter === 'grayscale') {
          // Smooth Document Grayscale
          const gray = (r * 0.299 + g * 0.587 + b * 0.114);
          r = gray;
          g = gray;
          b = gray;
        }

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imgData, 0, 0);

      // Convert Canvas to pristine JPG File Object
      canvas.toBlob((blob) => {
        if (!blob) return;
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        const cleanTitle = (docTitle || 'Dokumen_Scan').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Scan_${cleanTitle}_${dateStr}.jpg`;

        const finalFile = new File([blob], filename, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        onScanComplete(finalFile);
        onClose();
      }, 'image/jpeg', 0.92);
    } catch (err) {
      console.error('Apply scan error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/95 flex flex-col justify-between text-white select-none animate-fadeIn">
      {/* Top Header Bar */}
      <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
              {capturedImage ? 'Edit & Jernihkan Dokumen' : 'Pemindai Dokumen (Scanner)'}
            </h3>
            <p className="text-[10px] text-slate-400">
              {capturedImage ? 'Pilih filter pencerah agar tulisan tajam' : 'Posisikan dokumen di dalam kotak bingkai'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!capturedImage && hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-xl border transition-colors ${
                torchOn ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="Lampu Kilat / Flash"
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700 active:scale-95 transition-all"
            title="Tutup Scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {!capturedImage ? (
          /* Live Camera Mode */
          <div className="w-full h-full relative flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center max-w-xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Kamera HP Sekarang</span>
                </button>
                <input
                  ref={fallbackInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFallbackFile}
                  className="hidden"
                />
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Document Framing Guide (CamScanner Style Box) */}
                <div className="absolute inset-x-6 inset-y-12 sm:inset-x-16 sm:inset-y-16 border-2 border-cyan-400/70 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  {/* Four Corner Accents */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />

                  {/* Laser Scan Line Animation */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-pulse mt-12" />

                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="text-[11px] font-semibold text-white/90 bg-slate-900/80 px-3 py-1 rounded-full border border-cyan-400/40 backdrop-blur-md shadow-lg">
                      Luruskan teks & batas dokumen
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Captured Review & Enhancer Mode */
          <div className="w-full h-full relative flex items-center justify-center p-4">
            <img
              src={capturedImage}
              alt="Hasil Pindai"
              style={{
                transform: `rotate(${rotation}deg)`,
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${
                  activeFilter === 'bw'
                    ? 'grayscale(100%) contrast(200%)'
                    : activeFilter === 'grayscale'
                    ? 'grayscale(100%)'
                    : activeFilter === 'magic'
                    ? 'contrast(130%) brightness(108%)'
                    : 'none'
                }`
              }}
              className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl transition-all duration-300 border border-slate-800"
            />
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-[#0F172A] border-t border-slate-800">
        {!capturedImage ? (
          /* Capture Live Button */
          <div className="flex items-center justify-around max-w-sm mx-auto">
            <button
              type="button"
              onClick={() => fallbackInputRef.current?.click()}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex flex-col items-center gap-1 text-[10px] cursor-pointer"
            >
              <ImageIcon className="w-5 h-5 text-blue-400" />
              <span>Galeri/File</span>
            </button>

            {/* Big Shutter Shutter Trigger */}
            <button
              type="button"
              onClick={handleCapture}
              className="w-18 h-18 rounded-full bg-white p-1 shadow-[0_0_25px_rgba(255,255,255,0.4)] active:scale-90 transition-transform cursor-pointer flex items-center justify-center"
            >
              <div className="w-full h-full rounded-full border-4 border-slate-900 bg-cyan-500 hover:bg-cyan-400 transition-colors flex items-center justify-center">
                <Camera className="w-7 h-7 text-white" />
              </div>
            </button>

            <button
              type="button"
              onClick={startCamera}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex flex-col items-center gap-1 text-[10px] cursor-pointer"
            >
              <RefreshCw className="w-5 h-5 text-emerald-400" />
              <span>Refresh</span>
            </button>
          </div>
        ) : (
          /* Filter & Confirmation Controls */
          <div className="space-y-3.5 max-w-md mx-auto">
            {/* Filter Tabs (CamScanner Style: Magic, BW, Gray, Asli) */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-center">
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('magic');
                  setBrightness(108);
                  setContrast(130);
                }}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeFilter === 'magic'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Magic Scan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFilter('bw');
                  setBrightness(115);
                  setContrast(160);
                }}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeFilter === 'bw'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Contrast className="w-3.5 h-3.5" />
                <span>Hitam Putih</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFilter('grayscale');
                  setBrightness(105);
                  setContrast(120);
                }}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeFilter === 'grayscale'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Abu-abu</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveFilter('original');
                  setBrightness(100);
                  setContrast(100);
                }}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  activeFilter === 'original'
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <SunMedium className="w-3.5 h-3.5" />
                <span>Asli Foto</span>
              </button>
            </div>

            {/* Action Buttons: Retake, Rotate, and Confirm */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="px-3.5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Ulangi</span>
              </button>

              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                title="Putar Dokumen 90°"
              >
                <RotateCw className="w-4 h-4 text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={handleApplyScan}
                disabled={isProcessing}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses Berkas...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Gunakan Dokumen Ini</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
