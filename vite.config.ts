/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  // relative base so the build works from any path (GitHub Pages project subpath,
  // Vercel/Netlify root, or a local file preview) without host-specific config.
  base: "./",
  plugins: [react()],
  test: {
    // Core algorithm tests are pure logic — no DOM needed.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
