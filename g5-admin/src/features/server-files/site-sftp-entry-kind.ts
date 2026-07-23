import type { SftpEntryKind } from "../../types/SftpEntryKind";

export function formatSftpEntryKind(kind: SftpEntryKind) {
  switch (kind) {
    case "directory":
      return "디렉터리";
    case "file":
      return "파일";
    case "symlink":
      return "심볼릭 링크";
    default:
      return "항목";
  }
}
