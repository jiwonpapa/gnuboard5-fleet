import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  type SshProfileInput,
  type SshProfileSummary,
  type TransferJob,
  downloadSftpFile,
  getSshProfile,
  issueTerminalTicket,
  openTerminalSocket,
  putSshProfile,
  runSftpOperation,
  uploadSftpFile,
} from "../api/fleet";

export function RemoteWorkspace(props: {
  siteId: string;
  csrfToken: string;
}) {
  const [profile, setProfile] = useState<SshProfileSummary | null>(null);
  const [sftpOutput, setSftpOutput] = useState("");
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalState, setTerminalState] = useState("닫힘");
  const [job, setJob] = useState<TransferJob | null>(null);
  const [error, setError] = useState("");
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    void getSshProfile(props.siteId)
      .then(setProfile)
      .catch(() => setProfile(null));
    return () => socket.current?.close();
  }, [props.siteId]);

  async function connectTerminal() {
    setError("");
    try {
      const issued = await issueTerminalTicket(props.siteId, props.csrfToken);
      const next = openTerminalSocket(props.siteId, issued.ticket);
      socket.current = next;
      next.binaryType = "arraybuffer";
      next.onopen = () => setTerminalState("연결됨");
      next.onclose = () => setTerminalState("닫힘");
      next.onerror = () => setError("터미널 연결에 실패했습니다.");
      next.onmessage = (event) => {
        if (typeof event.data === "string") {
          setTerminalOutput((value) => value + event.data);
        } else if (event.data instanceof ArrayBuffer) {
          setTerminalOutput((value) =>
            value + new TextDecoder().decode(event.data)
          );
        }
      };
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  function sendTerminal(value: string) {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(`${value}\n`);
    }
  }

  return (
    <section className="remote-workspace" aria-labelledby="remote-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Remote / server-owned transport</span>
          <h3 id="remote-title">SSH 터미널·SFTP</h3>
          <p>
            개인키와 known_hosts는 서버 암호화 저장소에만 두고 브라우저에는
            반환하지 않습니다.
          </p>
        </div>
        <span className="registry-state">
          {profile
            ? `${profile.username}@${profile.host}:${profile.port}`
            : "SSH profile 미설정"}
        </span>
      </div>

      <ProfileForm
        siteId={props.siteId}
        csrfToken={props.csrfToken}
        onSaved={setProfile}
        onError={setError}
      />

      <div className="remote-grid">
        <TerminalPanel
          state={terminalState}
          output={terminalOutput}
          onConnect={connectTerminal}
          onSend={sendTerminal}
        />
        <SftpPanel
          siteId={props.siteId}
          csrfToken={props.csrfToken}
          output={sftpOutput}
          onOutput={setSftpOutput}
          onJob={setJob}
          onError={setError}
        />
      </div>

      {job && (
        <p className="transfer-state">
          전송 {job.job_id} · <strong>{job.state}</strong>
        </p>
      )}
      {error && <p className="flow-error" role="alert">{error}</p>}
    </section>
  );
}

function ProfileForm(props: {
  siteId: string;
  csrfToken: string;
  onSaved: (profile: SshProfileSummary) => void;
  onError: (error: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [privateKey, setPrivateKey] = useState("");
  const [knownHosts, setKnownHosts] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const profile: SshProfileInput = {
      username,
      host,
      port: Number(port),
      private_key: privateKey,
      known_hosts: knownHosts,
    };
    try {
      props.onSaved(
        await putSshProfile(props.siteId, profile, props.csrfToken),
      );
      setPrivateKey("");
      setKnownHosts("");
    } catch (caught) {
      props.onError(errorMessage(caught));
    }
  }

  return (
    <details className="remote-profile">
      <summary>SSH profile 등록·교체</summary>
      <form className="remote-profile-form" onSubmit={(event) => void submit(event)}>
        <label>
          <span>사용자</span>
          <input required value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          <span>호스트</span>
          <input required value={host} onChange={(e) => setHost(e.target.value)} />
        </label>
        <label>
          <span>포트</span>
          <input
            required
            min="1"
            max="65535"
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </label>
        <label className="wide">
          <span>OpenSSH 개인키</span>
          <textarea
            required
            autoComplete="off"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
          />
        </label>
        <label className="wide">
          <span>known_hosts · 사전 검증한 host key</span>
          <textarea
            required
            autoComplete="off"
            value={knownHosts}
            onChange={(e) => setKnownHosts(e.target.value)}
          />
        </label>
        <button className="primary-action" type="submit">암호화 저장</button>
      </form>
    </details>
  );
}

function TerminalPanel(props: {
  state: string;
  output: string;
  onConnect: () => Promise<void>;
  onSend: (value: string) => void;
}) {
  const [command, setCommand] = useState("");
  return (
    <article className="remote-panel">
      <header>
        <h4>일회성 WebSocket 터미널</h4>
        <span>{props.state}</span>
      </header>
      <pre className="terminal-output">{props.output || "출력 대기"}</pre>
      <form
        className="terminal-input"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSend(command);
          setCommand("");
        }}
      >
        <input
          aria-label="터미널 입력"
          autoComplete="off"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
        />
        <button className="secondary-action" type="submit">전송</button>
      </form>
      <button
        className="primary-action"
        type="button"
        onClick={() => void props.onConnect()}
      >
        ticket 발급 후 연결
      </button>
    </article>
  );
}

function SftpPanel(props: {
  siteId: string;
  csrfToken: string;
  output: string;
  onOutput: (output: string) => void;
  onJob: (job: TransferJob) => void;
  onError: (error: string) => void;
}) {
  const [path, setPath] = useState("/");
  const [file, setFile] = useState<File | null>(null);

  async function run(action: "list" | "mkdir" | "delete_file") {
    try {
      const result = await runSftpOperation(
        props.siteId,
        { action, path },
        props.csrfToken,
      );
      props.onOutput(result.output);
    } catch (caught) {
      props.onError(errorMessage(caught));
    }
  }

  async function upload() {
    if (!file) return;
    try {
      props.onJob(
        await uploadSftpFile(props.siteId, path, file, props.csrfToken),
      );
      setFile(null);
    } catch (caught) {
      props.onError(errorMessage(caught));
    }
  }

  async function download() {
    try {
      const result = await downloadSftpFile(
        props.siteId,
        path,
        props.csrfToken,
      );
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = path.split("/").filter(Boolean).at(-1) ?? "download.bin";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      props.onError(errorMessage(caught));
    }
  }

  return (
    <article className="remote-panel">
      <header>
        <h4>SFTP 파일·전송</h4>
        <span>64 MiB 제한</span>
      </header>
      <label>
        <span>절대 remote path</span>
        <input value={path} onChange={(event) => setPath(event.target.value)} />
      </label>
      <div className="button-row">
        <button className="secondary-action" type="button" onClick={() => void run("list")}>
          목록
        </button>
        <button className="secondary-action" type="button" onClick={() => void run("mkdir")}>
          폴더 생성
        </button>
        <button
          className="secondary-action danger"
          type="button"
          onClick={() => void run("delete_file")}
        >
          파일 삭제
        </button>
      </div>
      <pre className="sftp-output">{props.output || "SFTP 출력 대기"}</pre>
      <input
        aria-label="업로드 파일"
        type="file"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <div className="button-row">
        <button
          className="primary-action"
          type="button"
          disabled={!file}
          onClick={() => void upload()}
        >
          스트리밍 업로드
        </button>
        <button className="secondary-action" type="button" onClick={() => void download()}>
          스트리밍 다운로드
        </button>
      </div>
    </article>
  );
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "원격 작업에 실패했습니다.";
}
