import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Smart Closet',
  slug: 'smart-closet',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    backgroundColor: '#0D0D0D',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.yourname.smartcloset',
  },
  plugins: [
    'expo-router',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Smart Closet to access your photos to upload clothing items.',
        cameraPermission: 'Allow Smart Closet to use the camera to photograph clothing items.',
      },
    ],
  ],
  scheme: 'smart-closet',
});
