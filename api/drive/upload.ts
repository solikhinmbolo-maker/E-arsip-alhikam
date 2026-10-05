import busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false // Allow busboy to parse binary stream
  }
};

interface UploadedFileInfo {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

// Helper to parse multipart/form-data stream
function parseMultipartForm(req: any): Promise<{ fields: Record<string, string>; file: UploadedFileInfo | null }> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {};
    let uploadedFile: UploadedFileInfo | null = null;

    try {
      const bb = busboy({ headers: req.headers });

      bb.on('field', (name: string, val: string) => {
        fields[name] = val;
      });

      bb.on('file', (name: string, fileStream: any, info: any) => {
        const { filename, mimeType } = info;
        const chunks: Buffer[] = [];

        fileStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        fileStream.on('end', () => {
          uploadedFile = {
            filename,
            mimeType: mimeType || 'application/octet-stream',
            buffer: Buffer.concat(chunks)
          };
        });
      });

      bb.on('finish', () => {
        resolve({ fields, file: uploadedFile });
      });

      bb.on('error', (err: any) => {
        reject(err);
      });

      req.pipe(bb);
    } catch (err) {
      reject(err);
    }
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ success: false, error: 'Method Not Allowed. Gunakan POST.' }));
  }

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  const scriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim() || 'eArsipSecretAlHikam2026_SecureKey';

  if (!scriptUrl) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      success: false,
      error: 'Google Drive belum dikonfigurasi.',
      message: '⚠️ GOOGLE_APPS_SCRIPT_URL belum disetel pada Environment Variables server Vercel.'
    }));
  }

  try {
    const { fields, file } = await parseMultipartForm(req);

    if (!file || !file.buffer || file.buffer.length === 0) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ 
        success: false, 
        error: 'Tidak ada berkas fisik biner yang diterima dalam form upload.' 
      }));
    }

    const desiredFilename = fields.customFilename || fields.namaFileAsli || file.filename || `arsip_${Date.now()}`;

    // Payload for Google Apps Script Web App (executed server-to-server)
    const payload = {
      secret: scriptSecret,
      apiKey: scriptSecret,
      action: 'upload',
      actionType: 'upload',
      folderId: fields.folderId || '1qsi9UTuDxBmeg0ZUcGnUfJSSxwR2BwS9',
      spreadsheetId: fields.spreadsheetId || '1fyWuUClt970_2RELzMq5jBGsjCcTXYZW_XZtTyxmyI',
      fileName: desiredFilename,
      namaFileAsli: desiredFilename,
      namaFile: desiredFilename,
      mimeType: file.mimeType,
      fileBase64: file.buffer.toString('base64'),
      fileData: file.buffer.toString('base64'),
      kategori: fields.kategori || '',
      kategoriUtama: fields.kategoriUtama || '',
      tahun: fields.tahun || '',
      subjek: fields.subjek || '',
      identitas: fields.identitas || '',
      id: fields.id || ''
    };

    // Forward to Google Apps Script Web App (follows Google 302 redirects automatically)
    const scriptResponse = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const responseText = await scriptResponse.text();
    let result: any = null;

    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Invalid JSON response from Google Apps Script:', responseText);
      res.statusCode = 502;
      return res.end(JSON.stringify({
        success: false,
        error: 'Respons dari Google Apps Script tidak valid.',
        detail: responseText.slice(0, 200)
      }));
    }

    const createdFileId = result?.fileId || result?.id || 
      (result?.driveUrl ? result.driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || result.driveUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1] : null);

    const isSuccess = Boolean(
      result && (
        result.success === true || 
        result.status === 'success' || 
        Boolean(createdFileId)
      )
    );

    if (!isSuccess || !createdFileId) {
      res.statusCode = 400;
      return res.end(JSON.stringify({
        success: false,
        error: result?.message || 'Gagal menyimpan berkas ke Google Drive via Apps Script.',
        detail: result
      }));
    }

    const createdDriveUrl = result.driveUrl || `https://drive.google.com/file/d/${createdFileId}/view?usp=drivesdk`;

    res.statusCode = 200;
    return res.end(JSON.stringify({
      success: true,
      fileId: createdFileId,
      driveUrl: createdDriveUrl,
      fileName: result.fileName || desiredFilename,
      mimeType: result.mimeType || file.mimeType,
      size: result.size || file.buffer.length,
      message: '✓ Berkas fisik berhasil tersimpan di Google Drive Private via Apps Script!'
    }));
  } catch (error: any) {
    console.error('Apps Script Proxy Upload Error:', error);
    res.statusCode = 500;
    return res.end(JSON.stringify({
      success: false,
      error: error?.message || 'Gagal menghubungi Google Apps Script Web App.',
      detail: 'Pastikan GOOGLE_APPS_SCRIPT_URL dapat diakses.'
    }));
  }
}
