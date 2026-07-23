import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.split(path.sep).join("/");

          const featureChunk = resolveFeatureChunk(normalizedId);
          if (featureChunk) {
            return featureChunk;
          }

          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@tanstack")) {
            return "tanstack";
          }

          return resolveVendorChunk(normalizedId);
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));

function resolveFeatureChunk(id: string) {
  const featureMatch = id.match(/\/src\/features\/([^/]+)\/[^/]+Page\.tsx$/);
  if (!featureMatch) {
    return undefined;
  }

  const feature = featureMatch[1];

  if (
    [
      "layout",
      "auth",
      "master",
      "sites",
      "onboarding",
      "overview",
      "security",
      "status",
    ].includes(feature)
  ) {
    return undefined;
  }

  if (
    [
      "config",
      "maintenance",
      "mail-test",
      "menus",
      "permissions",
      "security",
      "system",
      "system-tools",
      "theme",
    ].includes(feature)
  ) {
    return "feature-admin";
  }

  if (
    ["board-groups", "boards", "contents", "faqs", "popular", "qa-config", "write-count"].includes(
      feature,
    )
  ) {
    return "feature-admin";
  }

  if (
    ["mails", "members", "points", "polls", "visits"].includes(feature)
  ) {
    return "feature-admin";
  }

  if (
    ["sms-contacts", "sms-history", "sms-messages", "sms-templates"].includes(feature)
  ) {
    return "feature-sms";
  }

  if (["layouts", "push", "reports"].includes(feature)) {
    return "feature-tools";
  }

  return `feature-${feature}`;
}

function resolveVendorChunk(id: string) {
  if (
    id.includes("/node_modules/react/")
    || id.includes("/node_modules/react-dom/")
    || id.includes("/node_modules/react-router/")
    || id.includes("/node_modules/react-router-dom/")
    || id.includes("/node_modules/scheduler/")
  ) {
    return "vendor-react";
  }

  if (
    id.includes("/node_modules/@tauri-apps/")
  ) {
    return "vendor-tauri";
  }

  if (
    id.includes("/node_modules/react-hook-form/")
    || id.includes("/node_modules/@hookform/")
    || id.includes("/node_modules/zod/")
  ) {
    return "vendor-form";
  }

  if (
    id.includes("/node_modules/@monaco-editor/")
    || id.includes("/node_modules/monaco-editor/")
  ) {
    return resolveMonacoChunk(id);
  }

  if (
    id.includes("/node_modules/xterm/")
    || id.includes("/node_modules/@xterm/")
  ) {
    return "vendor-terminal";
  }

  if (
    id.includes("/node_modules/lucide-react/")
    || id.includes("/node_modules/qrcode.react/")
  ) {
    return "vendor-media";
  }

  if (
    id.includes("/node_modules/@radix-ui/")
    || id.includes("/node_modules/radix-ui/")
    || id.includes("/node_modules/class-variance-authority/")
    || id.includes("/node_modules/clsx/")
    || id.includes("/node_modules/tailwind-merge/")
    || id.includes("/node_modules/tw-animate-css/")
    || id.includes("/node_modules/vaul/")
    || id.includes("/node_modules/sonner/")
  ) {
    return "vendor-ui";
  }

  return "vendor";
}

function resolveMonacoChunk(id: string) {
  if (id.includes("/node_modules/@monaco-editor/")) {
    return "vendor-editor-react";
  }

  if (id.includes("/node_modules/monaco-editor/esm/vs/basic-languages/")) {
    return "vendor-editor-languages";
  }

  if (id.includes("/node_modules/monaco-editor/esm/vs/language/json/")) {
    return "vendor-editor-json";
  }

  return "vendor-editor-core";
}
