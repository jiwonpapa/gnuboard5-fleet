import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getAdminSmsConfig,
  getAdminSmsMessageBatch,
  listAdminSmsDeliveries,
  listAdminSmsMessageBatches,
  resendAdminSmsBatchAll,
  resendAdminSmsFailures,
  type AdminSmsDeliveryList,
  type AdminSmsMessageBatchDetail,
  type AdminSmsMessageBatchList,
} from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildSmsBatchDetailQuery,
  buildSmsBatchListQuery,
  buildSmsDeliveryListQuery,
  buildSmsResendRequest,
} from "./adminSmsHistoryForm";

type HistoryView = "batches" | "deliveries";
type ResendMode = "failures" | "all";

export function AdminSmsHistoryPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [view, setView] = useState<HistoryView>("batches");
  const [batches, setBatches] = useState<AdminSmsMessageBatchList | null>(null);
  const [deliveries, setDeliveries] = useState<AdminSmsDeliveryList | null>(null);
  const [detail, setDetail] = useState<AdminSmsMessageBatchDetail | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"name" | "hp" | "bk_no">("hp");
  const [page, setPage] = useState(1);
  const [bookingAt, setBookingAt] = useState("");
  const [confirming, setConfirming] = useState<ResendMode | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The async site-scoped read replaces the current result set after dependencies change.
    setBusy(true);
    setError("");
    getAdminSmsConfig(siteId)
      .then(async (config) => {
        if (!active) return;
        setStorageReady(config.storage_ready);
        if (!config.storage_ready) return;
        if (view === "batches") {
          const result = await listAdminSmsMessageBatches(siteId, buildSmsBatchListQuery(page, search));
          if (active) setBatches(result);
        } else {
          const result = await listAdminSmsDeliveries(siteId, buildSmsDeliveryListQuery(page, searchField, search));
          if (active) setDeliveries(result);
        }
      })
      .catch((caught) => active && setError(errorMessage(caught, "SMS 이력을 불러오지 못했습니다.")))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [page, search, searchField, siteId, view]);

  async function selectBatch(wrNo: number, wrRenum: number) {
    setBusy(true);
    setError("");
    try {
      setDetail(await getAdminSmsMessageBatch(siteId, wrNo, buildSmsBatchDetailQuery(wrRenum, 1, "name", "")));
    } catch (caught) {
      setError(errorMessage(caught, "SMS 배치 상세를 불러오지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function resend(mode: ResendMode) {
    if (!detail) return;
    setConfirming(null);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const input = buildSmsResendRequest(detail.wr_renum, bookingAt);
      const result = mode === "all"
        ? await resendAdminSmsBatchAll(siteId, detail.wr_no, input, session.csrf_token)
        : await resendAdminSmsFailures(siteId, detail.wr_no, input, session.csrf_token);
      setMessage(`재전송 응답을 확인했습니다. 성공 ${result.success}건 · 실패 ${result.failure}건`);
    } catch (caught) {
      setError(errorMessage(caught, "SMS 재전송 요청이 차단되었습니다."));
    } finally {
      setBusy(false);
    }
  }

  const pagination = view === "batches" ? batches?.pagination : deliveries?.pagination;
  if (!siteId) return <p className="error-message">site_id가 없는 SMS 이력 경로입니다.</p>;

  return (
    <section className="page sms-history-page" aria-labelledby="sms-history-title">
      <div className="page-heading">
        <div><span className="eyebrow">Sites / {siteId} / SMS history</span><h2 id="sms-history-title">SMS 발송 내역</h2><p>건별 배치와 번호별 결과를 분리해 조회하고, 재전송은 명시 확인 후에도 서버의 외부효과 정책을 따릅니다.</p></div>
        <div className="sms-template-links"><Link to={`/sites/${encodeURIComponent(siteId)}/admin/sms-messages`}>문자 보내기</Link><Link to={`/sites/${encodeURIComponent(siteId)}/admin/sms`}>SMS 설정</Link></div>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      {!storageReady && !busy ? <aside className="sms-storage-warning" role="status"><strong>SMS 저장소 미구성</strong><span>G5 SMS5 이력 테이블을 준비한 뒤 다시 조회하십시오.</span></aside> : null}

      <div className="theme-summary-grid sms-history-summary" aria-label="SMS 이력 상태 요약">
        <Summary label="현재 보기" value={view === "batches" ? "건별" : "번호별"} />
        <Summary label="조회 결과" value={pagination?.total ?? 0} />
        <Summary label="선택 배치" value={detail ? `${detail.wr_no}/${detail.wr_renum}` : "—"} />
        <Summary label="성공" value={detail?.wr_success ?? 0} />
        <Summary label="실패" value={detail?.wr_failure ?? 0} />
      </div>

      <div className="sms-history-tabs" role="tablist" aria-label="SMS 이력 구분">
        <button role="tab" aria-selected={view === "batches"} onClick={() => { setView("batches"); setPage(1); setSearch(""); }}>전송내역-건별</button>
        <button role="tab" aria-selected={view === "deliveries"} onClick={() => { setView("deliveries"); setPage(1); setSearch(""); }}>전송내역-번호별</button>
      </div>

      <div className="sms-history-filter">
        {view === "deliveries" ? <select aria-label="번호별 검색 필드" value={searchField} onChange={(event) => { setPage(1); setSearchField(event.currentTarget.value as typeof searchField); }}><option value="name">이름</option><option value="hp">번호</option><option value="bk_no">주소록 번호</option></select> : null}
        <input aria-label="SMS 이력 검색" placeholder="이름·번호·메시지" value={search} onChange={(event) => { setPage(1); setSearch(event.currentTarget.value); }} />
      </div>

      {view === "batches" ? <div className="sms-history-workspace">
        <section className="member-list-panel">
          <div className="workspace-panel-heading"><div><span className="eyebrow">Batch index</span><h3>배치 목록</h3></div><span>{batches?.batches.length ?? 0}건</span></div>
          <div className="sms-template-table-wrap"><table className="admin-table sms-history-table"><thead><tr><th>배치</th><th>메시지</th><th>전체</th><th>성공</th><th>실패</th><th>발송일</th></tr></thead><tbody>{batches?.batches.map((batch) => <tr key={`${batch.wr_no}-${batch.wr_renum}`} data-selected={detail?.wr_no === batch.wr_no && detail?.wr_renum === batch.wr_renum}><td><button type="button" onClick={() => void selectBatch(batch.wr_no, batch.wr_renum)}>{batch.wr_no}/{batch.wr_renum}</button></td><td>{batch.wr_message ?? "—"}</td><td>{batch.wr_total}</td><td>{batch.wr_success}</td><td>{batch.wr_failure}</td><td>{batch.wr_datetime ?? "—"}</td></tr>)}</tbody></table></div>
          {!batches?.batches.length && !busy ? <p className="empty-state">발송 배치가 없습니다.</p> : null}
        </section>
        <section className="member-editor sms-history-detail">
          <header><span className="eyebrow">Batch detail</span><h3>배치 상세 / 재전송</h3></header>
          {detail ? <><dl className="sms-history-detail-grid"><div><dt>배치</dt><dd>{detail.wr_no}/{detail.wr_renum}</dd></div><div><dt>전체</dt><dd>{detail.wr_total}</dd></div><div><dt>성공</dt><dd>{detail.wr_success}</dd></div><div><dt>실패</dt><dd>{detail.wr_failure}</dd></div><div><dt>중복 제외</dt><dd>{detail.duplicate_summary?.total ?? 0}</dd></div><div><dt>재시도 배치</dt><dd>{detail.retry_batches.length}</dd></div></dl><p className="sms-history-message">{detail.wr_message ?? "메시지 없음"}</p><label>재전송 예약 시각<input aria-label="재전송 예약 시각" value={bookingAt} onChange={(event) => setBookingAt(event.currentTarget.value)} /></label><div className="action-row"><button disabled={busy || !session.step_up_active || detail.wr_failure < 1} onClick={() => setConfirming("failures")}>실패건 재전송 확인</button><button className="danger-action" disabled={busy || !session.step_up_active || detail.wr_total < 1} onClick={() => setConfirming("all")}>전체 재전송 확인</button></div></> : <p className="empty-state">배치를 선택하면 상세와 재전송 경계가 표시됩니다.</p>}
        </section>
      </div> : <section className="member-list-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">Delivery index</span><h3>번호별 이력 조회</h3></div><span>{deliveries?.deliveries.length ?? 0}건</span></div><div className="sms-template-table-wrap"><table className="admin-table sms-history-table"><thead><tr><th>수신자</th><th>번호</th><th>배치</th><th>코드</th><th>결과</th><th>시각</th></tr></thead><tbody>{deliveries?.deliveries.map((delivery) => <tr key={delivery.hs_no}><td>{delivery.hs_name ?? delivery.mb_id ?? "—"}</td><td>{delivery.hs_hp ?? "—"}</td><td>{delivery.wr_no ?? "—"}/{delivery.wr_renum ?? "—"}</td><td>{delivery.hs_code ?? "—"}</td><td>{delivery.hs_memo ?? delivery.hs_log ?? "—"}</td><td>{delivery.hs_datetime ?? "—"}</td></tr>)}</tbody></table></div>{!deliveries?.deliveries.length && !busy ? <p className="empty-state">번호별 발송 이력이 없습니다.</p> : null}</section>}

      <div className="pagination-row"><button disabled={page <= 1 || busy} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button><span>{page} / {pagination?.last_page ?? 1}</span><button disabled={busy || !(pagination?.has_next ?? false)} onClick={() => setPage((value) => value + 1)}>다음</button></div>

      {confirming && detail ? <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="sms-resend-confirm-title"><span className="eyebrow">External effect</span><h3 id="sms-resend-confirm-title">{confirming === "all" ? "전체" : "실패건"} 재전송을 요청하시겠습니까?</h3><p>배치 {detail.wr_no}/{detail.wr_renum}의 외부 발송 요청입니다. 서버 정책이 최종 허용해야 하며 자동 실행에서는 차단됩니다.</p><div><button onClick={() => setConfirming(null)}>취소</button><button className="danger-action" disabled={busy} onClick={() => void resend(confirming)}>재전송 요청</button></div></section></div> : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <article><span>{label}</span><strong>{typeof value === "number" ? value.toLocaleString() : value}</strong></article>;
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
