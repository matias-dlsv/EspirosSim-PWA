import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "EspirometriApp",
        short_name: "EspirometriApp",
        description:
          "Simulador de espirometría con curvas de flujo-volumen y cálculo de índices GLI-2012 por paciente.",
        theme_color: "#1a7ba8",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "es",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // El cascarón de la app + la tabla de referencia GLI-2012 (504KB,
        // se necesita en cada cálculo) se precachean con hash de
        // contenido: cero peticiones de red después de instalados, y se
        // refrescan solas si cambia el contenido en un nuevo deploy.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,xls}"],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
