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

    for (const url of downloadUrls) {
      try {
        const response = await fetch(url, { redirect: 'follow' });
        if (response.ok && response.body) {
          res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);
          
          // Stream the body
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

    res.writeHead(302, { Location: `https://drive.google.com/uc?export=download&id=${fileId}` });
    return res.end();
  } catch (error: any) {
    console.error('Download Proxy Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: false, error: error?.message || 'Gagal mengunduh berkas dari Drive.' }));
  }
}
