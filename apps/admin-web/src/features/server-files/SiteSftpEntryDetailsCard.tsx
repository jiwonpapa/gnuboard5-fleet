import type { SftpEntry } from "../../api/fleet";
import { formatSftpBytes, isEditableSftpEntry } from "./siteSftpBrowserHelpers";

export function SiteSftpEntryDetailsCard(props: {
  entry: SftpEntry | null;
  onEdit: (entry: SftpEntry) => void;
}) {
  const entry = props.entry;

  return (
    <aside className="sftp-details" aria-label="SFTP 선택 항목 상세">
      <div className="sftp-pane-title">
        <strong>Details</strong>
      </div>
      {entry ? (
        <dl>
          <div><dt>이름</dt><dd>{entry.name}</dd></div>
          <div><dt>형식</dt><dd>{entry.kind}</dd></div>
          <div><dt>크기</dt><dd>{formatSftpBytes(entry.size)}</dd></div>
          <div><dt>권한</dt><dd><code>{entry.permissions}</code></dd></div>
          <div><dt>소유자</dt><dd>{entry.owner}:{entry.group}</dd></div>
          <div><dt>수정</dt><dd>{entry.modified}</dd></div>
          <div className="wide"><dt>경로</dt><dd><code>{entry.path}</code></dd></div>
        </dl>
      ) : (
        <p>목록에서 항목을 선택하면 메타데이터를 표시합니다.</p>
      )}
      {entry && isEditableSftpEntry(entry) && (
        <button
          className="secondary-action"
          type="button"
          onClick={() => props.onEdit(entry)}
        >
          텍스트 편집
        </button>
      )}
    </aside>
  );
}
