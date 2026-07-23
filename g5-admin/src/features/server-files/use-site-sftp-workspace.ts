import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { SftpDirectoryEntry } from "../../types/SftpDirectoryEntry";
import {
  normalizeSiteSftpEditorPath,
  SITE_SFTP_EDITOR_PATH_PARAM,
} from "./site-sftp-editor-path";
import { useSiteSftpBrowser } from "./use-site-sftp-browser";
import { useSiteSftpDirectoryTree } from "./use-site-sftp-directory-tree";
import { useSiteSftpEditor } from "./use-site-sftp-editor";
import { useSiteSftpTransferWorkspace } from "./use-site-sftp-transfer-workspace";

/* eslint-disable react-hooks/set-state-in-effect -- Remote directory responses intentionally rehydrate the editable path and selection state. */

export function useSiteSftpWorkspace(
  siteId: string | null,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const [searchParams, setSearchParams] = useSearchParams();
  const [browsePath, setBrowsePath] = useState(".");
  const browser = useSiteSftpBrowser(siteId, browsePath, { enabled });
  const [inspectingPath, setInspectingPath] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState(() => browser.directory?.resolved_path ?? browsePath);
  const [previewingPath, setPreviewingPath] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<SftpDirectoryEntry | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<SftpDirectoryEntry[]>([]);
  const [selectionAnchorPath, setSelectionAnchorPath] = useState<string | null>(null);
  const selectedEditorPath = normalizeSiteSftpEditorPath(
    searchParams.get(SITE_SFTP_EDITOR_PATH_PARAM),
  );
  const editor = useSiteSftpEditor(siteId, selectedEditorPath, { enabled });
  const directoryTree = useSiteSftpDirectoryTree({
    currentDirectory: browser.directory ?? null,
    siteId,
  });

  useEffect(() => {
    if (browser.directory) {
      setPathInput(browser.directory.resolved_path);
    }
  }, [browser.directory]);

  useEffect(() => {
    if (!browser.directory || !selectedEntry) {
      return;
    }

    const nextSelectedEntry =
      browser.directory.entries.find((entry) => entry.path === selectedEntry.path) ?? null;
    if (!nextSelectedEntry) {
      setSelectedEntry(null);
      return;
    }

    if (nextSelectedEntry !== selectedEntry) {
      setSelectedEntry(nextSelectedEntry);
    }
  }, [browser.directory, selectedEntry]);

  useEffect(() => {
    if (!browser.directory) {
      setSelectedEntries([]);
      setSelectionAnchorPath(null);
      return;
    }

    const directoryEntries = browser.directory.entries;

    setSelectedEntries((current) =>
      current.flatMap((entry) => {
        const nextSelectedEntry =
          directoryEntries.find((candidate) => candidate.path === entry.path) ?? null;
        return nextSelectedEntry ? [nextSelectedEntry] : [];
      }),
    );
    setSelectionAnchorPath((current) => {
      if (!current) {
        return null;
      }

      return directoryEntries.some((entry) => entry.path === current) ? current : null;
    });
  }, [browser.directory]);

  function updateEditorPath(path: string | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (path) {
        next.set(SITE_SFTP_EDITOR_PATH_PARAM, path);
      } else {
        next.delete(SITE_SFTP_EDITOR_PATH_PARAM);
      }
      return next;
    });
  }

  async function handleInspect(path: string) {
    if (!siteId) {
      return;
    }

    setInspectingPath(path);
    try {
      await browser.stat({
        path,
        site_id: siteId,
      });
    } finally {
      setInspectingPath(null);
    }
  }

  async function handlePreview(path: string) {
    if (!siteId) {
      return;
    }

    setPreviewingPath(path);
    try {
      await browser.readFile({
        path,
        site_id: siteId,
      });
    } finally {
      setPreviewingPath(null);
    }
  }

  function handleBrowse(path: string) {
    const normalized = path.trim() || ".";
    setPathInput(normalized);
    setBrowsePath(normalized);
  }

  function handleOpenDirectory(path: string) {
    setSelectedEntry(null);
    setSelectedEntries([]);
    setSelectionAnchorPath(null);
    updateEditorPath(null);
    handleBrowse(path);
  }

  function handleOpenEditor(path: string) {
    updateEditorPath(path);
    const matchingEntry =
      browser.directory?.entries.find((entry) => entry.path === path) ?? null;
    setSelectedEntry(matchingEntry);
    setSelectedEntries(matchingEntry ? [matchingEntry] : []);
    setSelectionAnchorPath(matchingEntry?.path ?? null);
    void handleInspect(path);
  }

  function handleCloseEditor() {
    updateEditorPath(null);
  }

  function handleSelectEntry(
    entry: SftpDirectoryEntry,
    options?: {
      mode?: "replace" | "toggle" | "range";
    },
  ) {
    const mode = options?.mode ?? "replace";
    const directoryEntries = browser.directory?.entries ?? [];

    if (mode === "range" && directoryEntries.length > 0) {
      const anchorPath = selectionAnchorPath ?? selectedEntry?.path ?? entry.path;
      const anchorIndex = directoryEntries.findIndex(
        (candidate) => candidate.path === anchorPath,
      );
      const targetIndex = directoryEntries.findIndex(
        (candidate) => candidate.path === entry.path,
      );

      if (anchorIndex !== -1 && targetIndex !== -1) {
        const start = Math.min(anchorIndex, targetIndex);
        const end = Math.max(anchorIndex, targetIndex);
        setSelectedEntry(entry);
        setSelectedEntries(directoryEntries.slice(start, end + 1));
        setSelectionAnchorPath(anchorPath);
        void handleInspect(entry.path);
        return;
      }
    }

    if (mode === "toggle") {
      const isAlreadySelected = selectedEntries.some(
        (candidate) => candidate.path === entry.path,
      );

      if (isAlreadySelected) {
        const nextSelectedEntries = selectedEntries.filter(
          (candidate) => candidate.path !== entry.path,
        );
        setSelectedEntries(nextSelectedEntries);
        if (selectedEntry?.path === entry.path) {
          setSelectedEntry(
            nextSelectedEntries.length > 0
              ? nextSelectedEntries[nextSelectedEntries.length - 1]
              : null,
          );
        }
        setSelectionAnchorPath(entry.path);
        return;
      }

      setSelectedEntry(entry);
      setSelectedEntries([...selectedEntries, entry]);
      setSelectionAnchorPath(entry.path);
      void handleInspect(entry.path);
      return;
    }

    setSelectedEntry(entry);
    setSelectedEntries([entry]);
    setSelectionAnchorPath(entry.path);
    void handleInspect(entry.path);
  }

  function handleSelectRelativeEntry(offset: number) {
    const entries = browser.directory?.entries ?? [];
    if (entries.length === 0) {
      return;
    }

    const currentIndex =
      selectedEntry === null
        ? -1
        : entries.findIndex((entry) => entry.path === selectedEntry.path);
    const fallbackIndex = offset >= 0 ? 0 : entries.length - 1;
    const nextIndex =
      currentIndex === -1
        ? fallbackIndex
        : Math.max(0, Math.min(entries.length - 1, currentIndex + offset));

    handleSelectEntry(entries[nextIndex]);
  }

  function handleSelectBoundaryEntry(boundary: "first" | "last") {
    const entries = browser.directory?.entries ?? [];
    if (entries.length === 0) {
      return;
    }

    handleSelectEntry(boundary === "first" ? entries[0] : entries[entries.length - 1]);
  }

  function handleToggleEntrySelection(entry: SftpDirectoryEntry, checked: boolean) {
    setSelectedEntries((current) => {
      if (checked) {
        if (current.some((candidate) => candidate.path === entry.path)) {
          return current;
        }
        return [...current, entry];
      }

      return current.filter((candidate) => candidate.path !== entry.path);
    });

    if (checked) {
      setSelectionAnchorPath(entry.path);
      return;
    }
  }

  function handleSelectAllEntries() {
    const nextSelectedEntries = browser.directory?.entries ?? [];
    setSelectedEntries(nextSelectedEntries);
    setSelectionAnchorPath(nextSelectedEntries.length > 0 ? nextSelectedEntries[0].path : null);
  }

  function handleClearSelection() {
    setSelectedEntries([]);
    setSelectionAnchorPath(null);
  }

  const transfers = useSiteSftpTransferWorkspace({
    browser,
    browsePath,
    directoryTree,
    editor,
    enabled,
    onInspect: handleInspect,
    selectedEditorPath,
    selectedEntry,
    setSelectedEntries,
    setSelectedEntry,
    siteId,
    updateEditorPath,
  });

  const activeOperationPath =
    transfers.pathOperationState?.entries[0]?.path ??
    transfers.permissionsState?.entry.path ??
    transfers.deletingPath;
  const previewResponse =
    browser.readFileResponse &&
    !transfers.hiddenDeletedPaths.includes(browser.readFileResponse.resolved_path)
      ? browser.readFileResponse
      : null;
  const selectedPath = selectedEntry?.path ?? selectedEditorPath ?? null;
  const selectedDirectoryPath =
    selectedEntry?.metadata.kind === "directory"
      ? selectedEntry.path
      : browser.directory?.resolved_path ?? null;
  const selectedPaths = selectedEntries.map((entry) => entry.path);
  const allDirectoryEntriesSelected =
    browser.directory !== undefined &&
    browser.directory !== null &&
    browser.directory.entries.length > 0 &&
    browser.directory.entries.every((entry) => selectedPaths.includes(entry.path));
  const statResponse =
    browser.statResponse && !transfers.hiddenDeletedPaths.includes(browser.statResponse.resolved_path)
      ? browser.statResponse
      : null;

  return {
    activeOperationPath,
    browser,
    browsePath,
    deleteCandidates: transfers.deleteCandidates,
    deletingPath: transfers.deletingPath,
    directoryTree,
    downloadingPath: transfers.downloadingPath,
    editor,
    handleBrowse,
    handleCloseEditor,
    handleCreateDirectory: transfers.handleCreateDirectory,
    handleDelete: transfers.handleDelete,
    handleDownload: transfers.handleDownload,
    handleEditorSave: transfers.handleEditorSave,
    handleInspect,
    handleOpenDirectory,
    handleOpenEditor,
    handleClearSelection,
    handleDownloadEntries: transfers.handleDownloadEntries,
    handlePrepareCopyEntries: transfers.handlePrepareCopyEntries,
    handlePrepareDeleteEntries: transfers.handlePrepareDeleteEntries,
    handlePrepareMoveEntries: transfers.handlePrepareMoveEntries,
    handlePrepareCopy: transfers.handlePrepareCopy,
    handlePrepareMove: transfers.handlePrepareMove,
    handlePreparePermissions: transfers.handlePreparePermissions,
    handlePreview,
    handlePreviewSave: transfers.handlePreviewSave,
    handleSelectEntry,
    handleSelectAllEntries,
    handleSelectBoundaryEntry,
    handleToggleEntrySelection,
    handleSelectRelativeEntry,
    handleSubmitPathOperation: transfers.handleSubmitPathOperation,
    handleSubmitPermissions: transfers.handleSubmitPermissions,
    handleUpload: transfers.handleUpload,
    handleUploadPaths: transfers.handleUploadPaths,
    hiddenDeletedPaths: transfers.hiddenDeletedPaths,
    inspectingPath,
    mkdirName: transfers.mkdirName,
    pathInput,
    pathOperationState: transfers.pathOperationState,
    permissionsState: transfers.permissionsState,
    previewResponse,
    previewingPath,
    selectedEntry,
    selectedEntries,
    selectedDirectoryPath,
    selectedEditorPath,
    selectedPath,
    selectedPaths,
    allDirectoryEntriesSelected,
    siteId,
    setDeleteCandidates: transfers.setDeleteCandidates,
    setMkdirName: transfers.setMkdirName,
    setPathInput,
    setPathOperationState: transfers.setPathOperationState,
    setPermissionsState: transfers.setPermissionsState,
    statResponse,
    transferQueuePending: transfers.transferQueuePending,
    transferQueueMutationPending: transfers.transferQueueMutationPending,
    transferQueueConcurrencyPending: transfers.transferQueueConcurrencyPending,
    transferQueuePause: transfers.transferQueuePause,
    transferQueueRetry: transfers.transferQueueRetry,
    transferQueueCancel: transfers.transferQueueCancel,
    transferQueueSetConcurrency: transfers.transferQueueSetConcurrency,
    transferSnapshot: transfers.transferSnapshot,
    uploadQueue: transfers.uploadQueue,
    uploadingSourcePath: transfers.uploadingSourcePath,
  };
}

export type SiteSftpWorkspace = ReturnType<typeof useSiteSftpWorkspace>;
