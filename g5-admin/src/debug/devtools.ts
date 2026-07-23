import { isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { openDebugDevtools } from "../api/client";

let openRequest: Promise<string> | null = null;

export async function openDesktopDevtools() {
  if (!isTauri()) {
    return "browser";
  }

  if (openRequest) {
    return openRequest;
  }

  openRequest = openDebugDevtools().finally(() => {
    openRequest = null;
  });

  return openRequest;
}

export function isDesktopDevtoolsShortcut(
  event: Pick<
    KeyboardEvent,
    "altKey" | "ctrlKey" | "key" | "metaKey" | "repeat" | "shiftKey"
  >,
) {
  if (event.repeat) {
    return false;
  }

  const key = event.key.toLowerCase();
  if (key === "f11" || key === "f12") {
    return true;
  }

  if ((event.metaKey || event.ctrlKey) && event.altKey && key === "i") {
    return true;
  }

  if (event.ctrlKey && event.shiftKey && key === "i") {
    return true;
  }

  return false;
}

export function useDesktopDevtoolsHotkey(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isDesktopDevtoolsShortcut(event)) {
        return;
      }

      event.preventDefault();
      void openDesktopDevtools();
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [enabled]);
}
