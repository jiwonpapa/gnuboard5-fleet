import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  cancelTransfer,
  downloadSftpFile,
  getTransferQueue,
  pauseTransfer,
  retryTransfer,
  runSftpOperation,
  setTransferConcurrency,
  uploadSftpFile,
  type SftpEntry,
  type TransferJob,
  type TransferQueueSnapshot,
} from "../../api/fleet";
import { SiteSftpBrowserList } from "./SiteSftpBrowserList";
import { SiteSftpDirectoryTree } from "./SiteSftpDirectoryTree";
import { SiteSftpEntryDetailsCard } from "./SiteSftpEntryDetailsCard";
import {
  formatEditableContent,
  resolveSiteSftpEditorLanguage,
} from "./siteSftpEditorLanguage";
import {
  buildPathAncestors,
  buildSuggestedSftpCopyPath,
  buildSftpChildPath,
  getSftpParentPath,
  inferFileName,
} from "./siteSftpBrowserHelpers";

type PathDialog =
  | { action: "mkdir"; title: string; value: string }
  | { action: "copy" | "rename"; title: string; value: string; entry: SftpEntry }
  | { action: "chmod"; title: string; value: string; entry: SftpEntry };

type EditorState = {
  entry: SftpEntry;
  content: string;
};

export function SiteSftpBrowserPage(props: {
  siteId: string;
  csrfToken: string;
  profileReady: boolean;
  onError: (message: string) => void;
}) {
  const { siteId, csrfToken, profileReady, onError } = props;
  const [currentPath, setCurrentPath] = useState("/");
  const [pathInput, setPathInput] = useState("/");
  const [entries, setEntries] = useState<SftpEntry[]>([]);
  const [rawOutput, setRawOutput] = useState("");
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<TransferQueueSnapshot | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [dialog, setDialog] = useState<PathDialog | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [retryUploadPath, setRetryUploadPath] = useState<string | null>(null);
  const uploadInput = useRef<HTMLInputElement | null>(null);
  const retryUploads = useRef<Map<string, File>>(new Map());

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedPaths.has(entry.path)),
    [entries, selectedPaths],
  );
  const selectedEntry = selectedEntries.at(-1) ?? null;

  const loadQueue = useCallback(async () => {
    if (!profileReady) return null;
    return await getTransferQueue(siteId);
  }, [profileReady, siteId]);

  const refreshQueue = useCallback(async () => {
    try {
      const next = await loadQueue();
      if (next) setSnapshot(next);
    } catch (caught) {
      onError(errorMessage(caught));
    }
  }, [loadQueue, onError]);

  const openDirectory = useCallback(async (path: string) => {
    if (!profileReady) return;
    setPendingAction("list");
    onError("");
    try {
      const result = await runSftpOperation(
        siteId,
        { action: "list", path },
        csrfToken,
      );
      const resolvedPath = result.resolved_path || path;
      setCurrentPath(resolvedPath);
      setPathInput(resolvedPath);
      setEntries(result.entries ?? []);
      setRawOutput(result.output);
      setSelectedPaths(new Set());
      setRecentPaths((current) => [
        resolvedPath,
        ...current.filter((entry) => entry !== resolvedPath),
      ].slice(0, 12));
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setPendingAction(null);
    }
  }, [csrfToken, onError, profileReady, siteId]);

  useEffect(() => {
    if (!profileReady) return;
    const timer = globalThis.setTimeout(() => {
      void Promise.all([openDirectory("/"), loadQueue()])
        .then(([, next]) => {
          if (next) setSnapshot(next);
        })
        .catch((caught: unknown) => onError(errorMessage(caught)));
    }, 0);
    return () => globalThis.clearTimeout(timer);
  }, [loadQueue, onError, openDirectory, profileReady]);

  useEffect(() => {
    if (!snapshot || snapshot.active_count + snapshot.queued_count === 0) return;
    const timer = globalThis.setInterval(() => void refreshQueue(), 1_000);
    return () => globalThis.clearInterval(timer);
  }, [refreshQueue, snapshot]);

  async function executeDialog() {
    if (!dialog) return;
    setPendingAction(dialog.action);
    onError("");
    try {
      if (dialog.action === "mkdir") {
        await runSftpOperation(
          siteId,
          { action: "mkdir", path: buildSftpChildPath(currentPath, dialog.value) },
          csrfToken,
        );
      } else if (dialog.action === "chmod") {
        await runSftpOperation(
          siteId,
          { action: "chmod", path: dialog.entry.path, mode: dialog.value },
          csrfToken,
        );
      } else {
        await runSftpOperation(
          siteId,
          { action: dialog.action, from: dialog.entry.path, to: dialog.value },
          csrfToken,
        );
      }
      setDialog(null);
      await openDirectory(currentPath);
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteSelected() {
    if (selectedEntries.length === 0) return;
    const label = selectedEntries.length === 1
      ? selectedEntries[0].name
      : `${selectedEntries.length}개 항목`;
    if (!globalThis.confirm(`${label}을(를) 삭제하시겠습니까?`)) return;
    setPendingAction("delete");
    onError("");
    try {
      for (const entry of selectedEntries) {
        await runSftpOperation(
          siteId,
          {
            action: entry.kind === "directory" ? "delete_directory" : "delete_file",
            path: entry.path,
          },
          csrfToken,
        );
      }
      await openDirectory(currentPath);
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setPendingAction(null);
    }
  }

  async function uploadFiles(files: File[], explicitRemotePath?: string) {
    if (files.length === 0) return;
    setPendingAction("upload");
    onError("");
    try {
      for (const file of files) {
        const remotePath = explicitRemotePath
          ?? buildSftpChildPath(currentPath, file.name);
        retryUploads.current.set(remotePath, file);
        await uploadSftpFile(
          siteId,
          remotePath,
          file,
          csrfToken,
        );
      }
      if (uploadInput.current) uploadInput.current.value = "";
      await Promise.all([openDirectory(currentPath), refreshQueue()]);
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setPendingAction(null);
    }
  }

  async function downloadEntry(entry: SftpEntry, openAsText = false) {
    if (entry.kind !== "file") {
      onError("현재 서버형 다운로드는 파일 단위로 지원합니다.");
      return;
    }
    setPendingAction("download");
    onError("");
    try {
      const result = await downloadSftpFile(siteId, entry.path, csrfToken);
      if (openAsText) {
        if (result.blob.size > 1024 * 1024) {
          throw new Error("웹 편집기는 1 MiB 이하 텍스트 파일만 엽니다.");
        }
        setEditor({ entry, content: await result.blob.text() });
      } else {
        saveBlob(result.blob, entry.name);
      }
      await refreshQueue();
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setPendingAction(null);
    }
  }

  async function downloadSelected() {
    for (const entry of selectedEntries) {
      await downloadEntry(entry);
    }
  }

  async function saveEditor() {
    if (!editor) return;
    const edited = new File([editor.content], editor.entry.name, {
      type: "text/plain;charset=utf-8",
    });
    setPendingAction("editor-save");
    try {
      await uploadSftpFile(siteId, editor.entry.path, edited, csrfToken);
      setEditor(null);
      await Promise.all([openDirectory(currentPath), refreshQueue()]);
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setPendingAction(null);
    }
  }

  async function mutateJob(
    job: TransferJob,
    operation: "cancel" | "pause" | "retry",
  ) {
    onError("");
    try {
      if (operation === "cancel") {
        await cancelTransfer(siteId, job.job_id, csrfToken);
      } else if (operation === "pause") {
        await pauseTransfer(siteId, job.job_id, csrfToken);
      } else {
        await retryTransfer(siteId, job.job_id, csrfToken);
        const retryPath = remotePath(job);
        if (job.kind === "sftp_download") {
          const retryEntry: SftpEntry = {
            name: inferFileName(retryPath),
            path: retryPath,
            kind: "file",
            size: null,
            permissions: "",
            owner: "",
            group: "",
            modified: "",
          };
          await downloadEntry(retryEntry);
        } else {
          const file = retryUploads.current.get(retryPath);
          if (file) {
            await uploadFiles([file], retryPath);
          } else {
            setRetryUploadPath(retryPath);
            uploadInput.current?.click();
          }
        }
      }
      await refreshQueue();
    } catch (caught) {
      onError(errorMessage(caught));
    }
  }

  async function changeConcurrency(event: ChangeEvent<HTMLSelectElement>) {
    try {
      setSnapshot(
        await setTransferConcurrency(
          siteId,
          Number(event.target.value),
          csrfToken,
        ),
      );
    } catch (caught) {
      onError(errorMessage(caught));
    }
  }

  function selectEntry(entry: SftpEntry, checked: boolean) {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (checked) next.add(entry.path);
      else next.delete(entry.path);
      return next;
    });
  }

  function selectAll(checked: boolean) {
    setSelectedPaths(checked ? new Set(entries.map((entry) => entry.path)) : new Set());
  }

  function prepareSingleAction(action: "copy" | "rename" | "chmod") {
    if (selectedEntries.length !== 1) return;
    const entry = selectedEntries[0];
    setDialog(
      action === "chmod"
        ? { action, title: "권한 변경", value: modeFromPermissions(entry.permissions), entry }
        : {
            action,
            title: action === "copy" ? "원격 복사" : "이동·이름 변경",
            value: action === "copy"
              ? buildSuggestedSftpCopyPath(entry.path)
              : entry.path,
            entry,
          },
    );
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  }

  if (!profileReady) {
    return (
      <article className="remote-panel">
        <h4>SFTP 사용 준비 중</h4>
        <p>SSH 탭에서 프로필과 서버 키 신뢰를 먼저 저장해 주십시오.</p>
      </article>
    );
  }

  const busy = pendingAction !== null;

  return (
    <div className="remote-stack">
      <section
        className="sftp-workspace"
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragActive(false);
        }}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="sftp-drop-overlay">
            <strong>Drag & Drop Upload</strong>
            <span>현재 경로 {currentPath}에 업로드합니다.</span>
          </div>
        )}

        <header className="sftp-workspace-header">
          <div>
            <span className="eyebrow">Server Files / reused workspace</span>
            <h4>SFTP 파일 브라우저</h4>
          </div>
          <div className="button-row">
            <button
              className="secondary-action"
              type="button"
              disabled={busy}
              onClick={() => void openDirectory(currentPath)}
            >
              목록 새로고침
            </button>
            <button
              className="primary-action"
              type="button"
              disabled={busy}
              onClick={() => {
                setRetryUploadPath(null);
                uploadInput.current?.click();
              }}
            >
              파일 업로드
            </button>
            <input
              ref={uploadInput}
              className="visually-hidden"
              aria-label="업로드 파일"
              type="file"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                const target = retryUploadPath;
                setRetryUploadPath(null);
                void uploadFiles(files, target ?? undefined);
              }}
            />
          </div>
        </header>

        <div className="sftp-path-bar">
          <button
            className="sftp-up-button"
            type="button"
            disabled={busy || currentPath === "/"}
            aria-label="상위 디렉터리"
            onClick={() => void openDirectory(getSftpParentPath(currentPath))}
          >
            ↑
          </button>
          <div className="sftp-breadcrumbs" aria-label="현재 경로 탐색">
            {buildPathAncestors(currentPath).map((part) => (
              <button
                key={part.path}
                type="button"
                onClick={() => void openDirectory(part.path)}
              >
                {part.label}
              </button>
            ))}
          </div>
          <form
            className="sftp-path-input"
            onSubmit={(event) => {
              event.preventDefault();
              void openDirectory(pathInput.trim() || "/");
            }}
          >
            <input
              aria-label="현재 remote path"
              value={pathInput}
              onChange={(event) => setPathInput(event.target.value)}
            />
            <button type="submit">경로 이동</button>
          </form>
        </div>

        <div className="sftp-selection-toolbar" data-visible={selectedEntries.length > 0}>
          <strong>{selectedEntries.length}개 선택</strong>
          <button
            type="button"
            disabled={selectedEntries.some((entry) => entry.kind !== "file")}
            onClick={() => void downloadSelected()}
          >
            다운로드
          </button>
          <button
            type="button"
            disabled={selectedEntries.length !== 1 || selectedEntry?.kind === "directory"}
            onClick={() => prepareSingleAction("copy")}
          >
            복사
          </button>
          <button
            type="button"
            disabled={selectedEntries.length !== 1}
            onClick={() => prepareSingleAction("rename")}
          >
            이동
          </button>
          <button
            type="button"
            disabled={selectedEntries.length !== 1}
            onClick={() => prepareSingleAction("chmod")}
          >
            권한
          </button>
          <button
            className="danger"
            type="button"
            disabled={selectedEntries.length === 0}
            onClick={() => void deleteSelected()}
          >
            삭제
          </button>
          <button type="button" onClick={() => setSelectedPaths(new Set())}>
            선택 해제
          </button>
        </div>

        <div className="sftp-workspace-grid">
          <SiteSftpDirectoryTree
            currentPath={currentPath}
            recentPaths={recentPaths}
            onOpen={(path) => void openDirectory(path)}
          />
          <main className="sftp-main-pane">
            <SiteSftpBrowserList
              entries={entries}
              pending={pendingAction === "list"}
              selectedPaths={selectedPaths}
              onOpenDirectory={(path) => void openDirectory(path)}
              onOpenEditor={(entry) => void downloadEntry(entry, true)}
              onSelect={selectEntry}
              onSelectAll={selectAll}
            />
          </main>
          <SiteSftpEntryDetailsCard
            entry={selectedEntry}
            onEdit={(entry) => void downloadEntry(entry, true)}
          />
        </div>

        <footer className="sftp-statusbar">
          <span>{currentPath}</span>
          <span>{entries.length} items · {pendingAction || "ready"}</span>
          <button
            type="button"
            onClick={() => setDialog({ action: "mkdir", title: "새 폴더", value: "" })}
          >
            + 새 폴더
          </button>
          <details>
            <summary>raw SFTP</summary>
            <pre aria-label="SFTP 결과">{rawOutput || "SFTP 출력 대기"}</pre>
          </details>
        </footer>
      </section>

      <TransferQueuePanel
        snapshot={snapshot}
        onConcurrency={changeConcurrency}
        onJob={mutateJob}
        onRefresh={refreshQueue}
      />

      {dialog && (
        <div className="remote-dialog-backdrop">
          <form
            className="remote-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sftp-dialog-title"
            onSubmit={(event) => {
              event.preventDefault();
              void executeDialog();
            }}
          >
            <header>
              <h4 id="sftp-dialog-title">{dialog.title}</h4>
              <button type="button" aria-label="닫기" onClick={() => setDialog(null)}>×</button>
            </header>
            <label>
              <span>
                {dialog.action === "mkdir"
                  ? "폴더 이름"
                  : dialog.action === "chmod"
                  ? "8진수 권한"
                  : "대상 절대 경로"}
              </span>
              <input
                autoFocus
                required
                pattern={dialog.action === "chmod" ? "0[0-7]{3}" : undefined}
                value={dialog.value}
                onChange={(event) => setDialog({ ...dialog, value: event.target.value })}
              />
            </label>
            <div className="button-row">
              <button className="primary-action" type="submit" disabled={busy}>실행</button>
              <button
                className="secondary-action"
                type="button"
                onClick={() => setDialog(null)}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {editor && (
        <div className="remote-dialog-backdrop">
          <section className="remote-dialog sftp-editor-dialog" role="dialog" aria-modal="true">
            <header>
              <div>
                <h4>{editor.entry.name}</h4>
                <span>{resolveSiteSftpEditorLanguage(editor.entry.path)} · 1 MiB limit</span>
              </div>
              <button type="button" aria-label="편집기 닫기" onClick={() => setEditor(null)}>×</button>
            </header>
            <textarea
              aria-label="SFTP 텍스트 편집기"
              spellCheck={false}
              value={editor.content}
              onChange={(event) => setEditor({ ...editor, content: event.target.value })}
            />
            <div className="button-row">
              <button
                className="primary-action"
                type="button"
                disabled={busy}
                onClick={() => void saveEditor()}
              >
                서버에 저장
              </button>
              <button
                className="secondary-action"
                type="button"
                disabled={formatEditableContent(editor.entry.path, editor.content) === null}
                onClick={() => {
                  const formatted = formatEditableContent(editor.entry.path, editor.content);
                  if (formatted !== null) setEditor({ ...editor, content: formatted });
                }}
              >
                JSON 포맷
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function TransferQueuePanel(props: {
  snapshot: TransferQueueSnapshot | null;
  onConcurrency: (event: ChangeEvent<HTMLSelectElement>) => Promise<void>;
  onJob: (
    job: TransferJob,
    operation: "cancel" | "pause" | "retry",
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <article className="remote-panel transfer-queue">
      <header>
        <div>
          <h4>SFTP 전송 큐</h4>
          <p>최근 48건의 영속 상태, 실제 process 중단과 재전송을 관리합니다.</p>
        </div>
        <span>
          active {props.snapshot?.active_count ?? 0} · queued{" "}
          {props.snapshot?.queued_count ?? 0}
        </span>
      </header>
      <div className="transfer-toolbar">
        <label>
          <span>동시 전송</span>
          <select
            aria-label="동시 전송"
            value={props.snapshot?.concurrency_limit ?? 2}
            onChange={(event) => void props.onConcurrency(event)}
          >
            {[1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <button className="secondary-action" type="button" onClick={() => void props.onRefresh()}>
          상태 새로고침
        </button>
      </div>
      {props.snapshot?.jobs.length ? (
        <ul className="transfer-list">
          {props.snapshot.jobs.map((job) => {
            const paused = job.state === "cancelled"
              && isRecord(job.result)
              && job.result.paused === true;
            return (
              <li key={job.job_id}>
                <div>
                  <strong>{job.kind === "sftp_upload" ? "업로드" : "다운로드"}</strong>
                  <span>{remotePath(job)} · {paused ? "paused" : job.state}</span>
                </div>
                <div className="button-row">
                  {(job.state === "queued" || job.state === "running") && (
                    <>
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() => void props.onJob(job, "pause")}
                      >
                        일시정지
                      </button>
                      <button
                        className="secondary-action danger"
                        type="button"
                        onClick={() => void props.onJob(job, "cancel")}
                      >
                        취소
                      </button>
                    </>
                  )}
                  {(job.state === "failed" || paused) && (
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={() => void props.onJob(job, "retry")}
                    >
                      재시도
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty-state">전송 이력이 없습니다.</p>
      )}
    </article>
  );
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function remotePath(job: TransferJob) {
  return isRecord(job.input) && typeof job.input.remote_path === "string"
    ? job.input.remote_path
    : job.job_id;
}

function modeFromPermissions(value: string) {
  if (!/^[dl-][rwx-]{9}$/.test(value)) return "0644";
  const chunks = [value.slice(1, 4), value.slice(4, 7), value.slice(7, 10)];
  return `0${chunks.map((chunk) => (
    (chunk[0] === "r" ? 4 : 0)
    + (chunk[1] === "w" ? 2 : 0)
    + (chunk[2] === "x" ? 1 : 0)
  )).join("")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "SFTP 작업에 실패했습니다.";
}
