import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { SftpDirectoryEntry } from "../../types/SftpDirectoryEntry";
import { formatSftpEntryKind } from "./site-sftp-entry-kind";

const RECURSIVE_DELETE_CONFIRMATION = "delete";

export function SiteSftpDeleteDialog(props: {
  candidates: SftpDirectoryEntry[];
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (recursive: boolean) => void;
}) {
  const { candidates, isPending, onCancel, onConfirm } = props;
  const [confirmationText, setConfirmationText] = useState("");
  const candidate = candidates[0] ?? null;

  const requiresRecursiveConfirmation =
    candidates.length > 1 || candidates.some((entry) => entry.metadata.kind === "directory");
  const confirmationReady = useMemo(() => {
    if (!requiresRecursiveConfirmation) {
      return true;
    }

    return confirmationText.trim().toLowerCase() === RECURSIVE_DELETE_CONFIRMATION;
  }, [confirmationText, requiresRecursiveConfirmation]);

  useEffect(() => {
    if (!candidate) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [candidate, onCancel]);

  if (!candidate) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-sftp-delete-dialog-title"
        className="w-full max-w-xl rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Confirm Delete
          </p>
          <h2
            id="site-sftp-delete-dialog-title"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            SFTP 항목 삭제
          </h2>
          <p className="text-sm leading-6 break-words text-muted-foreground">
            {candidates.length === 1
              ? `${formatSftpEntryKind(candidate.metadata.kind)} ${candidate.path} 항목을 삭제합니다.`
              : `${candidates.length.toLocaleString("ko-KR")}개 선택 항목을 삭제합니다.`}
          </p>
          {candidates.length > 1 ? (
            <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">삭제 대상</p>
              <ul className="mt-2 space-y-1">
                {candidates.slice(0, 5).map((entry) => (
                  <li key={entry.path} className="truncate">
                    {entry.path}
                  </li>
                ))}
                {candidates.length > 5 ? (
                  <li>외 {candidates.length - 5}개</li>
                ) : null}
              </ul>
            </div>
          ) : null}
          {requiresRecursiveConfirmation ? (
            <>
              <p className="text-sm leading-6 text-muted-foreground">
                {candidates.length > 1
                  ? "다중 선택 또는 디렉터리 삭제는 재귀 삭제를 포함할 수 있습니다. 안전하게 진행하려면 아래 입력칸에 "
                  : "디렉터리는 내부 파일까지 재귀 삭제합니다. 안전하게 진행하려면 아래 입력칸에 "}
                <span className="font-semibold text-foreground">
                  {RECURSIVE_DELETE_CONFIRMATION}
                </span>
                를 입력해 주십시오.
              </p>
              <Input
                autoComplete="off"
                placeholder={`재귀 삭제를 확인하려면 ${RECURSIVE_DELETE_CONFIRMATION} 입력`}
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.currentTarget.value)}
              />
            </>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || !confirmationReady}
            onClick={() => onConfirm(requiresRecursiveConfirmation)}
          >
            {isPending
              ? "삭제 중..."
              : requiresRecursiveConfirmation
                ? "재귀 삭제"
                : "삭제"}
          </Button>
        </div>
      </div>
    </div>
  );
}
