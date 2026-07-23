import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

fs.mkdirSync(path.resolve(__dirname, "./coverage-critical/.tmp"), {
  recursive: true,
});

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage-critical",
      include: [
        "src/features/**/*-form.ts",
        "src/features/admin/shared/**/*.{ts,tsx}",
        "src/features/shared/**/*.{ts,tsx}",
        "src/features/layout/PageIntro.tsx",
        "src/features/layout/AppShell.tsx",
        "src/features/layout/AppShellHeader.tsx",
        "src/features/layout/AppShellSidebar.tsx",
        "src/features/layout/AppShellWorkspaceTabs.tsx",
        "src/features/layout/app-shell-context-menu.ts",
        "src/features/layout/navigation.ts",
        "src/features/layout/useHeaderVisibility.ts",
        "src/features/board-groups/AdminBoardGroupsPage.tsx",
        "src/features/contents/AdminContentsPage.tsx",
        "src/features/members/MemberDetailCard.tsx",
        "src/debug/**/*.{ts,tsx}",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "tests/**/*.test.ts",
        "tests/**/*.test.tsx",
      ],
      thresholds: {
        statements: 84,
        branches: 75,
        functions: 80,
        lines: 84,
      },
    },
  },
});
