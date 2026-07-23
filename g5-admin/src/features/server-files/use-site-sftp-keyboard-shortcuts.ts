import { useEffect } from "react";
import { isSftpEditableTextPath } from "./site-sftp-editability";
import type { SiteSftpWorkspace } from "./use-site-sftp-workspace";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

export function useSiteSftpKeyboardShortcuts(params: {
  connected: boolean;
  workspace: SiteSftpWorkspace;
}) {
  const { connected, workspace } = params;

  useEffect(() => {
    if (!connected) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target)) {
        return;
      }

      if (
        workspace.pathOperationState ||
        workspace.permissionsState ||
        workspace.deleteCandidates.length > 0 ||
        workspace.selectedEditorPath !== null
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "a") {
        if ((workspace.browser.directory?.entries.length ?? 0) === 0) {
          return;
        }

        event.preventDefault();
        workspace.handleSelectAllEntries();
        return;
      }

      if (key === "escape") {
        if (workspace.selectedEntries.length === 0) {
          return;
        }

        event.preventDefault();
        workspace.handleClearSelection();
        return;
      }

      if (key === "delete" || key === "backspace") {
        if (workspace.selectedEntries.length === 0) {
          return;
        }

        event.preventDefault();
        workspace.handlePrepareDeleteEntries(workspace.selectedEntries);
        return;
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        if (key === "arrowdown") {
          event.preventDefault();
          workspace.handleSelectRelativeEntry(1);
          return;
        }

        if (key === "arrowup") {
          event.preventDefault();
          workspace.handleSelectRelativeEntry(-1);
          return;
        }

        if (key === "home") {
          event.preventDefault();
          workspace.handleSelectBoundaryEntry("first");
          return;
        }

        if (key === "end") {
          event.preventDefault();
          workspace.handleSelectBoundaryEntry("last");
          return;
        }
      }

      if (key !== "enter" || workspace.selectedEntry === null) {
        return;
      }

      event.preventDefault();
      if (workspace.selectedEntry.metadata.kind === "directory") {
        workspace.handleOpenDirectory(workspace.selectedEntry.path);
        return;
      }

      if (isSftpEditableTextPath(workspace.selectedEntry.path)) {
        workspace.handleOpenEditor(workspace.selectedEntry.path);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [connected, workspace]);
}
