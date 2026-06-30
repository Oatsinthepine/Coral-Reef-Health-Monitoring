import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages serves this project from /Coral-Reef-Health-Monitoring/.
  // Vite uses this base path when generating production asset URLs.
  base: "/Coral-Reef-Health-Monitoring/",
  root: ".",
  publicDir: "public",
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
