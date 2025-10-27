import 'dotenv/config';

export default {
  expo: {
    name: "note-app",
    slug: "note-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anonymous.noteapp",
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSExceptionDomains: {
            "192.168.0.34": {
              NSIncludesSubdomains: true,
              NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
              NSTemporaryExceptionMinimumTLSVersion: "TLSv1.0",
            },
          },
        },
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.anonymous.noteapp",
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    // ✅ plugins 배열 올바른 구조
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "이미지 업로드 기능을 위해 사진 접근 권한이 필요합니다.",
          cameraPermission: "사진을 직접 촬영하려면 카메라 접근 권한이 필요합니다.",
        },
      ],
    ],

    experiments: { typedRoutes: true },

    extra: {
      openaiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    },
  },
};
