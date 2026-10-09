import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alhikam.earsip',
  appName: 'E-Arsip Alhicam',
  webDir: 'dist',
  server: {
    url: 'https://e-arsipalhicam.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
