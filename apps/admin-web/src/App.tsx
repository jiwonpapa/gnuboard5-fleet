import { useEffect, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";

import { getHealth, getMeta, type MetaResponse } from "./api/system";
import { VerticalFlow } from "./components/VerticalFlow";

type ServerState =
  | { status: "checking"; meta: null }
  | { status: "online"; meta: MetaResponse }
  | { status: "offline"; meta: null };

const navigation = [
  { to: "/", label: "개요", mark: "01" },
  { to: "/sites", label: "사이트", mark: "02" },
  { to: "/activity", label: "작업 기록", mark: "03" },
];

export default function App() {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const server = useServerState();

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="mobile-header">
          <Brand />
          <button
            className="menu-button"
            type="button"
            aria-expanded={navigationOpen}
            aria-controls="primary-navigation"
            onClick={() => setNavigationOpen((open) => !open)}
          >
            메뉴
          </button>
        </header>

        <aside
          id="primary-navigation"
          className="sidebar"
          data-open={navigationOpen}
        >
          <Brand />
          <p className="sidebar-label">Fleet workspace</p>
          <nav aria-label="주요 메뉴">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setNavigationOpen(false)}
              >
                <span>{item.label}</span>
                <span className="nav-mark">{item.mark}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-context">
            <span className="context-kicker">선택된 사이트</span>
            <strong>아직 연결되지 않음</strong>
            <span>사이트별 요청 경계가 이곳에 표시됩니다.</span>
          </div>
          <ServerBadge state={server.status} />
        </aside>

        <main className="workspace">
          <WorkspaceHeader server={server} />
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/sites" element={<Sites />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function useServerState(): ServerState {
  const [state, setState] = useState<ServerState>({
    status: "checking",
    meta: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      getHealth(controller.signal),
      getMeta(controller.signal),
    ])
      .then(([, meta]) => setState({ status: "online", meta }))
      .catch(() => setState({ status: "offline", meta: null }));
    return () => controller.abort();
  }, []);
  return state;
}

function Brand() {
  return (
    <div className="brand" aria-label="G5 Fleet">
      <span className="brand-symbol">G5</span>
      <span>
        <strong>Fleet</strong>
        <small>통합 관리자</small>
      </span>
    </div>
  );
}

function ServerBadge({ state }: { state: ServerState["status"] }) {
  const label = state === "online"
    ? "서버 정상"
    : state === "offline"
    ? "서버 연결 실패"
    : "서버 확인 중";
  return (
    <div className="server-badge" data-state={state}>
      <span className="status-dot" />
      <span>{label}</span>
    </div>
  );
}

function WorkspaceHeader({ server }: { server: ServerState }) {
  return (
    <header className="workspace-header">
      <div>
        <span className="eyebrow">G5 Fleet / 운영 공간</span>
        <h1>사이트 운영 현황</h1>
      </div>
      <div className="version">
        <span>서버 버전</span>
        <strong>{server.meta?.server_version ?? "확인 중"}</strong>
      </div>
    </header>
  );
}

function Overview() {
  return (
    <section className="page" aria-labelledby="overview-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Overview</span>
          <h2 id="overview-title">연결 상태</h2>
          <p>등록된 G5 사이트와 최근 운영 작업을 한 화면에서 확인합니다.</p>
        </div>
        <button className="primary-action" type="button" disabled>
          사이트 연결 준비 중
        </button>
      </div>

      <div className="metric-line" aria-label="현재 운영 지표">
        <Metric label="연결된 사이트" value="0" note="등록 대기" />
        <Metric label="주의 필요" value="0" note="확인된 장애 없음" />
        <Metric label="진행 중 작업" value="0" note="대기열 비어 있음" />
      </div>

      <div className="workspace-section">
        <div className="section-heading">
          <div>
            <h3>사이트 목록</h3>
            <p>사이트가 등록되면 상태와 마지막 동기화 시각이 표시됩니다.</p>
          </div>
          <span className="count">0 sites</span>
        </div>
        <div className="empty-row">
          <span className="empty-index">—</span>
          <div>
            <strong>연결된 사이트가 없습니다.</strong>
            <p>최초 사이트 연결 흐름이 준비되면 이곳에서 시작합니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric(props: { label: string; value: string; note: string }) {
  return (
    <div className="metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <small>{props.note}</small>
    </div>
  );
}

function Sites() {
  return (
    <section className="page" aria-labelledby="sites-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / First vertical flow</span>
          <h2 id="sites-title">사이트 연결</h2>
          <p>
            Fleet 로그인부터 G5 설정 저장·재조회·원복까지 한 사이트 경계에서
            진행합니다.
          </p>
        </div>
      </div>
      <VerticalFlow />
    </section>
  );
}

function Activity() {
  return (
    <PlaceholderPage
      eyebrow="Activity"
      title="작업 기록"
      description="사용자와 사이트에 귀속된 변경 작업이 시간순으로 표시됩니다."
    />
  );
}

function NotFound() {
  return (
    <PlaceholderPage
      eyebrow="404"
      title="화면을 찾을 수 없습니다."
      description="왼쪽 메뉴에서 사용할 작업 공간을 선택하십시오."
    />
  );
}

function PlaceholderPage(props: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{props.eyebrow}</span>
          <h2>{props.title}</h2>
          <p>{props.description}</p>
        </div>
      </div>
      <div className="placeholder-rule">
        <span />
        <p>활성 서버 API와 함께 단계적으로 연결됩니다.</p>
      </div>
    </section>
  );
}
