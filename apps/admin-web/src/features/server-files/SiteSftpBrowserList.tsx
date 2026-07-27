import type { SftpEntry } from "../../api/fleet";
import {
  formatSftpBytes,
  isEditableSftpEntry,
  sortSftpEntries,
} from "./siteSftpBrowserHelpers";

export function SiteSftpBrowserList(props: {
  entries: SftpEntry[];
  selectedPaths: Set<string>;
  pending: boolean;
  onOpenDirectory: (path: string) => void;
  onOpenEditor: (entry: SftpEntry) => void;
  onSelect: (entry: SftpEntry, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
}) {
  const entries = sortSftpEntries(props.entries);
  const allSelected = entries.length > 0
    && entries.every((entry) => props.selectedPaths.has(entry.path));

  return (
    <div className="sftp-list-wrap">
      <table className="sftp-entry-table">
        <thead>
          <tr>
            <th className="check-cell">
              <input
                aria-label="현재 폴더 전체 선택"
                type="checkbox"
                checked={allSelected}
                onChange={(event) => props.onSelectAll(event.target.checked)}
              />
            </th>
            <th>이름</th>
            <th>크기</th>
            <th>권한</th>
            <th>소유자</th>
            <th>수정</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const selected = props.selectedPaths.has(entry.path);
            const open = () => {
              if (entry.kind === "directory") props.onOpenDirectory(entry.path);
              else if (isEditableSftpEntry(entry)) props.onOpenEditor(entry);
            };
            return (
              <tr
                key={entry.path}
                data-selected={selected || undefined}
                onDoubleClick={open}
              >
                <td className="check-cell">
                  <input
                    aria-label={`${entry.name} 선택`}
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => props.onSelect(entry, event.target.checked)}
                  />
                </td>
                <td>
                  <button
                    className="sftp-entry-name"
                    type="button"
                    title={entry.path}
                    onClick={open}
                  >
                    <span className={`entry-kind ${entry.kind}`} aria-hidden="true">
                      {entry.kind === "directory"
                        ? "▰"
                        : entry.kind === "symlink"
                        ? "↗"
                        : "▤"}
                    </span>
                    <span>{entry.name}</span>
                  </button>
                </td>
                <td>{entry.kind === "directory" ? "—" : formatSftpBytes(entry.size)}</td>
                <td><code>{entry.permissions}</code></td>
                <td>{entry.owner}:{entry.group}</td>
                <td>{entry.modified}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!props.pending && entries.length === 0 && (
        <div className="sftp-list-empty">이 디렉터리는 비어 있습니다.</div>
      )}
      {props.pending && (
        <div className="sftp-list-loading">원격 디렉터리를 불러오는 중입니다.</div>
      )}
    </div>
  );
}
