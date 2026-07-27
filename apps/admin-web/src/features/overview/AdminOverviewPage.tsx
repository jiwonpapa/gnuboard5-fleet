import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getDashboard, type Dashboard } from "../../api/fleet";

export function AdminOverviewPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getDashboard()
      .then((value) => active && setDashboard(value))
      .catch((caught) =>
        active &&
        setError(caught instanceof Error ? caught.message : "대시보드를 읽지 못했습니다.")
      );
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page" aria-labelledby="overview-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Overview</span>
          <h2 id="overview-title">통합 운영 현황</h2>
          <p>등록 사이트, 주의 상태, 진행 작업과 최근 변경을 함께 확인합니다.</p>
        </div>
        <Link className="primary-action" to="/sites/new">사이트 등록</Link>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <div className="metric-line" aria-label="현재 운영 지표">
        <Metric label="등록 사이트" value={dashboard?.site_count ?? "—"} note="내 소유 범위" />
        <Metric label="주의 필요" value={dashboard?.attention_count ?? "—"} note="활성 전 상태" />
        <Metric label="진행 작업" value={dashboard?.active_job_count ?? "—"} note="대기·실행 중" />
      </div>
      <div className="workspace-section">
        <div className="section-heading">
          <div>
            <h3>최근 활동</h3>
            <p>변경 요청은 append-only 감사 기록에서 읽습니다.</p>
          </div>
          <span className="count">{dashboard?.recent_activity?.length ?? 0} events</span>
        </div>
        {dashboard?.recent_activity?.length ? (
          <ul className="activity-list">
            {dashboard.recent_activity.map((entry) => (
              <li key={entry.audit_id}>
                <strong>{entry.action}</strong>
                <span>{entry.site_id ?? "Fleet"} · {entry.outcome}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-row">
            <span className="empty-index">—</span>
            <div>
              <strong>{dashboard ? "최근 활동이 없습니다." : "대시보드 확인 중"}</strong>
              <p>사이트 변경과 운영 작업이 이곳에 표시됩니다.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric(props: { label: string; value: number | string; note: string }) {
  return (
    <div className="metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <small>{props.note}</small>
    </div>
  );
}
