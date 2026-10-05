export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ success: false, message: 'Method Not Allowed' }));
  }

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL?.trim();
  const scriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim() || 'eArsipSecretAlHikam2026_SecureKey';

  if (!scriptUrl) {
    res.statusCode = 200;
    return res.end(JSON.stringify({
      success: false,
      connected: false,
      isConfigured: false,
      error: 'Google Drive belum dikonfigurasi.',
      message: '⚠️ GOOGLE_APPS_SCRIPT_URL belum disetel pada Environment Variables server Vercel.'
    }));
  }

  try {
    // Send ping request to Google Apps Script Web App
    const scriptResponse = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        secret: scriptSecret,
        action: 'ping'
      }),
      redirect: 'follow'
    });

    const responseText = await scriptResponse.text();
    let result: any = null;

    try {
      result = JSON.parse(responseText);
    } catch {
      return res.end(JSON.stringify({
        success: false,
        connected: false,
        isConfigured: true,
        error: 'Respons dari Google Apps Script bukan JSON yang valid.',
        detail: responseText.slice(0, 200),
        message: '⚠️ Google Apps Script URL merespons tetapi mengembalikan data non-JSON. Pastikan Web App di-deploy sebagai "Anyone" dan mengembalikan JSON TextOutput.'
      }));
    }

    if (result.success) {
      return res.end(JSON.stringify({
        success: true,
        connected: true,
        isConfigured: true,
        folderName: result.folderName || 'E-ARSIP DIGITAL SMP AL-HIKAM',
        message: '✓ Berhasil terhubung ke Google Apps Script & Google Drive Private Storage!'
      }));
    } else {
      return res.end(JSON.stringify({
        success: false,
        connected: false,
        isConfigured: true,
        error: result.message || 'Autentikasi secret atau izin Apps Script ditolak.',
        message: `❌ Apps Script merespons dengan kesalahan: ${result.message || 'Periksa API Secret'}`
      }));
    }
  } catch (err: any) {
    return res.end(JSON.stringify({
      success: false,
      connected: false,
      isConfigured: true,
      error: err.message || 'Gagal menghubungi Google Apps Script URL',
      message: `❌ Gagal menghubungi server Google Apps Script: ${err.message}`
    }));
  }
}
