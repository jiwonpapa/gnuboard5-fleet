import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { getHealth, getMeta, type MetaResponse } from "./api/system";
import { VerticalFlow } from "./components/VerticalFlow";
import { AuditLogPage } from "./features/audit/AuditLogPage";
import { FleetAccessGate } from "./features/auth/FleetAccessGate";
import { useAuthSession } from "./features/auth/useAuthSession";
import { SecuritySettingsPage } from "./features/security/SecuritySettingsPage";
import { AppShell } from "./layout/AppShell";
import { AdminMenuStatusPage } from "./status/AdminMenuStatusPage";

type ServerState =
  | { status: "checking"; meta: null }
  | { status: "online"; meta: MetaResponse }
  | { status: "offline"; meta: null };

export default function App() {
  const server = useServerState();

  return (
    <BrowserRouter>
      <FleetAccessGate>
        <AppShell
          serverState={server.status}
          serverVersion={server.meta?.server_version}
        >
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/sites" element={<Sites />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/security" element={<SecuritySettingsPage />} />
            <Route path="/admin/:domain" element={<AdminMenuStatusPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </FleetAccessGate>
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
  const { session } = useAuthSession();
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
      <VerticalFlow csrfToken={session.csrf_token} />
    </section>
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
