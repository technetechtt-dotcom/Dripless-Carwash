import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dripless.customer',
  appName: 'Dripless Customer',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
