import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
      ],
      manifest: {
        name: "EWS Psychologie Lernstudio",
        short_name: "EWS Studio",
        description: "Adaptives EWS-Psychologie Lernstudio für Grundschule Bayern (PC & iPhone Offline-PWA)",
        theme_color: "#222933",
        background_color: "#f6f5f1",
        display: "standalone",
        orientation: "any",
        start_url: "./",
        scope: "./",
        lang: "de",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json,woff2}"],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallbackDenylist: [/\/exports\//, /\.(docx|pdf|apkg|ics|url|json|mp3|wav)$/i],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@content": path.resolve(__dirname, "./content"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.{js,jsx}"],
  },
});
