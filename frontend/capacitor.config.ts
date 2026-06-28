import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.villagemart.app',
  appName: 'VillageMart',
  webDir: 'dist/client',
  plugins: {
    GoogleSignIn: {
      // Native Android container requires the global WEB Client ID to handle backend verification
      clientId: '841907471689-a0eimqhk3pej66queq8c3ufkijgl5vin.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;
