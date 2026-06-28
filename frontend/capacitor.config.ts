import type { CapacitorConfig } from '@capacitor/cli';
import * as dotenv from 'dotenv';

// Load .env file (useful for local syncs)
dotenv.config();

const config: CapacitorConfig = {
  appId: 'com.villagemart.app',
  appName: 'VillageMart',
  webDir: 'dist/client',
  plugins: {
    GoogleSignIn: {
      clientId: process.env.VITE_GOOGLE_WEB_CLIENT_ID || '',
      forceCodeForRefreshToken: true,
    }
  }
};

export default config;

