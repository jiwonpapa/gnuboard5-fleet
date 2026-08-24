import { type FormEvent, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { createAdminPushMessage, type AdminPushMessageResult } from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminPushRequest,
  emptyAdminPushDraft,
  parsePushMemberIds,
  validateAdminPushDraft,
  type AdminPushDraft,
  type PushTargetMode,
} from "./adminPushForm";

export function AdminPushPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [draft, setDraft] = useState<AdminPushDraft>(emptyAdminPushDraft);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AdminPushMessageResult | null>(null);
  const memberIds = useMemo(() => parsePushMemberIds(draft.memberIds), [draft.memberIds]);
  const validationError = validateAdminPushDraft(draft);
  const targetLabel = draft.targetMode === "all" ? "전체 회원" : `${memberIds.length}명`;

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (validationError) {
      setError(validationError);
      return;
    }
    setConfirming(true);
  }

  async function send() {
    setConfirming(false);
    setBusy(true);
    setError("");
    try {
      setResult(await createAdminPushMessage(siteId, buildAdminPushRequest(draft), session.csrf_token));
      if (draft.targetMode === "members") {
        setDraft((current) => ({ ...current, memberIds: "" }));
      }
    } catch (caught) {
      setError(errorMessage(caught, "Push 발송 요청이 차단되었습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 Push 경로입니다.</p>;

  return (
    <section className="page push-page" aria-labelledby="push-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Push</span>
          <h2 id="push-title">Push 메시지</h2>
          <p>기존 전체·회원 지정 작성 흐름을 재사용하고, 대상 범위와 되돌릴 수 없는 외부 전달을 분리해 확인합니다.</p>
        </div>
        <span className="status-pill" data-status={session.step_up_active ? "ready" : "attention"}>
          {session.step_up_active ? "OTP 확인됨" : "OTP 재인증 필요"}
        </span>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <aside className="sms-storage-warning" role="status">
        <strong>Routine delivery fail-closed</strong>
        <span>일반 실행과 자동 테스트에서는 Web Push 외부 전달을 차단합니다. 확인 창은 발송 성공을 뜻하지 않습니다.</span>
      </aside>

      <div className="theme-summary-grid push-summary" aria-label="Push 발송 요약">
        <Summary label="대상 방식" value={draft.targetMode === "all" ? "전체" : "회원 지정"} />
        <Summary label="입력 대상" value={draft.targetMode === "all" ? "전체" : memberIds.length} />
        <Summary label="최근 요청" value={result ? result.target_count : "—"} />
        <Summary label="Queued" value={result ? result.queued : "—"} />
        <Summary label="Failed" value={result ? result.failed : "—"} />
      </div>

      <div className="push-workspace">
        <form className="member-editor push-editor" onSubmit={submit}>
          <header>
            <span className="eyebrow">Compose</span>
            <h3>메시지 작성</h3>
            <p>제목·본문·대상을 검토한 뒤 별도 확인 단계에서만 서버에 요청합니다.</p>
          </header>
          <label>제목<input aria-label="Push 제목" maxLength={255} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })} /></label>
          <label>본문<textarea aria-label="Push 본문" rows={9} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.currentTarget.value })} /></label>
          <label>메시지 타입<input aria-label="Push 타입" maxLength={64} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.currentTarget.value })} /></label>
          {validationError ? <p className="field-error">{validationError}</p> : null}
          <div className="action-row">
            <button type="button" disabled={busy} onClick={() => { setDraft(emptyAdminPushDraft); setResult(null); setError(""); }}>폼 초기화</button>
            <button className="primary-action" disabled={busy || !session.step_up_active || Boolean(validationError)}>Push 발송 확인</button>
          </div>
        </form>

        <aside className="member-list-panel push-target-panel">
          <div className="workspace-panel-heading"><div><span className="eyebrow">Audience</span><h3>대상 지정</h3></div><strong>{targetLabel}</strong></div>
          <div className="push-target-options" role="radiogroup" aria-label="Push 대상 방식">
            <TargetButton mode="members" current={draft.targetMode} label="회원 지정" detail="회원 ID를 직접 입력" onSelect={(targetMode) => setDraft({ ...draft, targetMode })} />
            <TargetButton mode="all" current={draft.targetMode} label="전체 회원" detail="사이트 전체 회원 대상" onSelect={(targetMode) => setDraft({ ...draft, targetMode })} />
          </div>
          <label>회원 ID 목록<textarea aria-label="Push 회원 ID" rows={10} placeholder={'member-a, member-b\nmember-c'} disabled={draft.targetMode === "all"} value={draft.memberIds} onChange={(event) => setDraft({ ...draft, memberIds: event.currentTarget.value })} /></label>
          <p className="push-boundary-note"><strong>발송 전 확인</strong><span>대상 사이트, {targetLabel}, 메시지 내용을 다시 확인하십시오. 서버는 CSRF·최근 OTP·명시 확인을 모두 검사합니다.</span></p>
        </aside>
      </div>

      {confirming ? <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="push-confirm-title"><span className="eyebrow">External effect</span><h3 id="push-confirm-title">{targetLabel}에게 Push 발송을 요청하시겠습니까?</h3><p>이 요청은 되돌릴 수 없습니다. Routine 환경에서는 서버 정책이 외부 전달을 최종 차단합니다.</p><div><button onClick={() => setConfirming(false)}>취소</button><button className="danger-action" disabled={busy} onClick={() => void send()}>발송 요청</button></div></section></div> : null}
    </section>
  );
}

function TargetButton({ mode, current, label, detail, onSelect }: { mode: PushTargetMode; current: PushTargetMode; label: string; detail: string; onSelect: (mode: PushTargetMode) => void }) {
  return <button type="button" role="radio" aria-checked={current === mode} data-active={current === mode} onClick={() => onSelect(mode)}><strong>{label}</strong><span>{detail}</span></button>;
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <article><span>{label}</span><strong>{typeof value === "number" ? value.toLocaleString() : value}</strong></article>;
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
