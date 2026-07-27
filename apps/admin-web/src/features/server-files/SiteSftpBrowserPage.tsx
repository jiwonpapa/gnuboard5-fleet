import {
  type ChangeEvent,
  useCallback,
  useEffect,
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
  type SftpOperation,
  type TransferJob,
  type TransferQueueSnapshot,
} from "../../api/fleet";
import {
  formatEditableContent,
  resolveSiteSftpEditorLanguage,
} from "./siteSftpEditorLanguage";

type SftpAction =
  | "stat"
  | "mkdir"
  | "chmod"
  | "copy"
  | "rename"
  | "delete_file"
  | "delete_directory";

export function SiteSftpBrowserPage(props: {
  siteId: string;
  csrfToken: string;
  profileReady: boolean;
  onError: (message: string) => void;
}) {
  const {
    siteId,
    csrfToken,
    profileReady,
    onError,
  } = props;
  const [path, setPath] = useState("/");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState("0644");
  const [action, setAction] = useState<SftpAction>("stat");
  const [output, setOutput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editorContent, setEditorContent] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TransferQueueSnapshot | null>(null);
  const [pending, setPending] = useState(false);

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

  useEffect(() => {
    void loadQueue()
      .then((next) => {
        if (next) setSnapshot(next);
      })
      .catch((caught: unknown) => onError(errorMessage(caught)));
  }, [loadQueue, onError]);

  useEffect(() => {
    if (!snapshot || snapshot.active_count + snapshot.queued_count === 0) return;
    const timer = globalThis.setInterval(() => void refreshQueue(), 2_000);
    return () => globalThis.clearInterval(timer);
  }, [refreshQueue, snapshot]);

  async function execute(operation: SftpOperation) {
    setPending(true);
    onError("");
    try {
      const result = await runSftpOperation(
        siteId,
        operation,
        csrfToken,
      );
      setOutput(result.output || "완료");
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  function selectedOperation(): SftpOperation {
    switch (action) {
      case "stat":
      case "mkdir":
      case "delete_file":
      case "delete_directory":
        return { action, path };
      case "chmod":
        return { action, path, mode };
      case "copy":
      case "rename":
        return { action, from: path, to: destination };
    }
  }

  async function executeSelected() {
    if (
      action.startsWith("delete_")
      && !globalThis.confirm(`${path} 항목을 삭제하시겠습니까?`)
    ) return;
    await execute(selectedOperation());
  }

  async function upload(uploadFile = file, remotePath = path) {
    if (!uploadFile) return;
    setPending(true);
    onError("");
    try {
      await uploadSftpFile(siteId, remotePath, uploadFile, csrfToken);
      setFile(null);
      await refreshQueue();
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function download(saveAsFile: boolean, remotePath = path) {
    setPending(true);
    onError("");
    try {
      const result = await downloadSftpFile(
        siteId,
        remotePath,
        csrfToken,
      );
      if (saveAsFile) {
        const url = URL.createObjectURL(result.blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName(remotePath);
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        if (result.blob.size > 1024 * 1024) {
          throw new Error("웹 편집기는 1 MiB 이하 텍스트 파일만 엽니다.");
        }
        setEditorContent(await result.blob.text());
      }
      await refreshQueue();
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function saveEditor() {
    if (editorContent === null) return;
    const edited = new File([editorContent], fileName(path), {
      type: "text/plain;charset=utf-8",
    });
    await upload(edited);
  }

  async function mutateJob(
    job: TransferJob,
    operation: "cancel" | "pause" | "retry",
  ) {
    setPending(true);
    onError("");
    try {
      if (operation === "cancel") {
        await cancelTransfer(siteId, job.job_id, csrfToken);
      } else if (operation === "pause") {
        await pauseTransfer(siteId, job.job_id, csrfToken);
      } else {
        const retryPath = remotePath(job);
        if (job.kind === "sftp_upload" && !file) {
          throw new Error("업로드 재시도에는 원본 파일을 다시 선택해야 합니다.");
        }
        await retryTransfer(siteId, job.job_id, csrfToken);
        if (job.kind === "sftp_upload") {
          await upload(file, retryPath);
        } else {
          await download(true, retryPath);
        }
      }
      await refreshQueue();
    } catch (caught) {
      onError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function changeConcurrency(event: ChangeEvent<HTMLSelectElement>) {
    setPending(true);
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
    } finally {
      setPending(false);
    }
  }

  if (!profileReady) {
    return (
      <article className="remote-panel">
        <h4>SFTP 사용 준비 중</h4>
        <p>SSH 탭에서 프로필과 서버 키 신뢰를 먼저 저장해 주십시오.</p>
      </article>
    );
  }

  const language = resolveSiteSftpEditorLanguage(path);
  const formatted = editorContent === null
    ? null
    : formatEditableContent(path, editorContent);

  return (
    <div className="remote-stack">
      <article className="remote-panel">
        <header>
          <div>
            <h4>SFTP 파일 브라우저</h4>
            <p>절대 경로 기준으로 조회·복사·이동·권한·편집을 수행합니다.</p>
          </div>
          <span>OpenSSH SFTP</span>
        </header>
        <div className="sftp-path-bar">
          <label>
            <span>현재 remote path</span>
            <input
              aria-label="현재 remote path"
              value={path}
              onChange={(event) => {
                setPath(event.target.value);
                setEditorContent(null);
              }}
            />
          </label>
          <button
            className="primary-action"
            type="button"
            disabled={pending}
            onClick={() => void execute({ action: "list", path })}
          >
            목록 새로고침
          </button>
        </div>
        <pre className="sftp-output" aria-label="SFTP 결과">
          {output || "SFTP 출력 대기"}
        </pre>
        <div className="sftp-operation-bar">
          <label>
            <span>작업</span>
            <select
              aria-label="SFTP 작업"
              value={action}
              onChange={(event) => setAction(event.target.value as SftpAction)}
            >
              <option value="stat">정보</option>
              <option value="mkdir">폴더 생성</option>
              <option value="chmod">권한 변경</option>
              <option value="copy">복사</option>
              <option value="rename">이동·이름 변경</option>
              <option value="delete_file">파일 삭제</option>
              <option value="delete_directory">빈 폴더 삭제</option>
            </select>
          </label>
          {(action === "copy" || action === "rename") && (
            <label>
              <span>대상 절대 경로</span>
              <input
                aria-label="대상 절대 경로"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              />
            </label>
          )}
          {action === "chmod" && (
            <label>
              <span>권한</span>
              <input
                aria-label="8진수 권한"
                pattern="0[0-7]{3}"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
              />
            </label>
          )}
          <button
            className={action.startsWith("delete_")
              ? "secondary-action danger"
              : "secondary-action"}
            type="button"
            disabled={pending}
            onClick={() => void executeSelected()}
          >
            작업 실행
          </button>
        </div>
      </article>

      <article className="remote-panel">
        <header>
          <div>
            <h4>전송·텍스트 편집</h4>
            <p>업로드·다운로드는 서버를 경유하며 브라우저에 SSH 비밀을 두지 않습니다.</p>
          </div>
          <span>{language}</span>
        </header>
        <input
          aria-label="업로드 파일"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <div className="button-row">
          <button
            className="primary-action"
            type="button"
            disabled={pending || !file}
            onClick={() => void upload()}
          >
            업로드
          </button>
          <button
            className="secondary-action"
            type="button"
            disabled={pending}
            onClick={() => void download(true)}
          >
            다운로드
          </button>
          <button
            className="secondary-action"
            type="button"
            disabled={pending}
            onClick={() => void download(false)}
          >
            텍스트 열기
          </button>
        </div>
        {editorContent !== null && (
          <div className="sftp-editor">
            <label>
              <span>{path} · {language}</span>
              <textarea
                aria-label="SFTP 텍스트 편집기"
                value={editorContent}
                onChange={(event) => setEditorContent(event.target.value)}
              />
            </label>
            <div className="button-row">
              <button
                className="primary-action"
                type="button"
                disabled={pending}
                onClick={() => void saveEditor()}
              >
                서버에 저장
              </button>
              <button
                className="secondary-action"
                type="button"
                disabled={formatted === null}
                onClick={() => formatted !== null && setEditorContent(formatted)}
              >
                JSON 포맷
              </button>
              <button
                className="secondary-action"
                type="button"
                onClick={() => setEditorContent(null)}
              >
                편집기 닫기
              </button>
            </div>
          </div>
        )}
      </article>

      <TransferQueuePanel
        pending={pending}
        snapshot={snapshot}
        onConcurrency={changeConcurrency}
        onJob={mutateJob}
        onRefresh={refreshQueue}
      />
    </div>
  );
}

function TransferQueuePanel(props: {
  pending: boolean;
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
          <p>최근 48건의 영속 상태와 중단·재시도 경계를 표시합니다.</p>
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
            disabled={props.pending}
            value={props.snapshot?.concurrency_limit ?? 2}
            onChange={(event) => void props.onConcurrency(event)}
          >
            {[1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <button
          className="secondary-action"
          type="button"
          disabled={props.pending}
          onClick={() => void props.onRefresh()}
        >
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

function remotePath(job: TransferJob) {
  return isRecord(job.input) && typeof job.input.remote_path === "string"
    ? job.input.remote_path
    : job.job_id;
}

function fileName(path: string) {
  return path.split("/").filter(Boolean).at(-1) ?? "download.bin";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "SFTP 작업에 실패했습니다.";
}
