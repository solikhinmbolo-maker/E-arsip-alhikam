export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL?.trim() || '';
  const scriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim() || 'eArsipSecretAlHikam2026_SecureKey';

  return res.end(JSON.stringify({
    success: true,
    hasConfig: Boolean(scriptUrl),
    scriptUrl,
    scriptSecret
  }));
}
