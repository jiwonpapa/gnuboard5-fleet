import { useMemo, useState } from "react";
import { Group, Panel } from "react-resizable-panels";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { CommandError } from "../../api/client";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { SiteSftpBrowserControlsCard } from "./SiteSftpBrowserControlsCard";
import { SiteSftpBrowserList } from "./SiteSftpBrowserList";
import { SiteSftpDeleteDialog } from "./SiteSftpDeleteDialog";
import { SiteSftpDirectoryTree } from "./SiteSftpDirectoryTree";
import { SiteSftpEditorModal } from "./SiteSftpEditorModal";
import { SiteSftpErrorDialog } from "./SiteSftpErrorDialog";
import { SiteSftpPathOperationDialog } from "./SiteSftpPathOperationDialog";
import { SiteSftpPermissionsDialog } from "./SiteSftpPermissionsDialog";
import { SiteSftpSelectionToolbar } from "./SiteSftpSelectionToolbar";
import { SiteSftpTransferQueuePanel } from "./SiteSftpTransferQueuePanel";
import { SiteSftpWorkspaceResizeHandle } from "./SiteSftpWorkspaceResizeHandle";
import { useSiteSftpKeyboardShortcuts } from "./use-site-sftp-keyboard-shortcuts";
import { useSiteSftpDropUpload } from "./use-site-sftp-drop-upload";
import {
  type SiteSftpFontScale,
  type SiteSftpViewportMode,
  useSiteSftpWorkspaceLayout,
} from "./use-site-sftp-workspace-layout";
import type { SiteSftpWorkspace } from "./use-site-sftp-workspace";

const VIEWPORT_HEIGHT_CLASS_MAP: Record<SiteSftpViewportMode, string> = {
  compact: "h-[calc(100vh-18rem)] min-h-[34rem]",
  standard: "h-[calc(100vh-12.5rem)] min-h-[44rem]",
  tall: "h-[calc(100vh-7rem)] min-h-[56rem]",
};

export function SiteSftpWorkspaceSurface(props: {
  connected: boolean;
  externalError?: CommandError | null;
  workspace: SiteSftpWorkspace;
}) {
  const { connected, externalError = null, workspace } = props;
  const layout = useSiteSftpWorkspaceLayout(workspace.siteId);
  const [viewportMode, setViewportMode] = useState<SiteSftpViewportMode>(
    layout.defaultViewportMode,
  );
  const [fontScale, setFontScale] = useState<SiteSftpFontScale>(layout.defaultFontScale);
  useSiteSftpKeyboardShortcuts({ connected, workspace });
  const { dragActive } = useSiteSftpDropUpload({
    enabled: connected,
    onDropPaths: workspace.handleUploadPaths,
  });
  const topError = useMemo<CommandError | null>(() => {
    return (
      workspace.browser.directoryError ??
      workspace.browser.downloadFileError ??
      workspace.browser.uploadFileError ??
      workspace.browser.copyPathError ??
      workspace.browser.movePathError ??
      workspace.browser.chmodPathError ??
      workspace.browser.deleteError ??
      workspace.browser.mkdirError ??
      workspace.browser.writeFileError ??
      workspace.editor.fileError ??
      workspace.editor.writeFileError ??
      workspace.browser.statError ??
      workspace.browser.readFileError ??
      workspace.directoryTree.loadDirectoryError ??
      externalError ??
      null
    );
  }, [
    externalError,
    workspace.browser.chmodPathError,
    workspace.browser.copyPathError,
    workspace.browser.deleteError,
    workspace.browser.directoryError,
    workspace.browser.downloadFileError,
    workspace.browser.mkdirError,
    workspace.browser.movePathError,
    workspace.browser.readFileError,
    workspace.browser.statError,
    workspace.browser.uploadFileError,
    workspace.browser.writeFileError,
    workspace.directoryTree.loadDirectoryError,
    workspace.editor.fileError,
    workspace.editor.writeFileError,
  ]);
  const topErrorSignature = topError
    ? [
        topError.command ?? "unknown-command",
        topError.message,
        topError.request_id ?? "unknown-request",
        topError.occurred_at ?? "unknown-time",
      ].join("::")
    : null;
  const [dismissedErrorSignature, setDismissedErrorSignature] = useState<string | null>(null);

  const errorDialogOpen = topErrorSignature !== null && dismissedErrorSignature !== topErrorSignature;
  const workspaceHeightClass = VIEWPORT_HEIGHT_CLASS_MAP[viewportMode];
  const canDecreaseFontScale = fontScale !== "sm";
  const canIncreaseFontScale = fontScale !== "lg";
  const fontScaleLabel =
    fontScale === "sm" ? "13px" : fontScale === "md" ? "14px" : "15px";

  const applyFontScale = (next: SiteSftpFontScale) => {
    setFontScale(next);
    layout.persistFontScale(next);
  };

  const stepFontScale = (direction: -1 | 1) => {
    const order: SiteSftpFontScale[] = ["sm", "md", "lg"];
    const currentIndex = order.indexOf(fontScale);
    const nextIndex = Math.min(order.length - 1, Math.max(0, currentIndex + direction));
    const nextScale = order[nextIndex];
    if (nextScale === fontScale) {
      return;
    }
    applyFontScale(nextScale);
  };

  return (
    <>
      <div className="relative overflow-hidden bg-background">
        {dragActive ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-sky-500/10 backdrop-blur-[2px]">
            <div className="rounded-[1.4rem] border border-sky-300/40 bg-slate-950/95 px-6 py-5 text-center shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">
                Drag & Drop Upload
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-50">
                파일을 놓으면 현재 SFTP 경로로 즉시 업로드합니다.
              </p>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2 border-b border-border/70 bg-background px-3 py-1">
          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-muted/35 p-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="SFTP 목록 폰트 줄이기"
              title="SFTP 목록 폰트 줄이기"
              disabled={!canDecreaseFontScale}
              onClick={() => stepFontScale(-1)}
            >
              <Minus className="size-3.5" />
            </Button>
            <span
              className="min-w-[2.5rem] text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              aria-label={`SFTP 목록 폰트 ${fontScaleLabel}`}
            >
              {fontScaleLabel}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="SFTP 목록 폰트 키우기"
              title="SFTP 목록 폰트 키우기"
              disabled={!canIncreaseFontScale}
              onClick={() => stepFontScale(1)}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-muted/35 p-1">
            <Maximize2 className="size-3.5 text-muted-foreground" />
            {(["compact", "standard", "tall"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-label={`SFTP 작업면 높이 ${mode}`}
                title={`SFTP 작업면 높이 ${mode}`}
                className={cn(
                  "rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-background hover:text-foreground",
                  viewportMode === mode && "bg-background text-foreground shadow-sm",
                )}
                onClick={() => {
                  setViewportMode(mode);
                  layout.persistViewportMode(mode);
                }}
              >
                {mode === "compact" ? "S" : mode === "standard" ? "M" : "L"}
              </button>
            ))}
          </div>
        </div>
        <Group
          orientation="horizontal"
          data-viewport-mode={viewportMode}
          data-font-scale={fontScale}
          className={workspaceHeightClass}
          defaultLayout={layout.defaultRootLayout}
          onLayoutChanged={layout.persistRootLayout}
        >
          <Panel id="sftp-nav" defaultSize={layout.defaultRootLayout["sftp-nav"]} minSize={18}>
            <aside className="flex h-full min-h-0 flex-col border-r border-slate-800/80 bg-slate-950 text-slate-100">
              <SiteSftpBrowserControlsCard
                connected={connected}
                currentPath={workspace.pathInput}
                dragActive={dragActive}
                mkdirName={workspace.mkdirName}
                mkdirPending={workspace.browser.mkdirPending}
                refreshing={workspace.browser.directoryRefreshing}
                uploadPending={
                  workspace.uploadingSourcePath !== null || workspace.browser.uploadFilePending
                }
                onBrowse={() => workspace.handleBrowse(workspace.pathInput)}
                onCreateDirectory={() => {
                  void workspace.handleCreateDirectory();
                }}
                onMkdirNameChange={workspace.setMkdirName}
                onPathChange={workspace.setPathInput}
                onUpload={() => {
                  void workspace.handleUpload();
                }}
              />
              <div className="min-h-0 flex-1 overflow-auto px-2 py-3">
                <SiteSftpDirectoryTree
                  currentPath={workspace.browser.directory?.resolved_path ?? null}
                  fontScale={fontScale}
                  loadingPath={workspace.directoryTree.loadingPath}
                  nodes={workspace.directoryTree.nodes}
                  rootId={workspace.directoryTree.rootId}
                  selectedPath={workspace.selectedDirectoryPath}
                  onOpenDirectory={workspace.handleOpenDirectory}
                  onToggleDirectory={(path) => {
                    void workspace.directoryTree.loadDirectory(path);
                  }}
                />
              </div>
            </aside>
          </Panel>

          <SiteSftpWorkspaceResizeHandle direction="horizontal" />

          <Panel
            id="sftp-main"
            defaultSize={layout.defaultRootLayout["sftp-main"]}
            minSize={35}
          >
            <Group
              orientation="vertical"
              className="h-full"
              defaultLayout={layout.defaultMainLayout}
              onLayoutChanged={layout.persistMainLayout}
            >
              <Panel
                id="sftp-list"
                defaultSize={layout.defaultMainLayout["sftp-list"]}
                minSize={45}
              >
                <section className="flex h-full min-h-0 min-w-0 flex-col bg-background">
                  <SiteSftpSelectionToolbar
                    count={workspace.selectedEntries.length}
                    onClear={workspace.handleClearSelection}
                    onCopy={() => workspace.handlePrepareCopyEntries(workspace.selectedEntries)}
                    onDelete={() => workspace.handlePrepareDeleteEntries(workspace.selectedEntries)}
                    onDownload={() => {
                      void workspace.handleDownloadEntries(workspace.selectedEntries);
                    }}
                    onMove={() => workspace.handlePrepareMoveEntries(workspace.selectedEntries)}
                  />

                  <div className="min-h-0 min-w-0 flex-1">
                    {connected ? (
                      workspace.browser.directoryLoading ? (
                        <div className="px-4 py-5 text-sm leading-6 text-muted-foreground">
                          원격 디렉터리를 불러오는 중입니다.
                        </div>
                      ) : (
                        <SiteSftpBrowserList
                          allEntriesSelected={workspace.allDirectoryEntriesSelected}
                          activeOperationPath={workspace.activeOperationPath}
                          currentPath={
                            workspace.browser.directory?.resolved_path ?? workspace.browsePath
                          }
                          downloadingPath={workspace.downloadingPath}
                          entries={
                            workspace.browser.directory?.entries.filter(
                              (entry) => !workspace.hiddenDeletedPaths.includes(entry.path),
                            ) ?? []
                          }
                          fontScale={fontScale}
                          parentPath={workspace.browser.directory?.parent_path ?? null}
                          selectedEntries={workspace.selectedEntries}
                          selectedPath={workspace.selectedPath}
                          selectedPaths={workspace.selectedPaths}
                          onChmod={workspace.handlePreparePermissions}
                          onCopyEntries={workspace.handlePrepareCopyEntries}
                          onDeleteEntries={workspace.handlePrepareDeleteEntries}
                          onDownloadEntry={(entry) => {
                            void workspace.handleDownload(entry);
                          }}
                          onDownloadEntries={(entries) => {
                            void workspace.handleDownloadEntries(entries);
                          }}
                          onMoveEntries={workspace.handlePrepareMoveEntries}
                          onOpenDirectory={workspace.handleOpenDirectory}
                          onOpenEditor={workspace.handleOpenEditor}
                          onToggleEntrySelection={workspace.handleToggleEntrySelection}
                          onToggleSelectAll={(checked) => {
                            if (checked) {
                              workspace.handleSelectAllEntries();
                              return;
                            }
                            workspace.handleClearSelection();
                          }}
                        />
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 py-8 text-center text-sm leading-6 text-muted-foreground">
                        SSH 연결을 열어 두면 이 영역이 앱형 SFTP 작업면으로 바뀝니다.
                      </div>
                    )}
                  </div>
                </section>
              </Panel>

              <SiteSftpWorkspaceResizeHandle direction="vertical" />

              <Panel
                id="sftp-queue"
                defaultSize={layout.defaultMainLayout["sftp-queue"]}
                minSize={18}
              >
                <div className="h-full min-h-0 border-t border-border/70">
                  <SiteSftpTransferQueuePanel
                    concurrencyPending={workspace.transferQueueConcurrencyPending}
                    mutationPending={workspace.transferQueueMutationPending}
                    onCancel={(itemId) => {
                      void workspace.transferQueueCancel({
                        item_id: itemId,
                        site_id: workspace.siteId ?? "",
                      });
                    }}
                    onPause={(itemId) => {
                      void workspace.transferQueuePause({
                        item_id: itemId,
                        site_id: workspace.siteId ?? "",
                      });
                    }}
                    onRetry={(itemId) => {
                      void workspace.transferQueueRetry({
                        item_id: itemId,
                        site_id: workspace.siteId ?? "",
                      });
                    }}
                    onSetConcurrency={(value) => {
                      if (!workspace.siteId) {
                        return;
                      }
                      void workspace.transferQueueSetConcurrency({
                        concurrency_limit: value,
                        site_id: workspace.siteId,
                      });
                    }}
                    snapshot={workspace.transferSnapshot}
                    pending={workspace.transferQueuePending}
                  />
                </div>
              </Panel>
            </Group>
          </Panel>
        </Group>
      </div>

      <SiteSftpPathOperationDialog
        destinationPath={workspace.pathOperationState?.destinationPath ?? ""}
        mode={workspace.pathOperationState?.mode ?? "copy"}
        open={workspace.pathOperationState !== null}
        pending={workspace.browser.copyPathPending || workspace.browser.movePathPending}
        sourcePaths={workspace.pathOperationState?.entries.map((entry) => entry.path) ?? []}
        onCancel={() => workspace.setPathOperationState(null)}
        onDestinationPathChange={(value) =>
          workspace.setPathOperationState((current) =>
            current ? { ...current, destinationPath: value } : current,
          )
        }
        onConfirm={() => {
          void workspace.handleSubmitPathOperation();
        }}
      />

      <SiteSftpPermissionsDialog
        open={workspace.permissionsState !== null}
        path={workspace.permissionsState?.entry.path ?? null}
        pending={workspace.browser.chmodPathPending}
        permissions={workspace.permissionsState?.permissions ?? ""}
        onCancel={() => workspace.setPermissionsState(null)}
        onPermissionsChange={(value) =>
          workspace.setPermissionsState((current) =>
            current ? { ...current, permissions: value } : current,
          )
        }
        onConfirm={() => {
          void workspace.handleSubmitPermissions();
        }}
      />

      <SiteSftpDeleteDialog
        key={workspace.deleteCandidates.map((entry) => entry.path).join("::") || "no-delete-candidate"}
        candidates={workspace.deleteCandidates}
        isPending={workspace.browser.deletePending}
        onCancel={() => workspace.setDeleteCandidates([])}
        onConfirm={(recursive) => {
          void workspace.handleDelete(recursive);
        }}
      />

      <SiteSftpEditorModal
        open={workspace.selectedEditorPath !== null}
        loading={workspace.editor.fileLoading}
        file={workspace.editor.file}
        savePending={workspace.editor.writeFilePending}
        onCancel={workspace.handleCloseEditor}
        onSave={workspace.handleEditorSave}
      />

      <SiteSftpErrorDialog
        error={topError}
        open={errorDialogOpen}
        onClose={() => {
          if (topErrorSignature) {
            setDismissedErrorSignature(topErrorSignature);
          }
        }}
      />
    </>
  );
}
