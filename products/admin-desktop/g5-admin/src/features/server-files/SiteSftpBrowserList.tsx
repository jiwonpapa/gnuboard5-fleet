import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDownToLine,
  FilePenLine,
  FileText,
  FolderOpen,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import { cn } from "../../lib/utils";
import type { SftpDirectoryEntry } from "../../types/SftpDirectoryEntry";
import { isSftpEditableTextPath } from "./site-sftp-editability";
import { SiteSftpEntryContextMenuContent } from "./SiteSftpEntryContextMenuContent";

type BrowserRow =
  | {
      id: string;
      kind: "parent";
      parentPath: string;
    }
  | {
      entry: SftpDirectoryEntry;
      id: string;
      kind: "entry";
    };

type BrowserTypography = {
  badgeClassName: string;
  headerClassName: string;
  metaClassName: string;
  nameClassName: string;
  pathClassName: string;
  titleClassName: string;
  rowEstimate: number;
};

const GRID_COLUMNS =
  "grid min-w-[34rem] grid-cols-[1.35rem_minmax(8rem,4.3fr)_3.25rem_3.5rem_3.5rem_5rem_4.25rem] items-center gap-1.5";

function resolveBrowserTypography(fontScale: "sm" | "md" | "lg"): BrowserTypography {
  switch (fontScale) {
    case "sm":
      return {
        badgeClassName: "h-5 px-1.5 text-[11px]",
        headerClassName: "text-[11px]",
        metaClassName: "text-[11px]",
        nameClassName: "text-[12px]",
        pathClassName: "text-[12px] leading-4",
        rowEstimate: 40,
        titleClassName: "text-[13px]",
      };
    case "lg":
      return {
        badgeClassName: "h-6 px-2 text-[13px]",
        headerClassName: "text-[13px]",
        metaClassName: "text-[13px]",
        nameClassName: "text-[14px]",
        pathClassName: "text-[14px] leading-5",
        rowEstimate: 48,
        titleClassName: "text-[15px]",
      };
    default:
      return {
        badgeClassName: "h-5.5 px-2 text-[12px]",
        headerClassName: "text-[12px]",
        metaClassName: "text-[12px]",
        nameClassName: "text-[13px]",
        pathClassName: "text-[13px] leading-5",
        rowEstimate: 44,
        titleClassName: "text-[14px]",
      };
  }
}

export function SiteSftpBrowserList(props: {
  activeOperationPath: string | null;
  allEntriesSelected: boolean;
  currentPath: string;
  downloadingPath: string | null;
  entries: SftpDirectoryEntry[];
  fontScale: "sm" | "md" | "lg";
  parentPath: string | null;
  selectedEntries: SftpDirectoryEntry[];
  selectedPath: string | null;
  selectedPaths: string[];
  onChmod: (entry: SftpDirectoryEntry) => void;
  onCopyEntries: (entries: SftpDirectoryEntry[]) => void;
  onDeleteEntries: (entries: SftpDirectoryEntry[]) => void;
  onDownloadEntry: (entry: SftpDirectoryEntry) => void;
  onDownloadEntries: (entries: SftpDirectoryEntry[]) => void;
  onMoveEntries: (entries: SftpDirectoryEntry[]) => void;
  onOpenDirectory: (path: string) => void;
  onOpenEditor: (path: string) => void;
  onToggleEntrySelection: (entry: SftpDirectoryEntry, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const selectedPathSet = useMemo(() => new Set(props.selectedPaths), [props.selectedPaths]);
  const typography = useMemo(() => resolveBrowserTypography(props.fontScale), [props.fontScale]);
  const rows = useMemo<BrowserRow[]>(() => {
    const nextRows = props.entries.map(
      (entry): BrowserRow => ({
        entry,
        id: entry.path,
        kind: "entry",
      }),
    );

    if (props.parentPath) {
      nextRows.unshift({
        id: `${props.parentPath}::__parent__`,
        kind: "parent",
        parentPath: props.parentPath,
      });
    }

    return nextRows;
  }, [props.entries, props.parentPath]);

  // Virtualizer stays isolated here so the rest of the workspace remains regular React UI.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => typography.rowEstimate,
    getScrollElement: () => scrollRef.current,
    overscan: 10,
  });
  const shouldVirtualize = rows.length > 40;
  const totalEntries = rows.length;
  const selectedRowIndex = useMemo(
    () =>
      props.selectedPath === null
        ? -1
        : rows.findIndex(
            (row) => row.kind === "entry" && row.entry.path === props.selectedPath,
          ),
    [props.selectedPath, rows],
  );

  useEffect(() => {
    if (selectedRowIndex < 0) {
      return;
    }

    if (shouldVirtualize) {
      virtualizer.scrollToIndex(selectedRowIndex, {
        align: "auto",
      });
      return;
    }

    const selectedRow = rows[selectedRowIndex];
    const selectedRowNode = rowRefs.current.get(selectedRow.id);
    if (typeof selectedRowNode?.scrollIntoView === "function") {
      selectedRowNode.scrollIntoView({
        block: "nearest",
      });
    }
  }, [rows, selectedRowIndex, shouldVirtualize, virtualizer]);

  return (
    <section
      data-font-scale={props.fontScale}
      data-sftp-pane="listing"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-background"
    >
      <div className="border-b border-border/70 px-3 py-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p
              className={cn(
                typography.titleClassName,
                "font-semibold uppercase tracking-[0.18em] text-muted-foreground",
              )}
            >
              Remote Listing
            </p>
            <p className={cn("truncate text-muted-foreground", typography.pathClassName)}>
              현재 경로: {props.currentPath}
            </p>
          </div>
          <Badge variant="outline" className={typography.badgeClassName}>
            {totalEntries} entries
          </Badge>
        </div>
      </div>

      <div
        className={cn(
          "border-b border-border/70 bg-muted/45 px-3 py-1 font-semibold uppercase tracking-[0.15em] text-muted-foreground",
          typography.headerClassName,
        )}
      >
        <div className={GRID_COLUMNS}>
          <label className="flex items-center justify-center">
            <input
              type="checkbox"
              aria-label="파일 목록 전체 선택"
              checked={props.allEntriesSelected}
              onChange={(event) => props.onToggleSelectAll(event.currentTarget.checked)}
            />
          </label>
          <span>이름</span>
          <span>종류</span>
          <span>권한</span>
          <span>크기</span>
          <span>수정 시각</span>
          <span className="text-right">작업</span>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-sm leading-6 text-muted-foreground">
            현재 디렉터리에 표시할 항목이 없습니다.
          </div>
        ) : shouldVirtualize ? (
          <div
            className="relative min-w-[32.5rem]"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((item) => (
              <div
                key={rows[item.index].id}
                className="absolute left-0 top-0 w-full px-3"
                ref={(node) => {
                  if (node) {
                    rowRefs.current.set(rows[item.index].id, node);
                    return;
                  }

                  rowRefs.current.delete(rows[item.index].id);
                }}
                style={{ transform: `translateY(${item.start}px)` }}
              >
                <BrowserListRow
                  activeOperationPath={props.activeOperationPath}
                  downloadingPath={props.downloadingPath}
                  fontScale={props.fontScale}
                  row={rows[item.index]}
                  selectedEntries={props.selectedEntries}
                  selectedPath={props.selectedPath}
                  selectedPaths={selectedPathSet}
                  onChmod={props.onChmod}
                  onCopyEntries={props.onCopyEntries}
                  onDeleteEntries={props.onDeleteEntries}
                  onDownloadEntry={props.onDownloadEntry}
                  onDownloadEntries={props.onDownloadEntries}
                  onMoveEntries={props.onMoveEntries}
                  onOpenDirectory={props.onOpenDirectory}
                  onOpenEditor={props.onOpenEditor}
                  onToggleEntrySelection={props.onToggleEntrySelection}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="min-w-[31.5rem] px-3">
            {rows.map((row) => (
              <div
                key={row.id}
                ref={(node) => {
                  if (node) {
                    rowRefs.current.set(row.id, node);
                    return;
                  }

                  rowRefs.current.delete(row.id);
                }}
              >
                <BrowserListRow
                  activeOperationPath={props.activeOperationPath}
                  downloadingPath={props.downloadingPath}
                  fontScale={props.fontScale}
                  row={row}
                  selectedEntries={props.selectedEntries}
                  selectedPath={props.selectedPath}
                  selectedPaths={selectedPathSet}
                  onChmod={props.onChmod}
                  onCopyEntries={props.onCopyEntries}
                  onDeleteEntries={props.onDeleteEntries}
                  onDownloadEntry={props.onDownloadEntry}
                  onDownloadEntries={props.onDownloadEntries}
                  onMoveEntries={props.onMoveEntries}
                  onOpenDirectory={props.onOpenDirectory}
                  onOpenEditor={props.onOpenEditor}
                  onToggleEntrySelection={props.onToggleEntrySelection}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function BrowserListRow(props: {
  activeOperationPath: string | null;
  downloadingPath: string | null;
  fontScale: "sm" | "md" | "lg";
  row: BrowserRow;
  selectedEntries: SftpDirectoryEntry[];
  selectedPath: string | null;
  selectedPaths: Set<string>;
  onChmod: (entry: SftpDirectoryEntry) => void;
  onCopyEntries: (entries: SftpDirectoryEntry[]) => void;
  onDeleteEntries: (entries: SftpDirectoryEntry[]) => void;
  onDownloadEntry: (entry: SftpDirectoryEntry) => void;
  onDownloadEntries: (entries: SftpDirectoryEntry[]) => void;
  onMoveEntries: (entries: SftpDirectoryEntry[]) => void;
  onOpenDirectory: (path: string) => void;
  onOpenEditor: (path: string) => void;
  onToggleEntrySelection: (entry: SftpDirectoryEntry, checked: boolean) => void;
}) {
  const typography = resolveBrowserTypography(props.fontScale);
  if (props.row.kind === "parent") {
    const parentPath = props.row.parentPath;

    return (
      <div
        role="button"
        tabIndex={0}
        className={cn(
          GRID_COLUMNS,
          "w-full cursor-pointer border-t border-border/60 px-0 py-1 text-left transition-colors hover:bg-muted/45",
        )}
        onClick={() => props.onOpenDirectory(parentPath)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            props.onOpenDirectory(parentPath);
          }
        }}
      >
        <span className="flex items-center justify-center">
          <span className="size-3 rounded-sm border border-transparent" />
        </span>
        <div className="flex min-w-0 items-center gap-2">
          <FolderOpen className="size-3.5 shrink-0 text-foreground" />
          <span className={cn("truncate font-medium text-foreground", typography.nameClassName)}>
            ..
          </span>
        </div>
        <span className={cn("text-muted-foreground", typography.metaClassName)}>상위</span>
        <span className={cn("font-mono text-muted-foreground", typography.metaClassName)}>—</span>
        <span className={cn("text-muted-foreground", typography.metaClassName)}>—</span>
        <span className={cn("truncate text-muted-foreground", typography.metaClassName)}>
          {parentPath}
        </span>
        <div className="flex items-center justify-end">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="상위 폴더 열기"
            onClick={(event) => {
              event.stopPropagation();
              props.onOpenDirectory(parentPath);
            }}
          >
            <FolderOpen className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  const entry = props.row.entry;
  const isDirectory = entry.metadata.kind === "directory";
  const editable = !isDirectory && isSftpEditableTextPath(entry.path);
  const selected = props.selectedPath === entry.path;
  const checked = props.selectedPaths.has(entry.path);
  const isMutating = props.activeOperationPath === entry.path;
  const isDownloading = props.downloadingPath === entry.path;
  const contextEntries =
    checked && props.selectedEntries.length > 1 ? props.selectedEntries : [entry];
  const rowOpensDirectory = isDirectory;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          aria-selected={selected}
          role={rowOpensDirectory ? "button" : undefined}
          tabIndex={rowOpensDirectory ? 0 : undefined}
          className={cn(
            GRID_COLUMNS,
            "border-t border-border/60 px-0 py-1 transition-colors",
            selected ? "bg-primary/[0.08]" : "hover:bg-muted/45",
            rowOpensDirectory && "cursor-pointer",
            isMutating && "opacity-70",
          )}
          onClick={() => {
            if (!rowOpensDirectory) {
              return;
            }
            props.onOpenDirectory(entry.path);
          }}
          onKeyDown={(event) => {
            if (!rowOpensDirectory) {
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              props.onOpenDirectory(entry.path);
            }
          }}
        >
          <label
            className="flex items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              aria-label={`${entry.name} 선택`}
              checked={checked}
              onChange={(event) =>
                props.onToggleEntrySelection(entry, event.currentTarget.checked)
              }
            />
          </label>

          <div className="flex min-w-0 items-center gap-2" title={entry.path}>
            {isDirectory ? (
              <FolderOpen className="size-4 shrink-0 text-foreground" />
            ) : (
              <FileText className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span
              className={cn(
                "truncate font-medium leading-5 text-foreground",
                typography.nameClassName,
              )}
            >
              {entry.name}
            </span>
            {editable ? (
              <Badge variant="outline" className="shrink-0 h-4.5 px-1.5 py-0 text-[11px]">
                편집
              </Badge>
            ) : null}
          </div>

          <span className={cn("text-muted-foreground", typography.metaClassName)}>
            {isDirectory ? "디렉터리" : "파일"}
          </span>
          <span className={cn("font-mono text-muted-foreground", typography.metaClassName)}>
            {entry.metadata.permissions_octal ?? "unknown"}
          </span>
          <span className={cn("text-muted-foreground", typography.metaClassName)}>
            {formatSize(entry.metadata.size_bytes)}
          </span>
          <span className={cn("truncate text-muted-foreground", typography.metaClassName)}>
            {formatTimestamp(entry.metadata.modified_at_epoch)}
          </span>
          <div className="flex items-center justify-end gap-0.5">
            {isDirectory ? (
              <>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`${entry.name} 다운로드`}
                  disabled={isDownloading}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onDownloadEntry(entry);
                  }}
                >
                  <ArrowDownToLine className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`${entry.name} 열기`}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onOpenDirectory(entry.path);
                  }}
                >
                  <FolderOpen className="size-3.5" />
                </Button>
              </>
            ) : (
              <>
                {editable ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`${entry.name} 편집`}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onOpenEditor(entry.path);
                    }}
                  >
                      <FilePenLine className="size-3.5" />
                    </Button>
                ) : null}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  disabled={isDownloading}
                  aria-label={`${entry.name} 다운로드`}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onDownloadEntry(entry);
                  }}
                >
                    <ArrowDownToLine className="size-3.5" />
                  </Button>
              </>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <SiteSftpEntryContextMenuContent
        activeEntries={contextEntries}
        anchorEntry={entry}
        onChmod={props.onChmod}
        onCopyEntries={props.onCopyEntries}
        onDeleteEntries={props.onDeleteEntries}
        onDownloadEntries={props.onDownloadEntries}
        onMoveEntries={props.onMoveEntries}
        onOpenDirectory={props.onOpenDirectory}
        onOpenEditor={props.onOpenEditor}
      />
    </ContextMenu>
  );
}

function formatSize(size: bigint | number | null) {
  if (size === null) {
    return "—";
  }

  const normalizedSize = typeof size === "bigint" ? Number(size) : size;

  if (normalizedSize >= 1024 * 1024) {
    return `${(normalizedSize / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (normalizedSize >= 1024) {
    return `${(normalizedSize / 1024).toFixed(1)} KB`;
  }

  return `${normalizedSize} B`;
}

function formatTimestamp(epoch: bigint | number | null) {
  if (!epoch) {
    return "unknown";
  }

  const normalizedEpoch = typeof epoch === "bigint" ? Number(epoch) : epoch;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(normalizedEpoch * 1000));
}
