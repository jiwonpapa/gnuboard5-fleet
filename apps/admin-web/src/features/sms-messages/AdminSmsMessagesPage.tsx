import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createAdminSmsMessage,
  getAdminSmsConfig,
  listAdminSmsContactGroups,
  listAdminSmsTemplates,
  type AdminSmsConfig,
  type AdminSmsContactGroup,
  type AdminSmsTemplate,
} from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildSmsMessageRequest,
  emptySmsMessageDraft,
  parseManualTargets,
  parsePositiveIds,
  validateSmsMessageDraft,
  type SmsMessageDraft,
} from "./adminSmsMessagesForm";

export function AdminSmsMessagesPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [config, setConfig] = useState<AdminSmsConfig | null>(null);
  const [groups, setGroups] = useState<AdminSmsContactGroup[]>([]);
  const [templates, setTemplates] = useState<AdminSmsTemplate[]>([]);
  const [draft, setDraft] = useState<SmsMessageDraft>(emptySmsMessageDraft);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The async site-scoped read hydrates the composition workspace.
    setBusy(true);
    Promise.all([
      getAdminSmsConfig(siteId),
      listAdminSmsContactGroups(siteId),
      listAdminSmsTemplates(siteId, { page: 1, per_page: 100 }),
    ])
      .then(([nextConfig, nextGroups, nextTemplates]) => {
        if (!active) return;
        setConfig(nextConfig);
        setGroups(nextGroups.groups);
        setTemplates(nextTemplates.templates);
      })
      .catch((caught) => active && setError(errorMessage(caught, "SMS 발송 정보를 불러오지 못했습니다.")))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [siteId]);

  const targetCount = useMemo(() => (
    parsePositiveIds(draft.group_ids).length
    + parsePositiveIds(draft.contact_ids).length
    + parsePositiveIds(draft.member_levels).length
    + parseManualTargets(draft.manual_targets).length
  ), [draft]);
  const validationError = validateSmsMessageDraft(draft);
  const canSend = Boolean(session.step_up_active && config?.provider_ready && config?.storage_ready);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
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
    setMessage("");
    try {
      const result = await createAdminSmsMessage(siteId, buildSmsMessageRequest(draft), session.csrf_token);
      setMessage(`발송 응답을 확인했습니다. 전체 ${result.total}건 · 성공 ${result.success}건 · 실패 ${result.failure}건`);
    } catch (caught) {
      setError(errorMessage(caught, "SMS 발송 요청이 차단되었습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 SMS 발송 경로입니다.</p>;

  return (
    <section className="page sms-messages-page" aria-labelledby="sms-messages-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / SMS messages</span>
          <h2 id="sms-messages-title">문자 보내기</h2>
          <p>기존 템플릿·그룹·개별 수신자 작성 흐름을 재사용하되 실제 외부 발송은 최근 재인증과 명시 확인 뒤 서버 정책이 최종 허용합니다.</p>
        </div>
        <div className="sms-template-links">
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/sms-history`}>발송 내역</Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/sms-templates`}>템플릿</Link>
        </div>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      {!session.step_up_active ? <p className="admin-step-up-note">문자 발송에는 최근 OTP 재인증이 필요합니다.</p> : null}
      <aside className="sms-storage-warning" role="status">
        <strong>Routine delivery fail-closed</strong>
        <span>일반 실행과 자동 테스트는 SMS 외부 발송을 차단합니다. 확인 창은 발송 성공을 뜻하지 않습니다.</span>
      </aside>

      <div className="theme-summary-grid sms-message-summary" aria-label="SMS 발송 상태 요약">
        <Summary label="Provider" value={config?.provider_ready ? "READY" : "NOT READY"} />
        <Summary label="Storage" value={config?.storage_ready ? "READY" : "NOT READY"} />
        <Summary label="그룹" value={groups.length} />
        <Summary label="템플릿" value={templates.length} />
        <Summary label="예상 대상" value={targetCount} />
      </div>

      <div className="sms-message-workspace">
        <form className="member-editor sms-message-editor" onSubmit={submit}>
          <header><span className="eyebrow">Compose</span><h3>발송 작성</h3><p>메시지 또는 템플릿과 한 종류 이상의 발송 대상을 지정합니다.</p></header>
          <div className="sms-message-form-grid">
            <label>템플릿<select aria-label="발송 템플릿" value={draft.template_id} onChange={(event) => setDraft({ ...draft, template_id: event.currentTarget.value })}><option value="">직접 입력</option>{templates.map((template) => <option key={template.fo_no} value={template.fo_no}>{template.fo_name}</option>)}</select></label>
            <label>예약 시각<input aria-label="예약 발송 시각" placeholder="2026-08-24T18:00:00+09:00" value={draft.booking_at} onChange={(event) => setDraft({ ...draft, booking_at: event.currentTarget.value })} /></label>
            <label>회신 번호<input aria-label="회신 번호" inputMode="tel" value={draft.reply} onChange={(event) => setDraft({ ...draft, reply: event.currentTarget.value })} /></label>
            <label className="sms-message-body">메시지<textarea aria-label="SMS 메시지" rows={7} value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.currentTarget.value })} /></label>
            <label>그룹 ID<input aria-label="SMS 그룹 ID" placeholder="1, 3" value={draft.group_ids} onChange={(event) => setDraft({ ...draft, group_ids: event.currentTarget.value })} /></label>
            <label>연락처 ID<input aria-label="SMS 연락처 ID" placeholder="7, 9" value={draft.contact_ids} onChange={(event) => setDraft({ ...draft, contact_ids: event.currentTarget.value })} /></label>
            <label>회원 레벨<input aria-label="SMS 회원 레벨" placeholder="2, 3" value={draft.member_levels} onChange={(event) => setDraft({ ...draft, member_levels: event.currentTarget.value })} /></label>
            <label className="sms-message-body">수동 수신자<textarea aria-label="SMS 수동 수신자" rows={5} placeholder={'홍길동,010-1234-5678\n010-9876-5432'} value={draft.manual_targets} onChange={(event) => setDraft({ ...draft, manual_targets: event.currentTarget.value })} /></label>
          </div>
          {validationError ? <p className="field-error">{validationError}</p> : null}
          <div className="action-row"><button type="button" disabled={busy} onClick={() => setDraft(emptySmsMessageDraft)}>폼 초기화</button><button className="primary-action" disabled={busy || !canSend || Boolean(validationError)}>문자 발송 확인</button></div>
        </form>

        <aside className="member-list-panel sms-message-targets">
          <div className="workspace-panel-heading"><div><span className="eyebrow">Target shortcuts</span><h3>빠른 그룹 선택</h3></div><strong>{parsePositiveIds(draft.group_ids).length}개 선택</strong></div>
          <div className="sms-group-list">
            {groups.map((group) => {
              const selected = parsePositiveIds(draft.group_ids).includes(group.bg_no);
              return <button type="button" data-active={selected} key={group.bg_no} onClick={() => { const ids = parsePositiveIds(draft.group_ids); setDraft({ ...draft, group_ids: (selected ? ids.filter((id) => id !== group.bg_no) : [...ids, group.bg_no]).sort((a, b) => a - b).join(",") }); }}><span>{group.bg_name}</span><strong>{group.bg_count}</strong><small>#{group.bg_no}</small></button>;
            })}
          </div>
          {!groups.length && !busy ? <p className="empty-state">선택 가능한 연락처 그룹이 없습니다.</p> : null}
        </aside>
      </div>

      {confirming ? <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="sms-send-confirm-title"><span className="eyebrow">External effect</span><h3 id="sms-send-confirm-title">문자 {targetCount}건 발송을 요청하시겠습니까?</h3><p>실제 발송은 되돌릴 수 없습니다. 서버의 외부효과 정책과 공급자 상태가 최종 허용해야 합니다.</p><div><button onClick={() => setConfirming(false)}>취소</button><button className="danger-action" disabled={busy} onClick={() => void send()}>발송 요청</button></div></section></div> : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <article><span>{label}</span><strong>{typeof value === "number" ? value.toLocaleString() : value}</strong></article>;
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
