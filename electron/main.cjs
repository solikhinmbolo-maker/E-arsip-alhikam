const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

const ONLINE_URL = 'https://e-arsipalhicam.vercel.app';
const LOCAL_FILE = path.join(__dirname, '../dist/index.html');

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: 'Tentang E-Arsip Al-Hikam' },
        { type: 'separator' },
        { role: 'services', label: 'Layanan' },
        { type: 'separator' },
        { role: 'hide', label: 'Sembunyikan' },
        { role: 'hideOthers', label: 'Sembunyikan Lainnya' },
        { role: 'unhide', label: 'Tampilkan Semua' },
        { type: 'separator' },
        { role: 'quit', label: 'Keluar' }
      ]
    }] : []),
    {
      label: 'Berkas',
      submenu: [
        {
          label: 'Buka Folder Unduhan',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            shell.openPath(app.getPath('downloads'));
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'Tutup Jendela' } : { role: 'quit', label: 'Keluar' }
      ]
    },
    {
      label: 'Tampilan',
      submenu: [
        { role: 'reload', label: 'Muat Ulang Halaman' },
        { role: 'forceReload', label: 'Muat Ulang Paksa (Bersihkan Cache)' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Ukuran Normal (100%)' },
        { role: 'zoomIn', label: 'Perbesar' },
        { role: 'zoomOut', label: 'Perkecil' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Layar Penuh' }
      ]
    },
    {
      label: 'Bantuan',
      submenu: [
        {
          label: 'Buka di Browser Web',
          click: () => {
            shell.openExternal(ONLINE_URL);
          }
        },
        { type: 'separator' },
        {
          label: 'Tentang Aplikasi',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Tentang E-Arsip SMP Al-Hikam',
              message: 'E-Arsip Digital SMP Al-Hikam Sendang Mulyo',
              detail: 'Versi Desktop Windows 2.4.2\nSistem Manajemen Arsip Digital & Berkas Siswa/Guru.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const iconPath = path.join(__dirname, '../public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 980,
    minHeight: 650,
    center: true,
    title: 'E-Arsip Digital SMP Al-Hikam',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    backgroundColor: '#080E21',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  createApplicationMenu();

  // Tampilkan jendela setelah siap agar tidak ada flickering putih
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Hubungkan ke Cloud Production URL, fallback ke local dist jika offline
  mainWindow.loadURL(ONLINE_URL).catch((err) => {
    console.warn('Gagal memuat URL Online, beralih ke file lokal:', err?.message);
    if (fs.existsSync(LOCAL_FILE)) {
      mainWindow.loadFile(LOCAL_FILE);
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode !== -3 && fs.existsSync(LOCAL_FILE)) {
      mainWindow.loadFile(LOCAL_FILE);
    }
  });

  // Tautan keluar (misal Google Drive, WhatsApp, Link eksternal) dibuka di browser default Windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes('e-arsipalhicam.vercel.app')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  // Penanganan Unduhan Berkas Otomatis langsung ke folder Download
  mainWindow.webContents.session.on('will-download', (event, item) => {
    const fileName = item.getFilename();
    const saveDirectory = app.getPath('downloads');
    const fullPath = path.join(saveDirectory, fileName);

    item.setSavePath(fullPath);

    item.once('done', (event, state) => {
      if (state === 'completed') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Unduhan Berhasil!',
            message: `Berkas "${fileName}" berhasil tersimpan.`,
            detail: `Lokasi penyimpanan: Folder Download (${fullPath})`,
            buttons: ['Buka Berkas', 'Buka Folder Download', 'Selesai'],
            defaultId: 0,
            cancelId: 2
          }).then(({ response }) => {
            if (response === 0) {
              shell.openPath(fullPath);
            } else if (response === 1) {
              shell.showItemInFolder(fullPath);
            }
          }).catch(() => {});
        }
      } else if (state === 'failed') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          dialog.showErrorBox(
            'Unduhan Gagal',
            `Terjadi kendala saat mengunduh berkas "${fileName}". Silakan periksa koneksi internet Anda.`
          );
        }
      }
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single Instance Lock: Hanya 1 jendela aplikasi yang terbuka
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
