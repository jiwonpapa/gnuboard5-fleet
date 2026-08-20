import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  deleteAdminVisits,
  getAdminVisitStats,
  searchAdminVisits,
  type AdminVisitSearchResult,
  type AdminVisitStats,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildVisitDelete,
  buildVisitSearchQuery,
  buildVisitStatsQuery,
  emptyVisitDeleteDraft,
  emptyVisitSearchDraft,
  emptyVisitStatsDraft,
  type AdminVisitDeleteDraft,
  type AdminVisitSearchDraft,
  type AdminVisitStatsDraft,
} from "./adminVisitForm";

type VisitView = "stats" | "search" | "delete";

export function AdminVisitsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [view, setView] = useState<VisitView>("stats");
  const [statsDraft, setStatsDraft] = useState<AdminVisitStatsDraft>(emptyVisitStatsDraft);
  const [statsQuery, setStatsQuery] = useState(() => buildVisitStatsQuery(emptyVisitStatsDraft)!);
  const [searchDraft, setSearchDraft] = useState<AdminVisitSearchDraft>(emptyVisitSearchDraft);
  const [searchFilters, setSearchFilters] = useState<AdminVisitSearchDraft>(emptyVisitSearchDraft);
  const [deleteDraft, setDeleteDraft] = useState<AdminVisitDeleteDraft>(emptyVisitDeleteDraft);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<AdminVisitStats | null>(null);
  const [logs, setLogs] = useState<AdminVisitSearchResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminVisitStats(siteId, statsQuery).then((value) => active && setStats(value)).catch((caught) => active && setError(errorMessage(caught, "방문 통계를 읽지 못했습니다.")));
    return () => { active = false; };
  }, [siteId, statsQuery]);

  useEffect(() => {
    let active = true;
    const query = buildVisitSearchQuery(searchFilters, page);
    if (!query) return () => { active = false; };
    void searchAdminVisits(siteId, query).then((value) => active && setLogs(value)).catch((caught) => active && setError(errorMessage(caught, "방문 로그를 읽지 못했습니다.")));
    return () => { active = false; };
  }, [page, searchFilters, siteId]);

  function applyStats(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = buildVisitStatsQuery(statsDraft);
    if (!query) return setError("통계 날짜 범위와 최대 항목 수를 확인하십시오.");
    setError(""); setMessage(""); setStatsQuery(query);
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!buildVisitSearchQuery(searchDraft, 1)) return setError("로그 검색 조건을 확인하십시오.");
    setError(""); setMessage(""); setPage(1); setSearchFilters({ ...searchDraft });
  }

  function prepareDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!buildVisitDelete(deleteDraft)) return setError("삭제 조건을 하나 이상 입력하십시오. 기준일 이전 삭제는 다른 조건과 함께 사용할 수 없습니다.");
    setError(""); setConfirmOpen(true);
  }

  async function removeVisits() {
    const input = buildVisitDelete(deleteDraft);
    if (!input) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await deleteAdminVisits(siteId, input, session.csrf_token);
      const [nextStats, nextLogs] = await Promise.all([
        getAdminVisitStats(siteId, statsQuery),
        searchAdminVisits(siteId, buildVisitSearchQuery(searchFilters, page)!),
      ]);
      setStats(nextStats); setLogs(nextLogs); setConfirmOpen(false); setDeleteDraft(emptyVisitDeleteDraft);
      setMessage(`방문 로그 ${result.deleted_rows}건을 삭제하고 통계와 검색 결과를 재조회했습니다.`);
    } catch (caught) {
      setError(errorMessage(caught, "방문 로그 삭제에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 접속자 관리 경로입니다.</p>;
  const pagination = logs?.pagination;

  return (
    <section className="page visits-page" aria-labelledby="visits-title">
      <div className="page-heading">
        <div><span className="eyebrow">Sites / {siteId} / Visits</span><h2 id="visits-title">접속자 운영</h2><p>방문 추세를 읽고, 원본 로그를 검색한 뒤 조건이 명확한 범위만 정리합니다.</p></div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      <div className="theme-summary-grid" aria-label="방문 상태 요약">
        <Summary label="누적 방문" value={`${stats?.summary.total_visits ?? 0}회`} />
        <Summary label="고유 IP" value={`${stats?.summary.unique_ips ?? 0}개`} />
        <Summary label="활성 일수" value={`${stats?.summary.active_days ?? 0}일`} />
      </div>
      <nav className="visits-tabs" aria-label="접속자 작업">
        <Tab active={view === "stats"} onClick={() => setView("stats")}>통계</Tab>
        <Tab active={view === "search"} onClick={() => setView("search")}>로그 검색</Tab>
        <Tab active={view === "delete"} onClick={() => setView("delete")}>안전 삭제</Tab>
      </nav>

      {view === "stats" ? <section className="member-list-panel visits-panel" aria-labelledby="visit-stats-title">
        <div className="workspace-panel-heading"><h3 id="visit-stats-title">방문 통계</h3><span>{stats?.summary.first_date || "-"} → {stats?.summary.last_date || "-"}</span></div>
        <form className="member-filter visits-filter" onSubmit={applyStats}>
          <label>시작일<input type="date" value={statsDraft.dateFrom} onChange={(event) => setStatsDraft({ ...statsDraft, dateFrom: event.currentTarget.value })} /></label>
          <label>종료일<input type="date" value={statsDraft.dateTo} onChange={(event) => setStatsDraft({ ...statsDraft, dateTo: event.currentTarget.value })} /></label>
          <label>집계 기준<select value={statsDraft.type} onChange={(event) => setStatsDraft({ ...statsDraft, type: event.currentTarget.value as AdminVisitStatsDraft["type"] })}>{statsTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>최대 항목<input type="number" min="1" max="1000" value={statsDraft.limit} onChange={(event) => setStatsDraft({ ...statsDraft, limit: event.currentTarget.value })} /></label>
          <button className="primary-action" type="submit">통계 조회</button>
        </form>
        <AdminDataTable columns={[{ header: "구간", render: (item) => <strong>{item.stat_key || "직접 유입"}</strong> }, { header: "방문", render: (item) => `${item.visit_count}회` }]} emptyMessage="집계된 방문 통계가 없습니다." getRowKey={(item) => item.stat_key} rows={stats?.items ?? []} />
      </section> : null}

      {view === "search" ? <section className="member-list-panel visits-panel" aria-labelledby="visit-search-title">
        <div className="workspace-panel-heading"><h3 id="visit-search-title">원본 로그 검색</h3><span>{pagination?.total ?? 0}건</span></div>
        <form className="member-filter visits-search-filter" onSubmit={applySearch}>
          <label>시작일<input type="date" value={searchDraft.dateFrom} onChange={(event) => setSearchDraft({ ...searchDraft, dateFrom: event.currentTarget.value })} /></label>
          <label>종료일<input type="date" value={searchDraft.dateTo} onChange={(event) => setSearchDraft({ ...searchDraft, dateTo: event.currentTarget.value })} /></label>
          <label>IP<input value={searchDraft.ip} onChange={(event) => setSearchDraft({ ...searchDraft, ip: event.currentTarget.value })} placeholder="127.0.0.1" /></label>
          <label>유입 주소<input value={searchDraft.referer} onChange={(event) => setSearchDraft({ ...searchDraft, referer: event.currentTarget.value })} /></label>
          <label>사용자 에이전트<input value={searchDraft.agent} onChange={(event) => setSearchDraft({ ...searchDraft, agent: event.currentTarget.value })} /></label>
          <button className="primary-action" type="submit">로그 검색</button>
        </form>
        <AdminDataTable columns={[
          { header: "일시", render: (item) => <strong>{item.date} {item.time}</strong> },
          { header: "IP", render: (item) => item.ip },
          { header: "환경", render: (item) => <span>{item.browser} · {item.os}<small className="table-subline">{item.device}</small></span> },
          { header: "유입", render: (item) => item.referer || "직접 유입" },
        ]} emptyMessage="조회된 방문 로그가 없습니다." getRowKey={(item) => String(item.vi_id)} rows={logs?.items ?? []} />
        <div className="action-row popular-pagination"><button type="button" disabled={!pagination?.has_prev} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button><span>{pagination?.page ?? page} / {pagination?.last_page ?? 1}</span><button type="button" disabled={!pagination?.has_next} onClick={() => setPage((value) => value + 1)}>다음</button></div>
      </section> : null}

      {view === "delete" ? <section className="member-list-panel visits-panel visits-danger-panel" aria-labelledby="visit-delete-title">
        <div className="workspace-panel-heading"><div><h3 id="visit-delete-title">조건부 로그 삭제</h3><p>전체 삭제는 허용하지 않습니다. 적용할 조건을 화면에서 다시 확인합니다.</p></div></div>
        {!session.step_up_active ? <p className="admin-step-up-note">삭제는 보안 설정에서 최근 본인 확인 후 가능합니다.</p> : null}
        <form className="member-filter visits-delete-filter" onSubmit={prepareDelete}>
          <label>기준일 이전<input type="date" value={deleteDraft.before} onChange={(event) => setDeleteDraft({ ...deleteDraft, before: event.currentTarget.value })} /></label>
          <span className="visits-filter-divider">또는</span>
          <label>시작일<input type="date" value={deleteDraft.dateFrom} disabled={Boolean(deleteDraft.before)} onChange={(event) => setDeleteDraft({ ...deleteDraft, dateFrom: event.currentTarget.value })} /></label>
          <label>종료일<input type="date" value={deleteDraft.dateTo} disabled={Boolean(deleteDraft.before)} onChange={(event) => setDeleteDraft({ ...deleteDraft, dateTo: event.currentTarget.value })} /></label>
          <label>정확한 IP<input value={deleteDraft.ip} disabled={Boolean(deleteDraft.before)} onChange={(event) => setDeleteDraft({ ...deleteDraft, ip: event.currentTarget.value })} /></label>
          <button className="danger-action" type="submit" disabled={busy || !session.step_up_active}>삭제 조건 확인</button>
        </form>
      </section> : null}

      {confirmOpen ? <div className="dialog-backdrop"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="visit-confirm-title"><h3 id="visit-confirm-title">방문 로그 삭제 확인</h3><p>{deleteSummary(deleteDraft)}</p><p>삭제 후 통계와 검색 결과를 즉시 다시 읽습니다.</p><div className="action-row"><button type="button" disabled={busy} onClick={() => setConfirmOpen(false)}>취소</button><button className="danger-action" type="button" disabled={busy} onClick={() => void removeVisits()}>조건 범위 삭제·재조회</button></div></div></div> : null}
    </section>
  );
}

const statsTypes: Array<[AdminVisitStatsDraft["type"], string]> = [["date", "일자"], ["hour", "시간"], ["week", "요일"], ["month", "월"], ["year", "연도"], ["browser", "브라우저"], ["os", "운영체제"], ["device", "기기"], ["domain", "유입 도메인"], ["search", "검색어"]];
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button className={active ? "active" : ""} type="button" aria-pressed={active} onClick={onClick}>{children}</button>; }
function Summary({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function deleteSummary(draft: AdminVisitDeleteDraft): string { return draft.before ? `${draft.before} 이전 로그를 삭제합니다.` : `${draft.dateFrom || "시작"} ~ ${draft.dateTo || "종료"}${draft.ip ? ` · IP ${draft.ip}` : ""} 조건과 일치하는 로그를 삭제합니다.`; }
function errorMessage(caught: unknown, fallback: string): string { return caught instanceof Error ? caught.message : fallback; }
