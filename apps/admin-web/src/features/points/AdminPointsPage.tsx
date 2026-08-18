import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createAdminPointAction,
  deleteAdminPoints,
  expireAdminPoints,
  getAdminPointSummary,
  listAdminPoints,
  type AdminPointItem,
  type AdminPointList,
  type AdminPointSummary,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminPointChange,
  buildAdminPointExpire,
  emptyAdminPointForm,
  type AdminPointFormDraft,
} from "./adminPointForm";

export function AdminPointsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [list, setList] = useState<AdminPointList | null>(null);
  const [summary, setSummary] = useState<AdminPointSummary | null>(null);
  const [page, setPage] = useState(1);
  const [memberFilter, setMemberFilter] = useState("");
  const [searchField, setSearchField] = useState<"mb_id" | "po_content">("mb_id");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<AdminPointFormDraft>(emptyAdminPointForm);
  const [baseDate, setBaseDate] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      listAdminPoints(siteId, {
        page,
        per_page: 20,
        ...(memberFilter ? { mb_id: memberFilter } : {}),
        search_field: searchField,
        ...(search ? { search } : {}),
      }),
      getAdminPointSummary(siteId, memberFilter || undefined),
    ])
      .then(([nextList, nextSummary]) => {
        if (!active) return;
        setList(nextList);
        setSummary(nextSummary);
        setSelected([]);
      })
      .catch((caught) => active && setError(errorMessage(caught, "포인트 정보를 읽지 못했습니다.")));
    return () => { active = false; };
  }, [memberFilter, page, search, searchField, siteId]);

  async function refresh() {
    const [nextList, nextSummary] = await Promise.all([
      listAdminPoints(siteId, {
        page,
        per_page: 20,
        ...(memberFilter ? { mb_id: memberFilter } : {}),
        search_field: searchField,
        ...(search ? { search } : {}),
      }),
      getAdminPointSummary(siteId, memberFilter || undefined),
    ]);
    setList(nextList);
    setSummary(nextSummary);
    setSelected([]);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPage(1);
    setMemberFilter(String(form.get("mb_id") ?? "").trim());
    setSearchField(String(form.get("search_field") ?? "mb_id") as "mb_id" | "po_content");
    setSearch(String(form.get("search") ?? "").trim());
  }

  async function changePoint(action: "grant" | "deduct") {
    const change = buildAdminPointChange(draft);
    if (!change) {
      setError("회원 아이디와 1 이상의 정수 포인트를 입력하십시오.");
      return;
    }
    await run(async () => {
      const result = await createAdminPointAction(
        siteId,
        { action, ...change },
        session.csrf_token,
      );
      if (!("changed_point" in result)) throw new Error("포인트 변경 응답 형식이 올바르지 않습니다.");
      await refresh();
      setDraft(emptyAdminPointForm);
      setMessage(`${result.mb_id} 회원의 포인트를 ${result.changed_point > 0 ? "지급" : "차감"}하고 목록·합계를 재조회했습니다.`);
    });
  }

  async function expirePoints() {
    const expire = buildAdminPointExpire(baseDate);
    if (!expire) {
      setError("기준일은 YYYY-MM-DD 형식이어야 합니다.");
      return;
    }
    await run(async () => {
      const result = await expireAdminPoints(siteId, expire, session.csrf_token);
      await refresh();
      setMessage(`기준일 ${result.base_date}의 만료 ${result.expired_count}건을 처리하고 재조회했습니다.`);
    });
  }

  async function confirmDelete() {
    if (!selected.length) return;
    await run(async () => {
      const result = await deleteAdminPoints(siteId, { po_ids: selected }, session.csrf_token);
      await refresh();
      setDeleteOpen(false);
      setMessage(`포인트 내역 ${result.deleted_count}건을 삭제하고 합계를 재조회했습니다.`);
    });
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (caught) {
      setError(errorMessage(caught, "포인트 작업에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 포인트 관리 경로입니다.</p>;

  const pagination = list?.pagination;
  return (
    <section className="page points-page" aria-labelledby="points-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Points</span>
          <h2 id="points-title">포인트 관리</h2>
          <p>회원 포인트의 조회·지급·차감·만료·선택 삭제를 사이트별 typed HTTP로 실행하고 즉시 재조회합니다.</p>
        </div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      <div className="theme-summary-grid" aria-label="포인트 상태 요약">
        <Summary label="합계 포인트" value={(summary?.total_point ?? 0).toLocaleString()} />
        <Summary label="내역 수" value={`${summary?.total_rows ?? 0}건`} />
        <Summary label="선택 삭제" value={`${selected.length}건`} />
      </div>

      <form className="settings-card point-filter" onSubmit={applyFilters}>
        <h3>조회 조건</h3>
        <label>회원 아이디<input name="mb_id" defaultValue={memberFilter} /></label>
        <label>검색 대상<select name="search_field" defaultValue={searchField}><option value="mb_id">회원 아이디</option><option value="po_content">내용</option></select></label>
        <label>검색어<input name="search" defaultValue={search} /></label>
        <div className="action-row"><button className="primary-action" type="submit">조회</button><button type="button" onClick={() => { setPage(1); setMemberFilter(""); setSearch(""); }}>초기화</button></div>
      </form>

      <div className="member-workspace points-workspace">
        <section className="member-list-panel" aria-labelledby="point-list-title">
          <div className="workspace-panel-heading"><h3 id="point-list-title">포인트 내역</h3><span>{pagination?.total ?? 0}건</span></div>
          <AdminDataTable
            columns={[
              { header: "선택", render: (point: AdminPointItem) => <input aria-label={`포인트 #${point.po_id} 선택`} type="checkbox" checked={selected.includes(point.po_id)} onChange={() => setSelected((current) => current.includes(point.po_id) ? current.filter((id) => id !== point.po_id) : [...current, point.po_id])} /> },
              { header: "회원 / 내용", render: (point: AdminPointItem) => <><strong>{point.mb_id}</strong><small>{point.po_content || "-"}</small></> },
              { header: "변경 / 잔액", render: (point: AdminPointItem) => <><strong className={point.po_point < 0 ? "point-negative" : "point-positive"}>{point.po_point.toLocaleString()}</strong><small>{point.po_mb_point.toLocaleString()}</small></> },
              { header: "일시", render: (point: AdminPointItem) => <small>{point.po_datetime}</small> },
            ]}
            emptyMessage="조회된 포인트 내역이 없습니다."
            getRowKey={(point: AdminPointItem) => String(point.po_id)}
            rows={list?.items ?? []}
          />
          <div className="action-row point-pagination">
            <button type="button" disabled={busy || !pagination?.has_prev} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button>
            <span>{pagination?.page ?? page} / {pagination?.last_page ?? 1}</span>
            <button type="button" disabled={busy || !pagination?.has_next} onClick={() => setPage((value) => value + 1)}>다음</button>
            <button className="danger-action" type="button" disabled={busy || !selected.length || !session.step_up_active} onClick={() => setDeleteOpen(true)}>선택 내역 삭제</button>
          </div>
        </section>

        <div className="theme-editor-stack">
          <section className="member-editor" aria-labelledby="point-action-title">
            <header><span className="eyebrow">Point action</span><h3 id="point-action-title">수동 지급 / 차감</h3><p>양수 금액을 입력하면 작업 종류에 따라 서버가 부호를 결정합니다.</p></header>
            <fieldset disabled={busy || !session.step_up_active}>
              <legend>회원 포인트 변경</legend>
              <label>회원 아이디<input aria-label="포인트 회원 아이디" value={draft.mb_id} onChange={(event) => setDraft({ ...draft, mb_id: event.currentTarget.value })} /></label>
              <label>포인트<input aria-label="포인트 금액" type="number" min="1" step="1" value={draft.point} onChange={(event) => setDraft({ ...draft, point: event.currentTarget.value })} /></label>
              <label>사유<input aria-label="포인트 사유" value={draft.po_content} onChange={(event) => setDraft({ ...draft, po_content: event.currentTarget.value })} /></label>
            </fieldset>
            <div className="action-row"><button className="primary-action" type="button" disabled={busy || !session.step_up_active} onClick={() => void changePoint("grant")}>포인트 지급·재조회</button><button type="button" disabled={busy || !session.step_up_active} onClick={() => void changePoint("deduct")}>포인트 차감·재조회</button></div>
          </section>

          <section className="member-editor" aria-labelledby="point-expire-title">
            <header><span className="eyebrow">Point expiry</span><h3 id="point-expire-title">만료 처리</h3><p>기준일을 비우면 Connector의 기본 기준일을 사용합니다.</p></header>
            <label>기준일<input aria-label="포인트 만료 기준일" type="date" value={baseDate} onChange={(event) => setBaseDate(event.currentTarget.value)} /></label>
            <div className="action-row"><button type="button" disabled={busy || !session.step_up_active} onClick={() => void expirePoints()}>만료 처리·재조회</button></div>
          </section>
          {!session.step_up_active ? <p className="admin-step-up-note">포인트 변경은 보안 설정에서 최근 본인 확인 후 가능합니다.</p> : null}
        </div>
      </div>

      {deleteOpen ? <div className="dialog-backdrop"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="point-delete-title"><h3 id="point-delete-title">포인트 내역 삭제</h3><p>선택한 {selected.length}건을 삭제합니다. 삭제 후 회원 포인트 합계를 다시 계산합니다.</p><div className="action-row"><button type="button" disabled={busy} onClick={() => setDeleteOpen(false)}>취소</button><button className="danger-action" type="button" disabled={busy} onClick={() => void confirmDelete()}>삭제·재조회</button></div></div></div> : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
