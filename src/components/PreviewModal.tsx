import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Download, 
  Loader2,
  AlertCircle,
  Maximize2,
  Upload,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { ArsipItem, getFileAttachment, saveFileAttachment, replaceArsipItem, getStoredSyncConfig, compressImageDataUrl } from '../data/mockDatabase';
import mammoth from 'mammoth';

interface PreviewModalProps {
  item: ArsipItem | null;
  onClose: () => void;
  onPrint: (item: ArsipItem) => void;
  onDownload: (item: ArsipItem) => void;
}

// Helper to extract Google Drive File ID from any link or format
export function extractGoogleDriveId(link?: string): string | null {
  if (!link) return null;
  const clean = link.trim();
  
  // Folders are not previewable files in /file/d/ iframe
  if (clean.includes('/folders/')) return null;

  if (clean.startsWith('gdrive://')) {
    const idPart = clean.replace('gdrive://', '').trim();
    if (idPart && !idPart.startsWith('gdrive_') && idPart.length > 10) return idPart;
    return null;
  }
  const dMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (dMatch) return dMatch[1];
  const genericDMatch = clean.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (genericDMatch) return genericDMatch[1];
  const idMatch = clean.match(/id=([a-zA-Z0-9_-]{15,})/);
  if (idMatch) return idMatch[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(clean) && !clean.startsWith('gdrive_') && clean !== '1qsi9UTuDxBmeg0ZUcGnUfJSSxwR2BwS9') {
    return clean;
  }
  return null;
}

// Convert base64 data URI to standard Blob Object URL for Chromium PDF rendering
function convertDataUriToBlobUrl(dataUrl: string): string {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
    const parts = dataUrl.split(',');
    if (parts.length < 2) return dataUrl;
    
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
    
    const byteCharacters = atob(parts[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Error creating Blob URL for PDF preview:', err);
    return dataUrl;
  }
}

export default function PreviewModal({ item, onClose, onPrint, onDownload }: PreviewModalProps) {
  const [fileData, setFileData] = useState<string>('');
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [docxHtml, setDocxHtml] = useState<string>('');
  const [isParsingDocx, setIsParsingDocx] = useState(false);

  const syncConfig = getStoredSyncConfig();
  const folderId = syncConfig.folderId || '1qsi9UTuDxBmeg0ZUcGnUfJSSxwR2BwS9';

  const driveFileId = item ? extractGoogleDriveId(item.linkDrive) : null;
  const isFolderUrl = Boolean(item?.linkDrive && item.linkDrive.includes('/folders/'));
  const drivePreviewUrl = driveFileId 
    ? `https://drive.google.com/file/d/${driveFileId}/preview` 
    : null;

  const driveDirectDownloadUrl = driveFileId 
    ? `https://drive.google.com/uc?export=download&id=${driveFileId}` 
    : (item?.linkDrive && item.linkDrive.startsWith('http') && !isFolderUrl ? item.linkDrive : null);

  useEffect(() => {
    if (!item) return;

    if (item.fileDataUrl) {
      setFileData(item.fileDataUrl);
      return;
    }

    // Try loading from IndexedDB
    setIsLoadingFile(true);
    getFileAttachment(item.id)
      .then((data) => {
        if (data) {
          setFileData(data);
        } else if (item.linkDrive && item.linkDrive.startsWith('data:')) {
          setFileData(item.linkDrive);
        }
      })
      .catch(() => {
        if (item.linkDrive && item.linkDrive.startsWith('data:')) {
          setFileData(item.linkDrive);
        }
      })
      .finally(() => {
        setIsLoadingFile(false);
      });
  }, [item]);

  const fileName = (item?.namaFileAsli || '').toLowerCase();
  const isOfficeDoc = /\.(docx?|xlsx?|pptx?|txt|csv)$/i.test(fileName);

  // Parse .docx to HTML using mammoth if local base64 is present
  useEffect(() => {
    if (!fileData || !isOfficeDoc || (!fileName.endsWith('.docx') && !fileName.endsWith('.doc'))) {
      setDocxHtml('');
      return;
    }

    setIsParsingDocx(true);
    try {
      let base64 = fileData;
      if (fileData.startsWith('data:')) {
        const parts = fileData.split(',');
        if (parts.length > 1) base64 = parts[1];
      }
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
        .then(result => {
          setDocxHtml(result.value);
        })
        .catch(err => {
          console.error('Mammoth parse error:', err);
          setDocxHtml('');
        })
        .finally(() => {
          setIsParsingDocx(false);
        });
    } catch (err) {
      console.error('Docx decode error:', err);
      setIsParsingDocx(false);
    }
  }, [fileData, isOfficeDoc, fileName]);

  // Generate Blob URL whenever fileData changes
  useEffect(() => {
    if (!fileData) {
      setBlobUrl('');
      return;
    }

    if (fileData.startsWith('data:')) {
      const url = convertDataUriToBlobUrl(fileData);
      setBlobUrl(url);
      return () => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      };
    } else {
      setBlobUrl(fileData);
    }
  }, [fileData]);

  if (!item) return null;

  const isPdf = (fileData && fileData.startsWith('data:application/pdf')) || fileName.endsWith('.pdf');
  const isImage = (fileData && fileData.startsWith('data:image')) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(fileName);

  const handleOpenFullscreen = () => {
    if (drivePreviewUrl) {
      window.open(drivePreviewUrl, '_blank');
    } else if (blobUrl) {
      window.open(blobUrl, '_blank');
    } else if (fileData) {
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    }
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;

    setIsLoadingFile(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const rawBase64 = evt.target?.result as string;
      if (rawBase64) {
        const optimizedBase64 = await compressImageDataUrl(rawBase64);
        setFileData(optimizedBase64);
        saveFileAttachment(item.id, optimizedBase64);
        const updatedItem = { ...item, fileDataUrl: optimizedBase64, namaFileAsli: file.name };
        replaceArsipItem(item.id, updatedItem);
      }
      setIsLoadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadClick = () => {
    if (driveDirectDownloadUrl) {
      window.open(driveDirectDownloadUrl, '_blank');
      return;
    }
    onDownload(item);
  };

  const handlePrintClick = () => {
    if (drivePreviewUrl) {
      const win = window.open(drivePreviewUrl, '_blank');
      if (win) {
        setTimeout(() => {
          try { win.print(); } catch {}
        }, 1500);
      }
      return;
    }
    if (blobUrl || fileData) {
      const win = window.open();
      if (win) {
        win.document.write(`<html><head><title>Cetak Dokumen - ${item?.namaFileAsli || item?.subjek}</title></head><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;"><iframe src="${blobUrl || fileData}" style="border:none;width:100%;height:100%;" onload="window.print();"></iframe></body></html>`);
        win.document.close();
      }
      return;
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-['Poppins']">
      <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        
        {/* Streamlined Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 text-white flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold truncate max-w-[220px] sm:max-w-md text-white">
                {item.namaFileAsli || item.subjek}
              </h4>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-cyan-400 font-semibold">{item.kategori}</span>
                <span>•</span>
                <span>{item.subjek}</span>
                <span>•</span>
                <span className="font-mono text-slate-300">{item.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(drivePreviewUrl || isFolderUrl) && (
              <button
                onClick={() => window.open(item.linkDrive?.startsWith('http') ? item.linkDrive : (drivePreviewUrl || `https://drive.google.com/drive/folders/${folderId}`), '_blank')}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="Buka Dokumen Asli di Google Drive"
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Google Drive</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
              </button>
            )}

            {(blobUrl || fileData || drivePreviewUrl) && (
              <button
                onClick={handleOpenFullscreen}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="Buka Dokumen di Tab Penuh"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Layar Penuh</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-colors ml-1 cursor-pointer"
              title="Tutup Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-y-auto flex items-center justify-center relative">
          
          {isLoadingFile ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl max-w-md mx-auto my-auto space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white mb-1">Sedang memuat berkas dari server...</h4>
                <p className="text-xs text-slate-400">
                  Mohon tunggu sebentar, dokumen sedang disinkronkan dari penyimpanan Cloud Google Drive.
                </p>
              </div>
            </div>
          ) : drivePreviewUrl ? (
            /* Primary Multi-Device Viewer: Embedded Google Drive Native Viewer for Word, PDF, Excel, & Images */
            <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl relative min-h-[75vh]">
              <iframe
                src={drivePreviewUrl}
                className="w-full h-full min-h-[75vh] border-0 rounded-2xl bg-white"
                title={item.namaFileAsli || 'Dokumen Google Drive'}
                allow="autoplay"
              />
            </div>
          ) : isOfficeDoc && docxHtml ? (
            /* Local Docx renderer via mammoth */
            <div className="w-full max-w-3xl bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl overflow-y-auto max-h-[82vh] font-serif leading-relaxed text-sm animate-fadeIn">
              <div className="border-b border-slate-200 pb-4 mb-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-sans font-bold text-blue-600 uppercase tracking-wider">{item.kategori}</span>
                  <h2 className="text-lg font-sans font-extrabold text-slate-900 mt-0.5">{item.namaFileAsli || item.subjek}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintClick}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-sans font-bold flex items-center gap-1 shadow hover:bg-blue-500 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak</span>
                  </button>
                  <button
                    onClick={handleDownloadClick}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-sans font-bold flex items-center gap-1 shadow hover:bg-emerald-500 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh</span>
                  </button>
                </div>
              </div>
              <div 
                className="prose prose-slate max-w-none text-slate-800 space-y-4"
                dangerouslySetInnerHTML={{ __html: docxHtml }} 
              />
            </div>
          ) : (blobUrl || fileData) ? (
            isImage ? (
              <div className="w-full h-full flex items-center justify-center p-2 overflow-auto">
                <img
                  src={fileData || blobUrl}
                  alt={item.namaFileAsli}
                  className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-700"
                />
              </div>
            ) : (
              /* Local PDF Viewer */
              <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl relative min-h-[75vh]">
                <object
                  data={blobUrl || fileData}
                  type="application/pdf"
                  className="w-full h-full min-h-[75vh] rounded-2xl bg-white border-0"
                >
                  <iframe
                    src={blobUrl || fileData}
                    className="w-full h-full min-h-[75vh] border-0 rounded-2xl bg-white"
                    title={item.namaFileAsli || 'Dokumen PDF'}
                  >
                    <div className="flex flex-col items-center justify-center p-12 text-slate-800 bg-white h-full space-y-4">
                      <FileText className="w-16 h-16 text-blue-600" />
                      <h4 className="font-bold text-base">Dokumen PDF Siap Ditampilkan</h4>
                      <button
                        onClick={handleOpenFullscreen}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        Buka PDF di Tab Baru
                      </button>
                    </div>
                  </iframe>
                </object>
              </div>
            )
          ) : isFolderUrl ? (
            /* Folder link fallback */
            <div className="text-center p-8 max-w-md bg-slate-900 border border-slate-800 rounded-3xl text-slate-300 space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                <HardDrive className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">Folder Google Drive</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Berkas untuk arsip <strong>{item.subjek}</strong> ({item.kategori}) tersimpan di folder Google Drive sekolah.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => window.open(item.linkDrive, '_blank')}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka di Google Drive</span>
                </button>
              </div>
            </div>
          ) : (
            /* Fallback if no physical file in cache and no drive link */
            <div className="text-center p-8 max-w-md bg-slate-900 border border-slate-800 rounded-3xl text-slate-300 space-y-4 shadow-xl">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
              <h4 className="text-base font-bold text-white">Berkas Fisik Belum Tersedia</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Berkas fisik untuk arsip <strong>{item.subjek}</strong> belum diunggah ke Google Drive atau memori lokal.
              </p>
              <div className="pt-2">
                <label className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Pilih & Unggah Berkas Asli</span>
                  <input 
                    type="file" 
                    accept="image/*,.pdf,.docx,.doc" 
                    className="hidden" 
                    onChange={handleCustomFileUpload} 
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer info & action controls */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Penyimpanan:</span>
            <span className="font-mono text-cyan-400 flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-cyan-400" />
              Google Drive ({folderId})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintClick}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
