
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png"
      ],
      manifest: {
        name: "ProofMint",
        short_name: "ProofMint",
        theme_color: "#0f172a",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        description: "Tamper-proof verification for gig workers",
        icons: [
          {
            src: "pwa-192x192.png",
            type: "image/png",
            sizes: "192x192"
          },
          {
            src: "pwa-512x512.png",
            type: "image/png",
            sizes: "512x512"
          },
          {
            src: "pwa-512x512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "any maskable"
          }
        ]
      }
    })
  ]
});
