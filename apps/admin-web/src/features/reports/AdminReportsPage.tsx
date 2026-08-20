import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getAdminReportStats,
  listAdminReports,
  updateAdminReport,
  type AdminReportItem,
  type AdminReportList,
  type AdminReportStats,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildReportListQuery,
  buildReportUpdate,
  emptyReportFilter,
  reportStatusLabel,
  reportTargetLabel,
  type AdminReportFilterDraft,
  type AdminReportUpdateDraft,
} from "./adminReportForm";

export function AdminReportsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [filterDraft, setFilterDraft] = useState<AdminReportFilterDraft>(emptyReportFilter);
  const [filters, setFilters] = useState<AdminReportFilterDraft>(emptyReportFilter);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<AdminReportList | null>(null);
  const [stats, setStats] = useState<AdminReportStats | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<AdminReportUpdateDraft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const query = buildReportListQuery(filters, page);
    if (!query) return () => { active = false; };
    void Promise.all([listAdminReports(siteId, query), getAdminReportStats(siteId)])
      .then(([nextList, nextStats]) => {
        if (!active) return;
        setList(nextList);
        setStats(nextStats);
        setSelectedId(nextList.items[0]?.rp_id ?? null);
        setDraft(toUpdateDraft(nextList.items[0] ?? null));
      })
      .catch((caught) => active && setError(errorMessage(caught, "신고 내역을 읽지 못했습니다.")));
    return () => { active = false; };
  }, [filters, page, siteId]);

  const selected = list?.items.find((item) => item.rp_id === selectedId) ?? null;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage(""); setPage(1); setFilters({ ...filterDraft });
  }

  function prepareUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft || !buildReportUpdate(draft)) return setError("상태와 운영 메모를 확인하십시오.");
    setError(""); setConfirmOpen(true);
  }

  async function saveUpdate() {
    const update = draft && buildReportUpdate(draft);
    const query = buildReportListQuery(filters, page);
    if (!selected || !update || !query) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const updated = await updateAdminReport(siteId, selected.rp_id, update, session.csrf_token);
      const [nextList, nextStats] = await Promise.all([
        listAdminReports(siteId, query),
        getAdminReportStats(siteId),
      ]);
      setList(nextList); setStats(nextStats); setConfirmOpen(false);
      const nextSelected = nextList.items.find((item) => item.rp_id === updated.rp_id) ?? nextList.items[0] ?? null;
      setSelectedId(nextSelected?.rp_id ?? null);
      setDraft(toUpdateDraft(nextSelected));
      setMessage(`신고 #${updated.rp_id} 상태를 저장하고 목록·통계를 재조회했습니다.`);
    } catch (caught) {
      setError(errorMessage(caught, "신고 상태를 저장하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 신고 관리 경로입니다.</p>;
  const pagination = list?.pagination;

  return (
    <section className="page reports-page" aria-labelledby="reports-title">
      <div className="page-heading">
        <div><span className="eyebrow">Sites / {siteId} / Reports</span><h2 id="reports-title">신고 운영</h2><p>신고 흐름을 상태와 대상별로 좁히고, 선택한 항목의 처리 결과를 기록합니다.</p></div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      <div className="theme-summary-grid reports-summary" aria-label="신고 상태 요약">
        <Summary label="전체" value={stats?.total ?? 0} />
        <Summary label="대기" value={stats?.pending ?? 0} />
        <Summary label="보류" value={stats?.hold ?? 0} />
        <Summary label="처리 완료" value={(stats?.approved ?? 0) + (stats?.rejected ?? 0)} />
      </div>

      <div className="member-workspace reports-workspace">
        <section className="member-list-panel" aria-labelledby="report-list-title">
          <div className="workspace-panel-heading"><h3 id="report-list-title">신고 목록</h3><span>{pagination?.total ?? 0}건</span></div>
          <form className="member-filter reports-filter" onSubmit={applyFilters}>
            <label>상태<select aria-label="상태" value={filterDraft.status} onChange={(event) => setFilterDraft({ ...filterDraft, status: event.currentTarget.value as AdminReportFilterDraft["status"] })}><option value="">전체</option><option value="pending">대기</option><option value="approved">승인</option><option value="rejected">반려</option><option value="hold">보류</option></select></label>
            <label>대상<select aria-label="대상 유형" value={filterDraft.targetType} onChange={(event) => setFilterDraft({ ...filterDraft, targetType: event.currentTarget.value as AdminReportFilterDraft["targetType"] })}><option value="">전체</option><option value="post">게시글</option><option value="comment">댓글</option><option value="member">회원</option></select></label>
            <button className="primary-action" type="submit">필터 적용</button>
          </form>
          <AdminDataTable columns={[
            { header: "신고", render: (item) => <strong>#{item.rp_id}<small>{item.mb_id || "비회원"}</small></strong> },
            { header: "대상", render: (item) => <span>{reportTargetLabel(item.rp_target_type)}<small>{item.rp_target_id || "-"}</small></span> },
            { header: "사유", render: (item) => <span>{item.rp_reason || "-"}<small>{item.rp_detail || "상세 없음"}</small></span> },
            { header: "상태", render: (item) => <span className="report-status" data-status={item.rp_status}>{reportStatusLabel(item.rp_status)}</span> },
          ]} emptyMessage="접수된 신고가 없습니다." getRowKey={(item) => String(item.rp_id)} onRowClick={(item) => { setSelectedId(item.rp_id); setDraft(toUpdateDraft(item)); }} rows={list?.items ?? []} selectedKey={selectedId === null ? null : String(selectedId)} />
          <div className="action-row member-pagination"><span>{pagination?.page ?? page} / {pagination?.last_page ?? 1}</span><button type="button" disabled={!pagination?.has_prev || busy} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button><button type="button" disabled={!pagination?.has_next || busy} onClick={() => setPage((value) => value + 1)}>다음</button></div>
        </section>

        <ReportEditor busy={busy} draft={draft} report={selected} stepUpActive={session.step_up_active} onDraft={setDraft} onSubmit={prepareUpdate} />
      </div>

      <ConfirmActionDialog busy={busy} description={`신고 #${selected?.rp_id ?? "-"}을(를) ${reportStatusLabel(draft?.status ?? null)} 상태로 저장합니다. 저장 후 목록과 통계를 다시 확인합니다.`} onCancel={() => setConfirmOpen(false)} onConfirm={() => void saveUpdate()} open={confirmOpen} title="신고 처리 확인" />
    </section>
  );
}

function ReportEditor(props: { busy: boolean; draft: AdminReportUpdateDraft | null; report: AdminReportItem | null; stepUpActive: boolean; onDraft: (draft: AdminReportUpdateDraft) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  if (!props.report || !props.draft) return <div className="selection-placeholder">신고를 선택하면 처리 상태와 운영 메모를 관리할 수 있습니다.</div>;
  return <form className="member-editor report-editor" onSubmit={props.onSubmit}>
    <div className="workspace-panel-heading"><h3>신고 처리</h3><span>#{props.report.rp_id}</span></div>
    <dl className="theme-meta-grid"><Meta label="접수자" value={props.report.mb_id || "비회원"} /><Meta label="대상" value={`${reportTargetLabel(props.report.rp_target_type)} · ${props.report.rp_target_id || "-"}`} /><Meta label="접수 일시" value={props.report.rp_datetime || "-"} /><Meta label="처리 일시" value={props.report.rp_processed_at || "미처리"} /></dl>
    {!props.stepUpActive ? <p className="admin-step-up-note">상태 저장은 보안 설정에서 최근 본인 확인 후 가능합니다.</p> : null}
    <label>처리 상태<select aria-label="처리 상태" value={props.draft.status} onChange={(event) => props.onDraft({ ...props.draft!, status: event.currentTarget.value as AdminReportUpdateDraft["status"] })}><option value="pending">대기</option><option value="approved">승인</option><option value="rejected">반려</option><option value="hold">보류</option></select></label>
    <label>운영 메모<textarea aria-label="운영 메모" rows={8} value={props.draft.adminMemo} onChange={(event) => props.onDraft({ ...props.draft!, adminMemo: event.currentTarget.value })} /></label>
    <button className="primary-action" type="submit" disabled={props.busy || !props.stepUpActive}>처리 내용 확인</button>
  </form>;
}

function Summary({ label, value }: { label: string; value: number }) { return <article><span>{label}</span><strong>{value}건</strong></article>; }
function Meta({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function normalizeStatus(value: string | null): AdminReportUpdateDraft["status"] { return value === "approved" || value === "rejected" || value === "hold" ? value : "pending"; }
function toUpdateDraft(report: AdminReportItem | null): AdminReportUpdateDraft | null { return report ? { status: normalizeStatus(report.rp_status), adminMemo: report.rp_admin_memo ?? "" } : null; }
function errorMessage(caught: unknown, fallback: string): string { return caught instanceof Error ? caught.message : fallback; }
