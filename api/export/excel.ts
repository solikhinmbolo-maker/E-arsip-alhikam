// In-memory store for exported excel payloads (with 10-minute TTL)
interface CachedExport {
  filename: string;
  html: string;
  createdAt: number;
}

const exportCache = new Map<string, CachedExport>();

function cleanExpiredCache() {
  const now = Date.now();
  for (const [id, item] of exportCache.entries()) {
    if (now - item.createdAt > 10 * 60 * 1000) {
      exportCache.delete(id);
    }
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  cleanExpiredCache();

  // POST: Store payload and return real HTTPS download URL
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    } else if (!body) {
      // Parse request body from stream if not parsed
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk: any) => { data += chunk; });
        req.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({});
          }
        });
        req.on('error', () => resolve({}));
      });
    }

    const rawFilename = body?.filename || `Rekap_Dokumen_${new Date().toISOString().slice(0, 10)}.xls`;
    const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '_');
    const html = body?.html || '';

    if (!html) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'Data tabel matriks tidak boleh kosong.' }));
    }

    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    exportCache.set(id, {
      filename,
      html,
      createdAt: Date.now()
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: true,
      id,
      downloadUrl: `/api/export/excel?id=${id}&filename=${encodeURIComponent(filename)}`
    }));
  }

  // GET: Serve the cached excel file as attachment with proper Excel headers
  if (req.method === 'GET') {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const id = urlObj.searchParams.get('id');
    const filenameParam = urlObj.searchParams.get('filename');

    if (!id || !exportCache.has(id)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #DC2626;">Berkas Ekspor Tidak Ditemukan atau Telah Kadaluarsa</h2>
          <p style="color: #4B5563;">Silakan kembali ke aplikasi dan klik tombol "Ekspor Excel" kembali.</p>
        </div>
      `);
    }

    const cached = exportCache.get(id)!;
    const finalFilename = (filenameParam || cached.filename || 'Rekap_Dokumen.xls').replace(/[/\\?%*:|"<>]/g, '_');

    const buffer = Buffer.from(cached.html, 'utf-8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    return res.end(buffer);
  }

  res.statusCode = 405;
  return res.end();
}
