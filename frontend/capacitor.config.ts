import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.posapp.app',
  appName: 'POSAPP',
  webDir: 'out',
  server: {
    androidScheme: 'https' // Next.js and its absolute paths work better with a virtual origin
  }
};

export default config;
