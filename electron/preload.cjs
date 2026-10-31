const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  isElectron: true,
  platform: process.platform,
  version: '2.4.2'
});
