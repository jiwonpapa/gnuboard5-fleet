import { useEffect, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { toast } from "sonner";

export function useSiteSftpDropUpload(args: {
  enabled: boolean;
  onDropPaths: (paths: string[]) => Promise<void> | void;
}) {
  const { enabled, onDropPaths } = args;
  const [dragActive, setDragActive] = useState(false);
  const dragDropEnabled = enabled && isTauri();

  useEffect(() => {
    if (!dragDropEnabled) {
      return;
    }

    let disposed = false;
    let unlisten: (() => void) | null = null;

    let appWindow;
    try {
      appWindow = getCurrentWindow();
    } catch {
      return;
    }

    void appWindow
      .onDragDropEvent(async (event) => {
        if (disposed) {
          return;
        }

        if (event.payload.type === "enter" || event.payload.type === "over") {
          setDragActive(true);
          return;
        }

        if (event.payload.type === "leave") {
          setDragActive(false);
          return;
        }

        setDragActive(false);
        if (event.payload.paths.length === 0) {
          return;
        }

        try {
          await onDropPaths(event.payload.paths);
        } catch {
          toast.error("드래그한 파일 업로드 중 오류가 발생했습니다.");
        }
      })
      .then((nextUnlisten) => {
        if (disposed) {
          nextUnlisten();
          return;
        }
        unlisten = nextUnlisten;
      })
      .catch(() => {
        setDragActive(false);
      });

    return () => {
      disposed = true;
      setDragActive(false);
      unlisten?.();
    };
  }, [dragDropEnabled, onDropPaths]);

  return {
    dragActive: dragDropEnabled ? dragActive : false,
  };
}
