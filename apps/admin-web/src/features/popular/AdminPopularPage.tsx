import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getAdminPopularRank,
  listAdminPopular,
  resetAdminPopular,
  type AdminPopularList,
  type AdminPopularRankList,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminPopularQueries,
  emptyAdminPopularFilter,
  type AdminPopularFilterDraft,
} from "./adminPopularForm";

export function AdminPopularPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [draft, setDraft] = useState<AdminPopularFilterDraft>(emptyAdminPopularFilter);
  const [filters, setFilters] = useState<AdminPopularFilterDraft>(emptyAdminPopularFilter);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<AdminPopularList | null>(null);
  const [ranks, setRanks] = useState<AdminPopularRankList | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load(currentPage = page, currentFilters = filters) {
    const queries = buildAdminPopularQueries(currentFilters, currentPage);
    if (!queries) throw new Error("조회 조건이 올바르지 않습니다.");
    const [nextList, nextRanks] = await Promise.all([
      listAdminPopular(siteId, queries.list),
      getAdminPopularRank(siteId, queries.rank),
    ]);
    setList(nextList);
    setRanks(nextRanks);
  }

  useEffect(() => {
    let active = true;
    const queries = buildAdminPopularQueries(filters, page);
    if (!queries) return () => { active = false; };
    void Promise.all([
      listAdminPopular(siteId, queries.list),
      getAdminPopularRank(siteId, queries.rank),
    ]).then(([nextList, nextRanks]) => {
      if (!active) return;
      setList(nextList);
      setRanks(nextRanks);
    }).catch((caught) => active && setError(errorMessage(caught, "인기검색어를 읽지 못했습니다.")));
    return () => { active = false; };
  }, [filters, page, siteId]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!buildAdminPopularQueries(draft, 1)) {
      setError("날짜 범위와 순위 개수를 확인하십시오.");
      return;
    }
    setError("");
    setMessage("");
    setPage(1);
    setFilters({ ...draft });
  }

  async function resetPopular() {
    const queries = buildAdminPopularQueries(filters, page);
    if (!queries) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await resetAdminPopular(siteId, queries.reset, session.csrf_token);
      await load();
      setResetOpen(false);
      setMessage(`인기검색어 ${result.deleted_rows}건을 초기화하고 재조회했습니다.`);
    } catch (caught) {
      setError(errorMessage(caught, "인기검색어 초기화에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 인기검색어 관리 경로입니다.</p>;
  const pagination = list?.pagination;
  const top = ranks?.items[0];

  return (
    <section className="page popular-page" aria-labelledby="popular-title">
      <div className="page-heading">
        <div><span className="eyebrow">Sites / {siteId} / Popular</span><h2 id="popular-title">인기검색어 관리</h2><p>기간별 검색어 목록과 누적 순위를 함께 확인하고, 확인된 범위만 초기화합니다.</p></div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      <div className="theme-summary-grid" aria-label="인기검색어 상태 요약">
        <Summary label="목록 건수" value={`${pagination?.total ?? 0}건`} />
        <Summary label="1위 검색어" value={top?.pp_word ?? "없음"} />
        <Summary label="1위 호출" value={`${top?.hit_count ?? 0}회`} />
      </div>
      <form className="member-filter popular-filter" onSubmit={applyFilters}>
        <label>시작일<input type="date" value={draft.dateFrom} onChange={(event) => setDraft({ ...draft, dateFrom: event.currentTarget.value })} /></label>
        <label>종료일<input type="date" value={draft.dateTo} onChange={(event) => setDraft({ ...draft, dateTo: event.currentTarget.value })} /></label>
        <label>순위 개수<input type="number" min="1" max="100" value={draft.rankLimit} onChange={(event) => setDraft({ ...draft, rankLimit: event.currentTarget.value })} /></label>
        <div className="action-row"><button className="primary-action" type="submit" disabled={busy}>조회</button><button className="danger-action" type="button" disabled={busy || !session.step_up_active} onClick={() => setResetOpen(true)}>조회 범위 초기화</button></div>
      </form>
      {!session.step_up_active ? <p className="admin-step-up-note">인기검색어 초기화는 보안 설정에서 최근 본인 확인 후 가능합니다.</p> : null}
      <div className="member-workspace popular-workspace">
        <section className="member-list-panel" aria-labelledby="popular-list-title">
          <div className="workspace-panel-heading"><h3 id="popular-list-title">일자별 검색어</h3><span>{pagination?.total ?? 0}건</span></div>
          <AdminDataTable columns={[
            { header: "순번", render: (item) => <strong>#{item.pp_rank}</strong> },
            { header: "검색어", render: (item) => item.pp_word },
            { header: "날짜", render: (item) => item.pp_date },
            { header: "횟수", render: (item) => `${item.pp_cnt}회` },
          ]} emptyMessage="조회된 인기검색어가 없습니다." getRowKey={(item) => `${item.pp_date}:${item.pp_word}:${item.pp_rank}`} rows={list?.items ?? []} />
          <div className="action-row popular-pagination"><button type="button" disabled={busy || !pagination?.has_prev} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button><span>{pagination?.page ?? page} / {pagination?.last_page ?? 1}</span><button type="button" disabled={busy || !pagination?.has_next} onClick={() => setPage((value) => value + 1)}>다음</button></div>
        </section>
        <section className="member-list-panel" aria-labelledby="popular-rank-title">
          <div className="workspace-panel-heading"><h3 id="popular-rank-title">누적 순위</h3><span>{ranks?.items.length ?? 0}개</span></div>
          <AdminDataTable columns={[
            { header: "순위", render: (item) => <strong>#{item.rank}</strong> },
            { header: "검색어", render: (item) => item.pp_word },
            { header: "호출", render: (item) => `${item.hit_count}회` },
            { header: "기간", render: (item) => <small>{item.first_date} → {item.last_date}</small> },
          ]} emptyMessage="조회된 순위가 없습니다." getRowKey={(item) => `${item.rank}:${item.pp_word}`} rows={ranks?.items ?? []} />
        </section>
      </div>
      {resetOpen ? <div className="dialog-backdrop"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="popular-reset-title"><h3 id="popular-reset-title">인기검색어 초기화</h3><p>{filters.dateFrom || filters.dateTo ? `${filters.dateFrom || "시작"} ~ ${filters.dateTo || "종료"} 범위를 삭제합니다.` : "전체 인기검색어 집계를 삭제합니다."}</p><div className="action-row"><button type="button" disabled={busy} onClick={() => setResetOpen(false)}>취소</button><button className="danger-action" type="button" disabled={busy} onClick={() => void resetPopular()}>초기화·재조회</button></div></div></div> : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function errorMessage(caught: unknown, fallback: string): string { return caught instanceof Error ? caught.message : fallback; }
