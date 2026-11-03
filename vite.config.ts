import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  // File edits made by external tools must also invalidate the long-lived demo server.
  server: { watch: { usePolling: true, interval: 200 } },
});
