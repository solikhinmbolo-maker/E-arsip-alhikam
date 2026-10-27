import { Request, Response } from 'express';

// Helper to determine exact MIME type from filename extension
function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain; charset=utf-8';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/pdf'; // Default to application/pdf for official e-Arsip documents
  }
}

export default async function handler(req: Request, res: Response) {
  try {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    let fileId = urlObj.searchParams.get('fileId');
    let filename = urlObj.searchParams.get('filename');

    // Extract filename from pathname if passed as /api/drive/download/{filename}
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (!filename && lastSegment && lastSegment !== 'download') {
      try {
        filename = decodeURIComponent(lastSegment);
      } catch {
        filename = lastSegment;
      }
    }

    if (!fileId || typeof fileId !== 'string') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'File ID Google Drive tidak valid.' }));
    }

    // Sanitize filename & ensure proper extension so Android DownloadManager never defaults to .bin
    let safeFilename = (typeof filename === 'string' && filename.trim()) ? filename.trim() : `berkas_${fileId}.pdf`;
    safeFilename = safeFilename.replace(/[/\\?%*:|"<>]/g, '_');
    if (!/\.[a-zA-Z0-9]{2,5}$/.test(safeFilename)) {
      safeFilename += '.pdf';
    }

    const resolvedMimeType = getMimeTypeFromFilename(safeFilename);

    const downloadUrls = [
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/uc?export=download&id=${fileId}`
    ];

    for (const url of downloadUrls) {
      try {
        const response = await fetch(url, { redirect: 'follow' });
        if (response.ok && response.body) {
          // Send explicit MIME type (e.g. application/pdf) instead of generic application/octet-stream
          res.setHeader('Content-Type', resolvedMimeType);
          
          // Set RFC-compliant Content-Disposition headers compatible with all Android WebViews and desktop browsers
          const asciiFilename = safeFilename.replace(/[^\x20-\x7E]/g, '_');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`
          );
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            res.setHeader('Content-Length', contentLength);
          }

          // Stream the file directly to client
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          return res.end();
        }
      } catch (err) {
        console.error(`Download Attempt Failed for ${url}:`, err);
      }
    }

    // Fallback: 302 redirect with explicit filename
    res.writeHead(302, { Location: `https://drive.google.com/uc?export=download&id=${fileId}` });
    return res.end();
  } catch (error: any) {
    console.error('Download Proxy Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: false, error: error?.message || 'Gagal mengunduh berkas dari Drive.' }));
  }
}
