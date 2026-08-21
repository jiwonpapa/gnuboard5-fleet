import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getAdminWriteCountStats,
  type AdminWriteCountStats,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import {
  buildAdminWriteCountQuery,
  emptyAdminWriteCountFilter,
  type AdminWriteCountFilterDraft,
} from "./adminWriteCountForm";

export function AdminWriteCountPage() {
  const { siteId = "" } = useParams();
  const [draft, setDraft] = useState<AdminWriteCountFilterDraft>(emptyAdminWriteCountFilter);
  const [filters, setFilters] = useState<AdminWriteCountFilterDraft>(emptyAdminWriteCountFilter);
  const [stats, setStats] = useState<AdminWriteCountStats | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const query = buildAdminWriteCountQuery(filters);
    if (!query || !siteId) return () => { active = false; };
    void getAdminWriteCountStats(siteId, query)
      .then((nextStats) => active && setStats(nextStats))
      .catch((caught) => active && setError(errorMessage(caught, "글·댓글 통계를 읽지 못했습니다.")))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [filters, siteId]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!buildAdminWriteCountQuery(draft)) {
      setError("날짜 범위와 게시판 식별자를 확인하십시오.");
      return;
    }
    setError("");
    setBusy(true);
    setFilters({ ...draft });
  }

  function resetFilters() {
    setError("");
    setBusy(true);
    setDraft(emptyAdminWriteCountFilter);
    setFilters(emptyAdminWriteCountFilter);
  }

  if (!siteId) return <p className="error-message">site_id가 없는 글·댓글 통계 경로입니다.</p>;

  return (
    <section className="page write-count-page" aria-labelledby="write-count-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Write count</span>
          <h2 id="write-count-title">글·댓글 현황</h2>
          <p>기간 단위와 게시판을 지정해 글과 댓글의 변화량을 같은 기준으로 비교합니다.</p>
        </div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <div className="theme-summary-grid write-count-summary" aria-label="글·댓글 합계">
        <Summary label="글 합계" value={stats?.summary.write_total ?? 0} />
        <Summary label="댓글 합계" value={stats?.summary.comment_total ?? 0} />
        <Summary label="집계 구간" value={stats?.items.length ?? 0} />
      </div>

      <section className="member-list-panel write-count-panel" aria-labelledby="write-count-filter-title">
        <div className="workspace-panel-heading">
          <div>
            <h3 id="write-count-filter-title">집계 조건</h3>
            <p>빈 날짜는 서버 기본 범위를 사용하며 게시판을 비우면 전체를 집계합니다.</p>
          </div>
          <span>{stats ? `${stats.date_from} → ${stats.date_to}` : "조회 준비"}</span>
        </div>
        <form className="member-filter write-count-filter" onSubmit={applyFilters}>
          <label>기간 단위<select aria-label="기간 단위" value={draft.period} onChange={(event) => setDraft({ ...draft, period: event.currentTarget.value as AdminWriteCountFilterDraft["period"] })}><option value="hour">시간</option><option value="day">일</option><option value="week">주</option><option value="month">월</option><option value="year">년</option></select></label>
          <label>시작일<input aria-label="시작일" type="date" value={draft.dateFrom} onChange={(event) => setDraft({ ...draft, dateFrom: event.currentTarget.value })} /></label>
          <label>종료일<input aria-label="종료일" type="date" value={draft.dateTo} onChange={(event) => setDraft({ ...draft, dateTo: event.currentTarget.value })} /></label>
          <label>게시판<input aria-label="게시판" value={draft.boardTable} placeholder="notice" onChange={(event) => setDraft({ ...draft, boardTable: event.currentTarget.value })} /></label>
          <div className="action-row write-count-actions"><button className="primary-action" type="submit" disabled={busy}>{busy ? "조회 중" : "조회"}</button><button type="button" disabled={busy} onClick={resetFilters}>초기화</button></div>
        </form>
      </section>

      <section className="member-list-panel write-count-panel" aria-labelledby="write-count-table-title">
        <div className="workspace-panel-heading">
          <div><h3 id="write-count-table-title">구간별 작성량</h3><p>현재 조건의 글과 댓글 수를 동일한 bucket으로 표시합니다.</p></div>
          <span>{periodLabel(stats?.period)} · {stats?.bo_table || "전체 게시판"}</span>
        </div>
        <AdminDataTable
          columns={[
            { header: "구간", render: (item) => <strong>{item.bucket}</strong> },
            { header: "글", render: (item) => `${item.write_count.toLocaleString()}건` },
            { header: "댓글", render: (item) => `${item.comment_count.toLocaleString()}건` },
            { header: "합계", render: (item) => <strong>{(item.write_count + item.comment_count).toLocaleString()}건</strong> },
          ]}
          emptyMessage="현재 조건으로 집계된 글·댓글이 없습니다."
          getRowKey={(item) => item.bucket}
          rows={stats?.items ?? []}
        />
      </section>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <article><span>{label}</span><strong>{value.toLocaleString()}건</strong></article>;
}

function periodLabel(period: AdminWriteCountStats["period"] | undefined): string {
  return ({ hour: "시간", day: "일", week: "주", month: "월", year: "년" } as const)[period ?? "day"];
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
