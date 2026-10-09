import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alhikam.earsip',
  appName: 'E-Arsip SMP Al-Hikam',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
