package com.alhikam.earsip;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private BroadcastReceiver onDownloadCompleteReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
            if (id != -1) {
                try {
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm != null) {
                        DownloadManager.Query query = new DownloadManager.Query();
                        query.setFilterById(id);
                        try (Cursor cursor = dm.query(query)) {
                            if (cursor != null && cursor.moveToFirst()) {
                                int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                                int titleIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TITLE);
                                if (statusIndex != -1 && cursor.getInt(statusIndex) == DownloadManager.STATUS_SUCCESSFUL) {
                                    final String title = (titleIndex != -1) ? cursor.getString(titleIndex) : "Dokumen";
                                    Toast.makeText(getApplicationContext(), "✅ Selesai Diunduh!\nFile tersimpan di folder Download:\n" + title, Toast.LENGTH_LONG).show();

                                    if (bridge != null && bridge.getWebView() != null) {
                                        final WebView webView = bridge.getWebView();
                                        webView.post(new Runnable() {
                                            @Override
                                            public void run() {
                                                String safeTitle = title.replace("'", "\\'");
                                                webView.evaluateJavascript(
                                                    "window.dispatchEvent(new CustomEvent('earsip:native-download-complete', { detail: { filename: '" + safeTitle + "' } }));",
                                                    null
                                                );
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Minta izin Notifikasi untuk Android 13+ agar bar status download dan notifikasi selesai muncul resmi
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        // Daftarkan listener selesai download
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(onDownloadCompleteReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
            } else {
                registerReceiver(onDownloadCompleteReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
            }
        } catch (Exception ignored) {}

        // Pasang DownloadListener native Android agar WebView di APK dapat mengunduh berkas dengan notifikasi resmi
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebView webView = this.bridge.getWebView();
                webView.setDownloadListener(new DownloadListener() {
                    @Override
                    public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                        try {
                            Uri uri = Uri.parse(url);
                            
                            // 1. Ekstrak nama file asli dari query param atau path URL
                            String filename = null;
                            try {
                                String qFilename = uri.getQueryParameter("filename");
                                if (qFilename != null && !qFilename.trim().isEmpty()) {
                                    filename = java.net.URLDecoder.decode(qFilename.trim(), "UTF-8");
                                }
                            } catch (Exception ignored) {}

                            if (filename == null || filename.isEmpty()) {
                                filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                            }

                            // 2. Mencegah nama berakhiran .bin atau tanpa ekstensi
                            if (filename == null || filename.isEmpty() || filename.toLowerCase().endsWith(".bin") || !filename.contains(".")) {
                                String base = (filename != null && !filename.isEmpty()) ? filename.replaceAll("(?i)\\.bin$", "") : "Dokumen_Arsip";
                                if (mimeType != null && mimeType.equalsIgnoreCase("application/pdf")) {
                                    filename = base + ".pdf";
                                } else if (mimeType != null && mimeType.contains("image/")) {
                                    String ext = mimeType.replace("image/", "");
                                    filename = base + "." + (ext.equals("jpeg") ? "jpg" : ext);
                                } else {
                                    filename = base + ".pdf";
                                }
                            }

                            // 3. Menentukan MIME type yang tepat agar Android langsung membuka berkas dengan aplikasi yang sesuai
                            String resolvedMimeType = (mimeType != null && !mimeType.isEmpty() && !mimeType.equals("application/octet-stream")) ? mimeType : null;
                            String lowerName = filename.toLowerCase();
                            if (lowerName.endsWith(".pdf")) {
                                resolvedMimeType = "application/pdf";
                            } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
                                resolvedMimeType = "image/jpeg";
                            } else if (lowerName.endsWith(".png")) {
                                resolvedMimeType = "image/png";
                            } else if (lowerName.endsWith(".docx")) {
                                resolvedMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                            } else if (lowerName.endsWith(".xlsx")) {
                                resolvedMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                            }

                            DownloadManager.Request request = new DownloadManager.Request(uri);
                            if (resolvedMimeType != null) {
                                request.setMimeType(resolvedMimeType);
                            }
                            String cookies = CookieManager.getInstance().getCookie(url);
                            if (cookies != null) {
                                request.addRequestHeader("cookie", cookies);
                            }
                            if (userAgent != null) {
                                request.addRequestHeader("User-Agent", userAgent);
                            }
                            request.setDescription("Menyimpan berkas e-Arsip Alhicam ke folder Download...");
                            request.setTitle(filename);
                            request.allowScanningByMediaScanner();
                            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

                            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                            if (dm != null) {
                                dm.enqueue(request);
                                Toast.makeText(getApplicationContext(), "📥 Memulai Unduhan:\n" + filename, Toast.LENGTH_SHORT).show();
                            }
                        } catch (Exception e) {
                            Toast.makeText(getApplicationContext(), "Gagal mengunduh: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    }
                });
            }
        } catch (Exception ignored) {}

        Window window = getWindow();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(lp);
        }

        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.getDecorView().setBackgroundColor(android.graphics.Color.parseColor("#080E21"));
        hideSystemBars();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(onDownloadCompleteReceiver);
        } catch (Exception ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
        }
    }

    private void hideSystemBars() {
        Window window = getWindow();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }

        View decorView = window.getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }
}
