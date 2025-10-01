import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'vn.nhienvin.entervn',
  appName: 'enterVN',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: { androidScheme: 'https' } // tránh mixed content trên Android
};

export default config;
