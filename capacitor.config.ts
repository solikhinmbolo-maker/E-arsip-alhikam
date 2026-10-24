import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alhikam.earsip',
  appName: 'E-Arsip Alhicam',
  webDir: 'dist',
  backgroundColor: '#080E21',
  server: {
    url: 'https://e-arsipalhicam.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#080E21',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
