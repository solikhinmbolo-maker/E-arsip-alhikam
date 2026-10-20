import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const fileId = urlObj.searchParams.get('fileId');
    const filename = urlObj.searchParams.get('filename');

    if (!fileId || typeof fileId !== 'string') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'File ID Google Drive tidak valid.' }));
    }

    const safeFilename = (typeof filename === 'string' && filename.trim()) ? filename.trim() : `berkas_${fileId}`;

    const downloadUrls = [
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      `https://lh3.googleusercontent.com/d/${fileId}`
    ];

    let fileBuffer: Buffer | null = null;
    let contentType = 'application/octet-stream';

    for (const url of downloadUrls) {
      try {
        const response = await fetch(url, { redirect: 'follow' });
        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          if (arrayBuf.byteLength > 100) {
            fileBuffer = Buffer.from(arrayBuf);
            contentType = response.headers.get('content-type') || 'application/octet-stream';
            break;
          }
        }
      } catch {}
    }

    if (!fileBuffer) {
      res.writeHead(302, { Location: `https://drive.google.com/uc?export=download&id=${fileId}` });
      return res.end();
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    return res.end(fileBuffer);
  } catch (error: any) {
    console.error('Download Proxy Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: false, error: error?.message || 'Gagal mengunduh berkas dari Drive.' }));
  }
}
