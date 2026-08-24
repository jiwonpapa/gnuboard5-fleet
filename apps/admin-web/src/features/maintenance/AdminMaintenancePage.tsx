import { useState } from "react";
import { useParams } from "react-router-dom";

import { purgeAdminSystemFiles, type AdminSystemMaintenanceResult, type AdminSystemMaintenanceTask } from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";

const actions: Array<{ task: AdminSystemMaintenanceTask; label: string; description: string }> = [
  { task: "session-files", label: "세션 파일", description: "6시간 이상 지난 세션 파일만 정리합니다." },
  { task: "cache-files", label: "캐시 파일", description: "콘텐츠 캐시와 소셜 로그 캐시를 정리합니다." },
  { task: "captcha-files", label: "캡챠 파일", description: "오래된 캡챠 캐시 파일을 정리합니다." },
  { task: "thumbnail-files", label: "썸네일 파일", description: "file/editor 영역의 thumb 캐시를 정리합니다." },
  { task: "member-list-files", label: "회원 목록 산출물", description: "회원 export 산출물만 정리하고 로그는 보존합니다." },
];

export function AdminMaintenancePage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [pending, setPending] = useState<(typeof actions)[number] | null>(null);
  const [result, setResult] = useState<AdminSystemMaintenanceResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function execute() {
    if (!pending) return;
    const action = pending;
    setPending(null);
    setBusy(true);
    setError("");
    try { setResult(await purgeAdminSystemFiles(siteId, action.task, session.csrf_token)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "유지보수 작업을 실행하지 못했습니다."); }
    finally { setBusy(false); }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 유지보수 경로입니다.</p>;
  return <section className="page" aria-labelledby="maintenance-title"><div className="page-heading"><div><span className="eyebrow">Sites / {siteId} / Maintenance</span><h2 id="maintenance-title">파일 유지보수</h2><p>삭제 범위를 고정한 5개 공급자 작업만 노출하며, 최근 OTP와 실행 직전 확인을 강제합니다.</p></div><span className="status-pill" data-status={session.step_up_active ? "ready" : "attention"}>{session.step_up_active ? "OTP 확인됨" : "OTP 재인증 필요"}</span></div>{error ? <p className="error-message" role="alert">{error}</p> : null}<aside className="sms-storage-warning" role="status"><strong>범위 제한 삭제</strong><span>임의 경로 입력은 받지 않습니다. 공급자가 정의한 캐시·세션·썸네일·산출물 디렉터리만 처리합니다.</span></aside><div className="theme-summary-grid">{actions.map((action) => <article key={action.task}><span>{action.label}</span><strong>{result?.task === action.task.replaceAll("-", "_") ? `${result.deleted_count}건 삭제` : "대기"}</strong><p>{action.description}</p><button type="button" disabled={busy || !session.step_up_active} onClick={() => setPending(action)}>정리 확인</button></article>)}</div>{result ? <section className="member-editor"><header><span className="eyebrow">Last result</span><h3>{result.task}</h3><p>{result.status} · {result.deleted_count}건</p></header><p>{result.message ?? "작업 결과를 서버에서 재확인했습니다."}</p></section> : null}{pending ? <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="maintenance-confirm"><span className="eyebrow">Destructive maintenance</span><h3 id="maintenance-confirm">{pending.label}을 정리할까요?</h3><p>{pending.description} 삭제된 파일은 되돌릴 수 없습니다.</p><div><button onClick={() => setPending(null)}>취소</button><button className="danger-action" onClick={() => void execute()}>정리 실행</button></div></section></div> : null}</section>;
}
