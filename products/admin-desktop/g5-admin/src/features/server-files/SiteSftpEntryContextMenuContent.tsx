import {
  ArrowDownToLine,
  Copy,
  FilePenLine,
  FolderOpen,
  MoveRight,
  ShieldEllipsis,
  Trash2,
} from "lucide-react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "../../components/ui/context-menu";
import type { SftpDirectoryEntry } from "../../types/SftpDirectoryEntry";
import { isSftpEditableTextPath } from "./site-sftp-editability";

export function SiteSftpEntryContextMenuContent(props: {
  activeEntries: SftpDirectoryEntry[];
  anchorEntry: SftpDirectoryEntry;
  onChmod: (entry: SftpDirectoryEntry) => void;
  onCopyEntries: (entries: SftpDirectoryEntry[]) => void;
  onDeleteEntries: (entries: SftpDirectoryEntry[]) => void;
  onDownloadEntries: (entries: SftpDirectoryEntry[]) => void;
  onMoveEntries: (entries: SftpDirectoryEntry[]) => void;
  onOpenDirectory: (path: string) => void;
  onOpenEditor: (path: string) => void;
}) {
  const { activeEntries, anchorEntry } = props;
  const batchMode = activeEntries.length > 1;
  const editable = !batchMode && isSftpEditableTextPath(anchorEntry.path);
  const directoryOnly = activeEntries.every((entry) => entry.metadata.kind === "directory");
  const selectionLabel = batchMode
    ? `${activeEntries.length.toLocaleString("ko-KR")}개 선택`
    : anchorEntry.name;

  return (
    <ContextMenuContent className="w-64">
      <ContextMenuLabel>{selectionLabel}</ContextMenuLabel>
      {batchMode ? null : anchorEntry.metadata.kind === "directory" ? (
        <ContextMenuItem onSelect={() => props.onOpenDirectory(anchorEntry.path)}>
          <FolderOpen className="size-4" />
          열기
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
      ) : editable ? (
        <ContextMenuItem onSelect={() => props.onOpenEditor(anchorEntry.path)}>
          <FilePenLine className="size-4" />
          편집
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem onSelect={() => props.onDownloadEntries(activeEntries)}>
        <ArrowDownToLine className="size-4" />
        다운로드
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => props.onCopyEntries(activeEntries)}>
        <Copy className="size-4" />
        복사
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => props.onMoveEntries(activeEntries)}>
        <MoveRight className="size-4" />
        이동
      </ContextMenuItem>
      {!batchMode ? (
        <ContextMenuItem onSelect={() => props.onChmod(anchorEntry)}>
          <ShieldEllipsis className="size-4" />
          권한 변경
        </ContextMenuItem>
      ) : directoryOnly ? null : (
        <ContextMenuItem disabled>
          <ShieldEllipsis className="size-4" />
          권한 변경
          <ContextMenuShortcut>단일 항목</ContextMenuShortcut>
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem
        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        onSelect={() => props.onDeleteEntries(activeEntries)}
      >
        <Trash2 className="size-4" />
        삭제
        <ContextMenuShortcut>Delete</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
