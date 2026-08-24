import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  convertAdminSystemBrowscap,
  getAdminSystemBrowscapStatus,
  updateAdminSystemBrowscap,
  type AdminSystemBrowscapConvertResult,
  type AdminSystemBrowscapStatus,
} from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";
import { parseBrowscapRows, validateBrowscapRows } from "./adminBrowscapForm";

type PendingAction = "convert" | "update" | null;

export function AdminBrowscapPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [status, setStatus] = useState<AdminSystemBrowscapStatus | null>(null);
  const [result, setResult] = useState<AdminSystemBrowscapConvertResult | null>(null);
  const [rows, setRows] = useState("100");
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const validationError = validateBrowscapRows(rows);

  useEffect(() => {
    let active = true;
    void getAdminSystemBrowscapStatus(siteId)
      .then((value) => active && setStatus(value))
      .catch((caught) => active && setError(errorMessage(caught, "Browscap 상태를 읽지 못했습니다.")));
    return () => { active = false; };
  }, [siteId]);

  async function execute() {
    const action = pending;
    if (!action) return;
    setPending(null);
    setBusy(true);
    setError("");
    try {
      if (action === "update") {
        setStatus(await updateAdminSystemBrowscap(siteId, session.csrf_token));
      } else {
        setResult(await convertAdminSystemBrowscap(siteId, parseBrowscapRows(rows), session.csrf_token));
        setStatus(await getAdminSystemBrowscapStatus(siteId));
      }
    } catch (caught) {
      setError(errorMessage(caught, "Browscap 작업을 실행하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 Browscap 경로입니다.</p>;

  return (
    <section className="page" aria-labelledby="browscap-title">
      <div className="page-heading"><div><span className="eyebrow">Sites / {siteId} / System tools</span><h2 id="browscap-title">Browscap 관리</h2><p>플러그인·캐시 상태를 확인하고, 업데이트와 미변환 접속로그 처리를 분리해 실행합니다.</p></div><Link to={`/sites/${encodeURIComponent(siteId)}/admin/system-tools`}>PHP 요약</Link></div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <aside className="sms-storage-warning" role="status"><strong>외부 다운로드 경계</strong><span>Browscap 업데이트는 외부 다운로드 작업입니다. 최근 OTP와 별도 확인 없이는 서버가 실행하지 않습니다.</span></aside>
      <div className="theme-summary-grid" aria-label="Browscap 상태 요약">
        <Summary label="사용 가능" value={status ? (status.available ? "가능" : "불가") : "읽는 중"} />
        <Summary label="캐시" value={status ? (status.cache_exists ? "있음" : "없음") : "—"} />
        <Summary label="미변환 로그" value={status ? `${status.pending_visit_count}건` : "—"} />
        <Summary label="PHP" value={status?.php_version ?? "—"} />
      </div>
      <div className="member-workspace">
        <section className="member-editor"><header><span className="eyebrow">Convert</span><h3>접속로그 변환</h3><p>한 번에 처리할 행 수를 제한해 반복 실행합니다.</p></header><label>처리 행 수<input aria-label="Browscap 처리 행 수" inputMode="numeric" value={rows} onChange={(event) => setRows(event.currentTarget.value)} /></label>{validationError ? <p className="field-error">{validationError}</p> : null}<div className="action-row"><button className="primary-action" type="button" disabled={busy || !session.step_up_active || Boolean(validationError) || !status?.available || !status.cache_exists} onClick={() => setPending("convert")}>변환 확인</button></div>{result ? <p className="success-message" role="status">{result.processed_count}건 처리, {result.remaining_count}건 남음</p> : null}</section>
        <section className="member-editor"><header><span className="eyebrow">Update</span><h3>Browscap 데이터 업데이트</h3><p>원격 공급자가 외부 데이터를 내려받아 캐시를 갱신합니다.</p></header><dl className="theme-meta-grid"><Meta label="플러그인" value={status?.plugin_path ?? "—"} /><Meta label="캐시 파일" value={status?.cache_file ?? "—"} /><Meta label="갱신 시각" value={status?.cache_mtime ?? "—"} /></dl><div className="action-row"><button className="danger-action" type="button" disabled={busy || !session.step_up_active || !status?.available} onClick={() => setPending("update")}>외부 업데이트 확인</button></div></section>
      </div>
      {pending ? <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="browscap-confirm"><span className="eyebrow">Explicit confirmation</span><h3 id="browscap-confirm">{pending === "update" ? "외부 Browscap 데이터를 업데이트할까요?" : `${parseBrowscapRows(rows) ?? 100}건을 변환할까요?`}</h3><p>{pending === "update" ? "이 작업은 원격 사이트에서 외부 다운로드를 수행합니다." : "접속로그의 브라우저·OS·기기 필드를 변경합니다."}</p><div><button onClick={() => setPending(null)}>취소</button><button className={pending === "update" ? "danger-action" : "primary-action"} onClick={() => void execute()}>실행</button></div></section></div> : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function Meta({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function errorMessage(caught: unknown, fallback: string): string { return caught instanceof Error ? caught.message : fallback; }
