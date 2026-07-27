import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  deleteSshProfile,
  inspectSshHostKey,
  issueTerminalTicket,
  openTerminalSocket,
  putSshProfile,
  type HostKeyInspection,
  type SshProfileSummary,
} from "../../api/fleet";

export function SiteSshSessionPage(props: {
  siteId: string;
  csrfToken: string;
  profile: SshProfileSummary | null;
  onProfileChange: (profile: SshProfileSummary | null) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="remote-stack">
      <SshProfilePanel
        key={props.profile
          ? `${props.profile.username}@${props.profile.host}:${props.profile.port}`
          : "empty"}
        {...props}
      />
      <SshTerminalPanel
        csrfToken={props.csrfToken}
        profileReady={props.profile !== null}
        siteId={props.siteId}
        onError={props.onError}
      />
    </div>
  );
}

function SshProfilePanel(props: {
  siteId: string;
  csrfToken: string;
  profile: SshProfileSummary | null;
  onProfileChange: (profile: SshProfileSummary | null) => void;
  onError: (message: string) => void;
}) {
  const [username, setUsername] = useState(props.profile?.username ?? "");
  const [host, setHost] = useState(props.profile?.host ?? "");
  const [port, setPort] = useState(String(props.profile?.port ?? 22));
  const [privateKey, setPrivateKey] = useState("");
  const [inspection, setInspection] = useState<HostKeyInspection | null>(null);
  const [trusted, setTrusted] = useState(false);
  const [pending, setPending] = useState(false);

  function invalidateInspection() {
    setInspection(null);
    setTrusted(false);
  }

  async function inspect() {
    setPending(true);
    props.onError("");
    try {
      setInspection(
        await inspectSshHostKey(
          props.siteId,
          host.trim(),
          Number(port),
          props.csrfToken,
        ),
      );
      setTrusted(false);
    } catch (caught) {
      props.onError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!inspection || !trusted) {
      props.onError("서버 키 지문을 확인하고 명시적으로 신뢰해 주십시오.");
      return;
    }
    setPending(true);
    props.onError("");
    try {
      props.onProfileChange(
        await putSshProfile(
          props.siteId,
          {
            username: username.trim(),
            host: inspection.host,
            port: inspection.port,
            private_key: privateKey,
            known_hosts: inspection.known_hosts_line,
          },
          props.csrfToken,
        ),
      );
      setPrivateKey("");
      setInspection(null);
      setTrusted(false);
    } catch (caught) {
      props.onError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    props.onError("");
    try {
      await deleteSshProfile(props.siteId, props.csrfToken);
      props.onProfileChange(null);
      setPrivateKey("");
      setInspection(null);
      setTrusted(false);
    } catch (caught) {
      props.onError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="remote-panel">
      <header>
        <div>
          <h4>SSH 프로필·호스트 신뢰</h4>
          <p>서버 키를 먼저 관측하고 SHA-256 지문 확인 후 저장합니다.</p>
        </div>
        <span>{props.profile ? "strict / trusted" : "미설정"}</span>
      </header>
      {props.profile && (
        <div className="remote-profile-summary">
          <strong>
            {props.profile.username}@{props.profile.host}:{props.profile.port}
          </strong>
          <span>
            {props.profile.server_key_algorithm} ·{" "}
            {props.profile.server_key_fingerprint}
          </span>
        </div>
      )}
      <form className="remote-profile-form" onSubmit={(event) => void save(event)}>
        <label>
          <span>사용자</span>
          <input
            aria-label="사용자"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          <span>호스트</span>
          <input
            aria-label="호스트"
            required
            value={host}
            onChange={(event) => {
              setHost(event.target.value);
              invalidateInspection();
            }}
          />
        </label>
        <label>
          <span>포트</span>
          <input
            aria-label="포트"
            required
            min="1"
            max="65535"
            type="number"
            value={port}
            onChange={(event) => {
              setPort(event.target.value);
              invalidateInspection();
            }}
          />
        </label>
        <label className="wide">
          <span>OpenSSH 개인키</span>
          <textarea
            aria-label="OpenSSH 개인키"
            required
            autoComplete="off"
            value={privateKey}
            onChange={(event) => setPrivateKey(event.target.value)}
          />
        </label>
        <div className="wide host-key-inspection">
          <button
            className="secondary-action"
            type="button"
            disabled={pending || !host.trim()}
            onClick={() => void inspect()}
          >
            서버 키 지문 검사
          </button>
          {inspection && (
            <div>
              <strong>{inspection.server_key_algorithm}</strong>
              <code>{inspection.server_key_fingerprint}</code>
              <label className="trust-check">
                <input
                  aria-label="이 서버 키 지문을 신뢰"
                  type="checkbox"
                  checked={trusted}
                  onChange={(event) => setTrusted(event.target.checked)}
                />
                이 서버 키 지문을 신뢰
              </label>
            </div>
          )}
        </div>
        <div className="wide button-row">
          <button
            className="primary-action"
            type="submit"
            disabled={pending || !inspection || !trusted}
          >
            암호화 저장
          </button>
          {props.profile && (
            <button
              className="secondary-action danger"
              type="button"
              disabled={pending}
              onClick={() => void remove()}
            >
              프로필 삭제
            </button>
          )}
        </div>
      </form>
    </article>
  );
}

function SshTerminalPanel(props: {
  siteId: string;
  csrfToken: string;
  profileReady: boolean;
  onError: (message: string) => void;
}) {
  const [output, setOutput] = useState("");
  const [command, setCommand] = useState("");
  const [state, setState] = useState<"closed" | "connecting" | "connected">(
    "closed",
  );
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => socket.current?.close();
  }, [props.siteId]);

  async function connect() {
    socket.current?.close();
    setState("connecting");
    props.onError("");
    try {
      const issued = await issueTerminalTicket(props.siteId, props.csrfToken);
      const next = openTerminalSocket(props.siteId, issued.ticket);
      socket.current = next;
      next.binaryType = "arraybuffer";
      next.onopen = () => setState("connected");
      next.onclose = () => setState("closed");
      next.onerror = () => props.onError("터미널 연결에 실패했습니다.");
      next.onmessage = (event) => {
        if (typeof event.data === "string") {
          setOutput((value) => value + event.data);
        } else if (event.data instanceof ArrayBuffer) {
          setOutput((value) => value + new TextDecoder().decode(event.data));
        }
      };
    } catch (caught) {
      setState("closed");
      props.onError(errorMessage(caught));
    }
  }

  function disconnect() {
    socket.current?.close();
    socket.current = null;
    setState("closed");
  }

  function send(event: FormEvent) {
    event.preventDefault();
    if (socket.current?.readyState !== WebSocket.OPEN || !command) return;
    socket.current.send(`${command}\n`);
    setCommand("");
  }

  return (
    <article className="remote-panel">
      <header>
        <div>
          <h4>SSH 터미널</h4>
          <p>일회성 ticket은 URL이 아닌 WebSocket subprotocol로만 전달됩니다.</p>
        </div>
        <span>{state}</span>
      </header>
      <pre className="terminal-output" aria-label="터미널 출력">
        {output || "출력 대기"}
      </pre>
      <form className="terminal-input" onSubmit={send}>
        <input
          aria-label="터미널 입력"
          autoComplete="off"
          disabled={state !== "connected"}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
        />
        <button
          className="secondary-action"
          type="submit"
          disabled={state !== "connected"}
        >
          전송
        </button>
      </form>
      <div className="button-row">
        <button
          className="primary-action"
          type="button"
          disabled={!props.profileReady || state === "connecting"}
          onClick={() => void connect()}
        >
          {state === "connected" ? "재연결" : "연결"}
        </button>
        <button
          className="secondary-action"
          type="button"
          disabled={state === "closed"}
          onClick={disconnect}
        >
          연결 해제
        </button>
        <button
          className="secondary-action"
          type="button"
          onClick={() => setOutput("")}
        >
          출력 지우기
        </button>
      </div>
    </article>
  );
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "SSH 작업에 실패했습니다.";
}
