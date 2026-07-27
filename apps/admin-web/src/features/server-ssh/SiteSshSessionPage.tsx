import {
  type FormEvent,
  useCallback,
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
import {
  SiteSshXtermSurface,
  type SiteSshXtermSurfaceHandle,
} from "./SiteSshXtermSurface";

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
  const { csrfToken, onError, profileReady, siteId } = props;
  const [transcript, setTranscript] = useState("");
  const [command, setCommand] = useState("");
  const [state, setState] = useState<"closed" | "connecting" | "connected">(
    "closed",
  );
  const [fontSize, setFontSize] = useState(13);
  const [viewport, setViewport] = useState<"compact" | "standard" | "tall">(
    "standard",
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [keepConnected, setKeepConnected] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const surface = useRef<SiteSshXtermSurfaceHandle | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const keepConnectedRef = useRef(false);
  const shouldReconnect = useRef(false);
  const mounted = useRef(true);
  const connectRef = useRef<(manual?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    keepConnectedRef.current = keepConnected;
    if (!keepConnected && reconnectTimer.current !== null) {
      globalThis.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, [keepConnected]);

  const scheduleReconnect = useCallback(() => {
    if (
      !mounted.current
      || !shouldReconnect.current
      || !keepConnectedRef.current
      || !profileReady
      || reconnectTimer.current !== null
      || reconnectAttempts.current >= 3
    ) {
      return;
    }

    const delay = 1_000 * (2 ** reconnectAttempts.current);
    reconnectAttempts.current += 1;
    reconnectTimer.current = globalThis.setTimeout(() => {
      reconnectTimer.current = null;
      void connectRef.current(false);
    }, delay);
  }, [profileReady]);

  const connect = useCallback(async (manual = true) => {
    if (!profileReady) return;
    if (manual) reconnectAttempts.current = 0;
    if (reconnectTimer.current !== null) {
      globalThis.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    const previous = socket.current;
    socket.current = null;
    previous?.close();
    shouldReconnect.current = true;
    setState("connecting");
    onError("");
    try {
      const issued = await issueTerminalTicket(siteId, csrfToken);
      if (!mounted.current || !shouldReconnect.current) return;
      const next = openTerminalSocket(siteId, issued.ticket);
      socket.current = next;
      next.binaryType = "arraybuffer";
      next.onopen = () => {
        if (socket.current !== next) return;
        reconnectAttempts.current = 0;
        setState("connected");
        surface.current?.focus();
      };
      next.onclose = () => {
        if (socket.current !== next) return;
        socket.current = null;
        setState("closed");
        scheduleReconnect();
      };
      next.onerror = () => {
        if (socket.current === next) {
          onError("터미널 연결에 실패했습니다.");
          next.close();
        }
      };
      next.onmessage = (event) => {
        const chunk = typeof event.data === "string"
          ? event.data
          : event.data instanceof ArrayBuffer
          ? new TextDecoder().decode(event.data)
          : "";
        if (!chunk) return;
        surface.current?.write(chunk);
        setTranscript((value) => `${value}${chunk}`.slice(-200_000));
      };
    } catch (caught) {
      if (!mounted.current) return;
      setState("closed");
      onError(errorMessage(caught));
      scheduleReconnect();
    }
  }, [
    csrfToken,
    onError,
    profileReady,
    siteId,
    scheduleReconnect,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      shouldReconnect.current = false;
      if (reconnectTimer.current !== null) {
        globalThis.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      const active = socket.current;
      socket.current = null;
      active?.close();
    };
  }, [siteId]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  function disconnect() {
    shouldReconnect.current = false;
    if (reconnectTimer.current !== null) {
      globalThis.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    const active = socket.current;
    socket.current = null;
    active?.close();
    setState("closed");
  }

  function sendData(value: string) {
    if (socket.current?.readyState !== WebSocket.OPEN || !value) return;
    socket.current.send(value);
  }

  function send(event: FormEvent) {
    event.preventDefault();
    sendData(`${command}\n`);
    setCommand("");
    surface.current?.focus();
  }

  const presets = [
    { label: "현재 경로", command: "pwd" },
    { label: "파일 목록", command: "ls -la" },
    { label: "디스크", command: "df -h" },
    { label: "메모리", command: "free -h" },
    { label: "프로세스", command: "ps aux --sort=-%mem | head" },
  ];

  return (
    <article
      className={`ssh-terminal-workspace${fullscreen ? " is-fullscreen" : ""}`}
    >
      <header className="ssh-terminal-header">
        <div>
          <h4>SSH 터미널</h4>
          <p>일회성 ticket은 URL이 아닌 WebSocket subprotocol로만 전달됩니다.</p>
        </div>
        <span className="ssh-connection-state" data-state={state}>{state}</span>
      </header>

      <div className="ssh-terminal-toolbar">
        <div className="button-row">
          <button
            className="primary-action"
            type="button"
            disabled={!profileReady || state === "connecting"}
            onClick={() => void connect(true)}
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
            onClick={() => {
              setTranscript("");
              surface.current?.reset();
            }}
          >
            화면 지우기
          </button>
        </div>
        <div className="ssh-terminal-controls">
          <button
            type="button"
            aria-label="터미널 글꼴 축소"
            onClick={() => setFontSize((value) => Math.max(11, value - 1))}
          >
            −
          </button>
          <button type="button" onClick={() => setFontSize(13)}>{fontSize}px</button>
          <button
            type="button"
            aria-label="터미널 글꼴 확대"
            onClick={() => setFontSize((value) => Math.min(20, value + 1))}
          >
            +
          </button>
          {(["compact", "standard", "tall"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewport === mode}
              onClick={() => setViewport(mode)}
            >
              {mode === "compact" ? "S" : mode === "standard" ? "M" : "L"}
            </button>
          ))}
          <label className="ssh-keep-connected">
            <input
              type="checkbox"
              aria-label={keepConnected ? "연결유지 on" : "연결유지 off"}
              checked={keepConnected}
              onChange={(event) => setKeepConnected(event.target.checked)}
            />
            연결유지
          </label>
          <button
            type="button"
            aria-label={fullscreen ? "작업면 최대화 해제" : "작업면 최대화"}
            onClick={() => setFullscreen((value) => !value)}
          >
            {fullscreen ? "축소" : "최대화"}
          </button>
        </div>
      </div>

      <div className="ssh-command-presets" aria-label="빠른 명령">
        {presets.map((preset, index) => (
          <button
            key={preset.command}
            type="button"
            disabled={state !== "connected"}
            title={preset.command}
            onClick={() => {
              sendData(`${preset.command}\n`);
              surface.current?.focus();
            }}
          >
            <span>{index + 1}</span>
            {preset.label}
          </button>
        ))}
      </div>

      <SiteSshXtermSurface
        ref={surface}
        active={state === "connected"}
        fontSize={fontSize}
        transcript={transcript}
        viewport={viewport}
        onData={sendData}
      />

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
      <p className="ssh-session-note">
        연결유지는 현재 브라우저 세션에서만 최대 3회 재연결합니다.
      </p>
    </article>
  );
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "SSH 작업에 실패했습니다.";
}
