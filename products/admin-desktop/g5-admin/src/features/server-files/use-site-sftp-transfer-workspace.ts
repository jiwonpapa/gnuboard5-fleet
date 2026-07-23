import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SftpDirectoryEntry } from "../../types/SftpDirectoryEntry";
import type { SftpTransferDirection } from "../../types/SftpTransferDirection";
import {
  buildLocalChildPath,
  buildSftpChildPath,
  buildSuggestedSftpCopyPath,
  getSftpParentPath,
  inferFileName,
  selectSftpDownloadDirectoryPath,
  selectSftpDownloadDestination,
  selectSftpUploadSourcePaths,
} from "./site-sftp-browser-helpers";
import { formatSftpEntryKind } from "./site-sftp-entry-kind";
import type { useSiteSftpBrowser } from "./use-site-sftp-browser";
import type { useSiteSftpDirectoryTree } from "./use-site-sftp-directory-tree";
import type { useSiteSftpEditor } from "./use-site-sftp-editor";
import { useSiteSftpTransferQueue } from "./use-site-sftp-transfer-queue";

type SiteSftpBrowserController = ReturnType<typeof useSiteSftpBrowser>;
type SiteSftpDirectoryTreeController = ReturnType<typeof useSiteSftpDirectoryTree>;
type SiteSftpEditorController = ReturnType<typeof useSiteSftpEditor>;

type PathOperationState =
  | {
      destinationPath: string;
      entries: SftpDirectoryEntry[];
      mode: "copy" | "move";
    }
  | null;

type PermissionsState =
  | {
      entry: SftpDirectoryEntry;
      permissions: string;
    }
  | null;

export function useSiteSftpTransferWorkspace(params: {
  browser: SiteSftpBrowserController;
  browsePath: string;
  directoryTree: SiteSftpDirectoryTreeController;
  editor: SiteSftpEditorController;
  enabled?: boolean;
  onInspect: (path: string) => Promise<void>;
  selectedEditorPath: string | null;
  selectedEntry: SftpDirectoryEntry | null;
  setSelectedEntries: Dispatch<SetStateAction<SftpDirectoryEntry[]>>;
  setSelectedEntry: Dispatch<SetStateAction<SftpDirectoryEntry | null>>;
  siteId: string | null;
  updateEditorPath: (path: string | null) => void;
}) {
  const [deleteCandidates, setDeleteCandidates] = useState<SftpDirectoryEntry[]>([]);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [hiddenDeletedPaths, setHiddenDeletedPaths] = useState<string[]>([]);
  const [mkdirName, setMkdirName] = useState("");
  const [pathOperationState, setPathOperationState] = useState<PathOperationState>(null);
  const [permissionsState, setPermissionsState] = useState<PermissionsState>(null);
  const directoryRefreshTimerRef = useRef<number | null>(null);
  const transferQueue = useSiteSftpTransferQueue(params.siteId, {
    enabled: params.enabled,
    onItemSucceeded(item) {
      if (item.direction !== "upload") {
        return;
      }
      if (directoryRefreshTimerRef.current !== null) {
        window.clearTimeout(directoryRefreshTimerRef.current);
      }
      directoryRefreshTimerRef.current = window.setTimeout(() => {
        void params.browser.refetchDirectory();
        void params.directoryTree.loadDirectory(getSftpParentPath(item.destination_path));
      }, 120);
    },
  });

  useEffect(() => {
    return () => {
      if (directoryRefreshTimerRef.current !== null) {
        window.clearTimeout(directoryRefreshTimerRef.current);
      }
    };
  }, []);

  async function handleCreateDirectory() {
    if (!params.siteId) {
      return;
    }

    const response = await params.browser.mkdir({
      path: buildSftpChildPath(
        params.browser.directory?.resolved_path ?? params.browsePath,
        mkdirName,
      ),
      site_id: params.siteId,
    });
    setMkdirName("");
    await params.browser.refetchDirectory();
    void params.directoryTree.loadDirectory(getSftpParentPath(response.resolved_path));
    toast.success("SFTP 디렉터리 생성 완료", {
      description: response.resolved_path,
    });
  }

  async function handleDelete(recursive: boolean) {
    if (!params.siteId || deleteCandidates.length === 0) {
      return;
    }

    setDeletingPath(deleteCandidates[0]?.path ?? null);
    try {
      const deletedPaths: string[] = [];
      let deletedCount = 0;
      let containsDirectory = false;

      for (const candidate of deleteCandidates) {
        const response = await params.browser.deletePath({
          path: candidate.path,
          recursive,
          site_id: params.siteId,
        });
        deletedPaths.push(response.resolved_path);
        deletedCount += response.deleted_count;
        containsDirectory ||= response.kind === "directory";
      }

      setHiddenDeletedPaths(deletedPaths);
      if (
        params.selectedEditorPath &&
        deleteCandidates.some((candidate) => candidate.path === params.selectedEditorPath)
      ) {
        params.updateEditorPath(null);
      }
      if (
        params.selectedEntry &&
        deleteCandidates.some((candidate) => candidate.path === params.selectedEntry?.path)
      ) {
        params.setSelectedEntry(null);
      }
      params.setSelectedEntries((current) =>
        current.filter(
          (entry) => !deleteCandidates.some((candidate) => candidate.path === entry.path),
        ),
      );
      await params.browser.refetchDirectory();
      setHiddenDeletedPaths([]);
      toast.success("SFTP 항목 삭제 완료", {
        description:
          deleteCandidates.length > 1 || deletedCount > 1
            ? `${deleteCandidates.length.toLocaleString("ko-KR")}개 선택 항목, 총 ${deletedCount.toLocaleString("ko-KR")}개 엔트리 삭제`
            : `${formatSftpEntryKind(containsDirectory ? "directory" : "file")} ${deletedPaths[0]}`,
      });
    } finally {
      setDeletingPath(null);
      setDeleteCandidates([]);
    }
  }

  async function handleDownload(entry: SftpDirectoryEntry) {
    if (!params.siteId) {
      return;
    }

    const destinationPath = await selectSftpDownloadDestination(entry);
    if (!destinationPath) {
      return;
    }

    await transferQueue.enqueue({
      items: [
        {
          destination_path: destinationPath,
          direction: "download" satisfies SftpTransferDirection,
          label: entry.name,
          recursive: entry.metadata.kind === "directory",
          source_kind: entry.metadata.kind,
          source_path: entry.path,
        },
      ],
      site_id: params.siteId,
    });
    toast.success("SFTP 다운로드 큐 등록 완료", {
      description: `${entry.name} -> ${destinationPath}`,
    });
  }

  async function handleDownloadEntries(entries: SftpDirectoryEntry[]) {
    if (!params.siteId || entries.length === 0) {
      return;
    }

    if (entries.length === 1) {
      await handleDownload(entries[0]);
      return;
    }

    const destinationDirectory = await selectSftpDownloadDirectoryPath();
    if (!destinationDirectory) {
      return;
    }

    await transferQueue.enqueue({
      items: entries.map((entry) => ({
        destination_path: buildLocalChildPath(destinationDirectory, entry.name),
        direction: "download" satisfies SftpTransferDirection,
        label: entry.name,
        recursive: entry.metadata.kind === "directory",
        source_kind: entry.metadata.kind,
        source_path: entry.path,
      })),
      site_id: params.siteId,
    });
    toast.success("SFTP 다운로드 큐 등록 완료", {
      description: `${entries.length.toLocaleString("ko-KR")}개 항목 다운로드 예약`,
    });
  }

  async function handleEditorSave(content: string) {
    if (!params.siteId || !params.selectedEditorPath) {
      return;
    }

    const response = await params.editor.writeFile({
      content,
      path: params.selectedEditorPath,
      site_id: params.siteId,
    });
    await params.editor.refetchFile();
    await params.browser.refetchDirectory();
    void params.onInspect(response.resolved_path);
    toast.success("SFTP 편집 저장 완료", {
      description: `${response.resolved_path} (${response.byte_length.toLocaleString("ko-KR")} bytes)`,
    });
  }

  function handlePrepareCopy(entry: SftpDirectoryEntry) {
    params.setSelectedEntry(entry);
    params.setSelectedEntries([entry]);
    setPathOperationState({
      destinationPath: buildSuggestedSftpCopyPath(entry.path),
      entries: [entry],
      mode: "copy",
    });
  }

  function handlePrepareMove(entry: SftpDirectoryEntry) {
    params.setSelectedEntry(entry);
    params.setSelectedEntries([entry]);
    setPathOperationState({
      destinationPath: entry.path,
      entries: [entry],
      mode: "move",
    });
  }

  function handlePrepareCopyEntries(entries: SftpDirectoryEntry[]) {
    if (entries.length === 0) {
      return;
    }
    params.setSelectedEntries(entries);
    setPathOperationState({
      destinationPath:
        entries.length === 1
          ? buildSuggestedSftpCopyPath(entries[0].path)
          : "",
      entries,
      mode: "copy",
    });
  }

  function handlePrepareMoveEntries(entries: SftpDirectoryEntry[]) {
    if (entries.length === 0) {
      return;
    }
    params.setSelectedEntries(entries);
    setPathOperationState({
      destinationPath: entries.length === 1 ? entries[0].path : "",
      entries,
      mode: "move",
    });
  }

  function handlePrepareDeleteEntries(entries: SftpDirectoryEntry[]) {
    if (entries.length === 0) {
      return;
    }
    params.setSelectedEntries(entries);
    setDeleteCandidates(entries);
  }

  function handlePreparePermissions(entry: SftpDirectoryEntry) {
    params.setSelectedEntry(entry);
    setPermissionsState({
      entry,
      permissions:
        entry.metadata.permissions_octal ??
        (entry.metadata.kind === "directory" ? "755" : "644"),
    });
  }

  async function handlePreviewSave(path: string, content: string) {
    if (!params.siteId) {
      return;
    }

    const response = await params.browser.writeFile({
      content,
      path,
      site_id: params.siteId,
    });
    await params.browser.readFile({
      path,
      site_id: params.siteId,
    });
    await params.browser.refetchDirectory();
    void params.onInspect(response.resolved_path);
    toast.success("SFTP 파일 저장 완료", {
      description: `${response.resolved_path} (${response.byte_length.toLocaleString("ko-KR")} bytes)`,
    });
  }

  async function handleSubmitPathOperation() {
    if (!params.siteId || !pathOperationState) {
      return;
    }

    const destinationPath = pathOperationState.destinationPath.trim();
    const movingMany = pathOperationState.entries.length > 1;
    const sourceParentPaths = new Set(
      pathOperationState.entries.map((entry) => getSftpParentPath(entry.path)),
    );
    const destinationParentPath =
      movingMany || destinationPath.endsWith("/")
        ? destinationPath.replace(/\/+$/, "") || "/"
        : getSftpParentPath(destinationPath);

    try {
      const movedEntryPaths = new Map<string, string>();

      for (const entry of pathOperationState.entries) {
        const resolvedDestinationPath =
          pathOperationState.entries.length === 1
            ? destinationPath
            : buildSftpChildPath(destinationPath, entry.name);

        const input = {
          destination_path: resolvedDestinationPath,
          site_id: params.siteId,
          source_path: entry.path,
        };

        if (pathOperationState.mode === "copy") {
          await params.browser.copyPath(input);
        } else {
          const response = await params.browser.movePath(input);
          movedEntryPaths.set(entry.path, response.resolved_destination_path);
        }
      }

      if (pathOperationState.mode === "move") {
        if (params.selectedEditorPath) {
          const nextEditorPath = movedEntryPaths.get(params.selectedEditorPath) ?? null;
          if (nextEditorPath) {
            params.updateEditorPath(nextEditorPath);
          }
        }
        if (params.selectedEntry) {
          const nextSelectedPath = movedEntryPaths.get(params.selectedEntry.path);
          if (nextSelectedPath) {
            params.setSelectedEntry({
              ...params.selectedEntry,
              name: inferFileName(nextSelectedPath),
              path: nextSelectedPath,
            });
          }
        }
        if (movedEntryPaths.size > 0) {
          params.setSelectedEntries([]);
        }
      }

      await params.browser.refetchDirectory();
      for (const sourceParentPath of sourceParentPaths) {
        void params.directoryTree.loadDirectory(sourceParentPath);
      }
      if (![...sourceParentPaths].includes(destinationParentPath)) {
        void params.directoryTree.loadDirectory(destinationParentPath);
      }
      toast.success(
        pathOperationState.mode === "copy" ? "SFTP 원격 복사 완료" : "SFTP 원격 이동 완료",
        {
          description:
            pathOperationState.entries.length === 1
              ? `${pathOperationState.entries[0].path} -> ${destinationPath}`
              : `${pathOperationState.entries.length.toLocaleString("ko-KR")}개 항목 -> ${destinationPath}`,
        },
      );
      setPathOperationState(null);
    } catch {
      // ErrorBanner handles payload details.
    }
  }

  async function handleSubmitPermissions() {
    if (!params.siteId || !permissionsState) {
      return;
    }

    try {
      const response = await params.browser.chmodPath({
        path: permissionsState.entry.path,
        permissions_octal: permissionsState.permissions.trim(),
        site_id: params.siteId,
      });
      await params.browser.refetchDirectory();
      void params.onInspect(response.resolved_path);
      toast.success("SFTP 권한 변경 완료", {
        description: `${response.resolved_path} -> ${response.permissions_octal}`,
      });
      setPermissionsState(null);
    } catch {
      // ErrorBanner handles payload details.
    }
  }

  async function handleUploadPaths(sourcePaths: string[]) {
    if (!params.siteId) {
      return;
    }

    const normalizedSourcePaths = sourcePaths.filter((path) => path.trim().length > 0);
    if (normalizedSourcePaths.length === 0) {
      return;
    }

    const destinationDirectory = params.browser.directory?.resolved_path ?? params.browsePath;
    await transferQueue.enqueue({
      items: normalizedSourcePaths.map((sourcePath) => ({
        destination_path: buildSftpChildPath(destinationDirectory, inferFileName(sourcePath)),
        direction: "upload" satisfies SftpTransferDirection,
        label: inferFileName(sourcePath),
        recursive: false,
        source_kind: null,
        source_path: sourcePath,
      })),
      site_id: params.siteId,
    });
    toast.success("SFTP 업로드 큐 등록 완료", {
      description:
        normalizedSourcePaths.length === 1
          ? `${inferFileName(normalizedSourcePaths[0])} 업로드 예약`
          : `${normalizedSourcePaths.length.toLocaleString("ko-KR")}개 파일 업로드 예약`,
    });
  }

  async function handleUpload() {
    const sourcePaths = await selectSftpUploadSourcePaths();
    if (!sourcePaths) {
      return;
    }

    await handleUploadPaths(sourcePaths);
  }

  return {
    deleteCandidates,
    deletingPath,
    handleCreateDirectory,
    handleDelete,
    handleDownload,
    handleDownloadEntries,
    handleEditorSave,
    handlePrepareCopy,
    handlePrepareCopyEntries,
    handlePrepareDeleteEntries,
    handlePrepareMove,
    handlePrepareMoveEntries,
    handlePreparePermissions,
    handlePreviewSave,
    handleSubmitPathOperation,
    handleSubmitPermissions,
    handleUpload,
    handleUploadPaths,
    hiddenDeletedPaths,
    mkdirName,
    pathOperationState,
    permissionsState,
    setDeleteCandidates,
    setMkdirName,
    setPathOperationState,
    setPermissionsState,
    transferQueueCancel: transferQueue.cancel,
    transferQueueConcurrencyPending: transferQueue.concurrencyPending,
    transferQueueMutationPending: transferQueue.mutationPending,
    transferQueuePause: transferQueue.pause,
    transferQueueRetry: transferQueue.retry,
    transferQueueSetConcurrency: transferQueue.setConcurrency,
    uploadQueue: transferQueue.items,
    uploadingSourcePath: transferQueue.activeUploadSourcePath,
    downloadingPath: transferQueue.activeDownloadPath,
    transferQueuePending: transferQueue.pending,
    transferSnapshot: transferQueue.snapshot,
  };
}
