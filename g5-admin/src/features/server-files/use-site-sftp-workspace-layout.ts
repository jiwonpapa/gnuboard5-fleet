import { useMemo } from "react";

export type SiteSftpViewportMode = "compact" | "standard" | "tall";
export type SiteSftpFontScale = "sm" | "md" | "lg";

const DEFAULT_ROOT_LAYOUT = {
  "sftp-main": 80,
  "sftp-nav": 20,
} as const;

const DEFAULT_MAIN_LAYOUT = {
  "sftp-list": 86,
  "sftp-queue": 14,
} as const;

const DEFAULT_VIEWPORT_MODE: SiteSftpViewportMode = "standard";
const DEFAULT_FONT_SCALE: SiteSftpFontScale = "md";

function readViewportMode(storageKey: string): SiteSftpViewportMode {
  if (typeof window === "undefined") {
    return DEFAULT_VIEWPORT_MODE;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (raw === "compact" || raw === "standard" || raw === "tall") {
    return raw;
  }

  return DEFAULT_VIEWPORT_MODE;
}

function readFontScale(storageKey: string): SiteSftpFontScale {
  if (typeof window === "undefined") {
    return DEFAULT_FONT_SCALE;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (raw === "sm" || raw === "md" || raw === "lg") {
    return raw;
  }

  return DEFAULT_FONT_SCALE;
}

function readStoredLayout<T extends Record<string, number>>(storageKey: string, fallback: T): T {
  if (typeof window === "undefined") {
    return { ...fallback };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return { ...fallback };
    }
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Object.keys(fallback).some((key) => {
        const value = parsed[key];
        return typeof value !== "number" || Number.isNaN(value);
      })
    ) {
      return { ...fallback };
    }
    return parsed as T;
  } catch {
    return { ...fallback };
  }
}

function writeStoredLayout(storageKey: string, layout: Record<string, number>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(layout));
}

export function useSiteSftpWorkspaceLayout(siteId: string | null) {
  const siteScope = siteId ?? "detached";
  const rootStorageKey = `g5-admin:sftp-layout:${siteScope}:root`;
  const mainStorageKey = `g5-admin:sftp-layout:${siteScope}:main`;
  const viewportStorageKey = `g5-admin:sftp-layout:${siteScope}:viewport`;
  const fontScaleStorageKey = `g5-admin:sftp-layout:${siteScope}:font`;

  return useMemo(
    () => ({
      defaultFontScale: readFontScale(fontScaleStorageKey),
      defaultMainLayout: readStoredLayout(mainStorageKey, DEFAULT_MAIN_LAYOUT),
      defaultRootLayout: readStoredLayout(rootStorageKey, DEFAULT_ROOT_LAYOUT),
      defaultViewportMode: readViewportMode(viewportStorageKey),
      persistFontScale: (scale: SiteSftpFontScale) => {
        if (typeof window === "undefined") {
          return;
        }
        window.localStorage.setItem(fontScaleStorageKey, scale);
      },
      persistMainLayout: (layout: Record<string, number>) =>
        writeStoredLayout(mainStorageKey, layout),
      persistRootLayout: (layout: Record<string, number>) =>
        writeStoredLayout(rootStorageKey, layout),
      persistViewportMode: (mode: SiteSftpViewportMode) => {
        if (typeof window === "undefined") {
          return;
        }
        window.localStorage.setItem(viewportStorageKey, mode);
      },
    }),
    [fontScaleStorageKey, mainStorageKey, rootStorageKey, viewportStorageKey],
  );
}
