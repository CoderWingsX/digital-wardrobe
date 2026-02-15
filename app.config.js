import "dotenv/config";

export default ({ config }) => ({
  ...config,
  owner: "coderwings",
  name: "digital-wardrobe",
  slug: "digital-wardrobe",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.coderwings.digitalwardrobe",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: false,
    predictiveBackGestureEnabled: false,
    permissions: ["android.permission.RECORD_AUDIO"],
    package: "com.coderwings.digitalwardrobe",
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  platforms: ["ios", "android"],
  plugins: [
    "expo-sqlite",
    [
      "expo-image-picker",
      {
        photosPermission:
          "The app accesses your photos to let you choose items for your wardrobe.",
        cameraPermission:
          "The app accesses your camera to let you take photos of your wardrobe items.",
      },
    ],
  ],
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: process.env.EAS_UPDATES_URL,
    requestHeaders: {
      "expo-channel-name": "preview",
    },
  },
});
