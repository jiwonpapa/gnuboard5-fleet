import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createAdminMailTemplate,
  createAdminMailTest,
  deleteAdminMail,
  getAdminMail,
  listAdminMailRecipients,
  listAdminMails,
  listAdminSystemMailRecipients,
  listAdminSystemMails,
  sendAdminMail,
  sendAdminMailTestLegacy,
  sendAdminSystemMailTest,
  sendAdminSystemMemberMail,
  updateAdminMailTemplate,
  type AdminMailDetail,
  type AdminMailList,
  type AdminMailRecipientList,
  type AdminSystemMailRecipientList,
  type AdminSystemMailTemplateList,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminMailRecipientQuery,
  buildAdminMailSend,
  buildAdminMailTemplate,
  emptyAdminMailRecipient,
  emptyAdminMailSend,
  emptyAdminMailTemplate,
  type AdminMailRecipientDraft,
  type AdminMailSendDraft,
  type AdminMailTemplateDraft,
} from "./adminMailsForm";
import {
  buildAdminMailTest,
  buildAdminSystemMailTest,
  emptyAdminMailTest,
  type AdminMailTestDraft,
} from "./adminMailTestForm";

export function AdminMailsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [list, setList] = useState<AdminMailList | null>(null);
  const [systemList, setSystemList] = useState<AdminSystemMailTemplateList | null>(null);
  const [recipients, setRecipients] = useState<AdminMailRecipientList | null>(null);
  const [systemRecipients, setSystemRecipients] = useState<AdminSystemMailRecipientList | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminMailDetail | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [templateDraft, setTemplateDraft] = useState<AdminMailTemplateDraft>(emptyAdminMailTemplate);
  const [editDraft, setEditDraft] = useState<AdminMailTemplateDraft>(emptyAdminMailTemplate);
  const [recipientDraft, setRecipientDraft] = useState<AdminMailRecipientDraft>(emptyAdminMailRecipient);
  const [sendDraft, setSendDraft] = useState<AdminMailSendDraft>(emptyAdminMailSend);
  const [testDraft, setTestDraft] = useState<AdminMailTestDraft>(emptyAdminMailTest);
  const [externalConfirmed, setExternalConfirmed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async (preferredId?: number) => {
    const [nextList, nextSystemList, nextRecipients, nextSystemRecipients] = await Promise.all([
      listAdminMails(siteId, { page: 1, per_page: 50 }),
      listAdminSystemMails(siteId, { page: 1, per_page: 50 }),
      listAdminMailRecipients(siteId, { page: 1, per_page: 50, mailling_only: true }),
      listAdminSystemMailRecipients(siteId, { page: 1, per_page: 50 }),
    ]);
    setList(nextList);
    setSystemList(nextSystemList);
    setRecipients(nextRecipients);
    setSystemRecipients(nextSystemRecipients);
    setSelectedId((current) => {
      const candidate = preferredId ?? current;
      return candidate !== null && nextList.items.some((item) => item.ma_id === candidate) ? candidate : nextList.items[0]?.ma_id ?? null;
    });
  }, [siteId]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The async refresh updates state only after all requests resolve.
    void refresh().catch((caught) => active && setError(errorMessage(caught, "메일 작업면을 읽지 못했습니다.")));
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    if (selectedId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- An empty async list must clear stale detail state.
      setSelected(null);
      return;
    }
    let active = true;
    void getAdminMail(siteId, selectedId).then((detail) => {
      if (!active) return;
      setSelected(detail);
      setEditDraft({ subject: detail.ma_subject, content: detail.ma_content });
      setSendDraft((current) => ({ ...current, templateId: String(detail.ma_id) }));
      setTestDraft((current) => ({ ...current, templateId: String(detail.ma_id) }));
    }).catch((caught) => active && setError(errorMessage(caught, "메일 상세를 읽지 못했습니다.")));
    return () => { active = false; };
  }, [selectedId, siteId]);

  async function run(task: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await task(); } catch (caught) { setError(errorMessage(caught, "메일 작업에 실패했습니다.")); }
    finally { setBusy(false); }
  }

  async function createTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = buildAdminMailTemplate(templateDraft);
    if (!input) { setError("템플릿 제목과 본문을 입력하십시오."); return; }
    await run(async () => {
      const created = await createAdminMailTemplate(siteId, input, session.csrf_token);
      setTemplateDraft(emptyAdminMailTemplate);
      await refresh(created.ma_id);
      setMessage("메일 템플릿을 생성하고 목록·상세를 재조회했습니다.");
    });
  }

  async function updateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const input = buildAdminMailTemplate(editDraft);
    if (!input) { setError("템플릿 제목과 본문을 입력하십시오."); return; }
    await run(async () => {
      await updateAdminMailTemplate(siteId, selected.ma_id, input, session.csrf_token);
      await refresh(selected.ma_id);
      setMessage("메일 템플릿을 저장하고 상세를 재조회했습니다.");
    });
  }

  async function removeTemplate() {
    if (!selected) return;
    await run(async () => {
      await deleteAdminMail(siteId, selected.ma_id, session.csrf_token);
      setDeleteOpen(false); setSelected(null); setSelectedId(null);
      await refresh();
      setMessage("메일 템플릿을 삭제하고 목록을 재조회했습니다.");
    });
  }

  async function filterRecipients(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = buildAdminMailRecipientQuery(recipientDraft);
    if (!query) { setError("회원 범위·레벨·그룹 식별자를 확인하십시오."); return; }
    await run(async () => {
      const [nextRecipients, nextSystemRecipients] = await Promise.all([
        listAdminMailRecipients(siteId, query),
        listAdminSystemMailRecipients(siteId, { page: 1, per_page: 50, ...(query.search ? { search: query.search } : {}) }),
      ]);
      setRecipients(nextRecipients); setSystemRecipients(nextSystemRecipients); setSelectedMembers([]);
      setMessage("수신자 조건을 적용해 두 공급자 계약을 재조회했습니다.");
    });
  }

  async function executeSend(system: boolean) {
    const merged = { ...sendDraft, memberIds: selectedMembers.length ? selectedMembers.join(",") : sendDraft.memberIds };
    const input = buildAdminMailSend(merged);
    if (!input) { setError("메일 원본과 수신 대상을 확인하십시오."); return; }
    if (!externalConfirmed) { setError("외부 효과 실행 확인을 먼저 선택하십시오."); return; }
    await run(async () => {
      if (system) {
        const result = await sendAdminSystemMemberMail(siteId, {
          ...(input.ma_id ? { ma_id: input.ma_id } : { subject: input.subject, content: input.content }),
          mb_ids: input.mb_ids,
          mailling_only: input.mailling_only,
          dry_run: input.dry_run,
        }, session.csrf_token);
        await refresh();
        setMessage(`시스템 회원 메일을 ${result.dry_run ? "dry-run" : "실행"}하고 로그 #${result.mail_log_id}를 재조회했습니다.`);
      } else {
        const result = await sendAdminMail(siteId, input, session.csrf_token);
        setMessage(`대상 ${result.target_count}명, 발송 ${result.sent_count}명의 ${result.dry_run ? "dry-run" : "실행"} 결과를 확인했습니다.`);
      }
      setExternalConfirmed(false);
    });
  }

  async function executeTest(kind: "modern" | "legacy" | "system") {
    if (!externalConfirmed) { setError("외부 효과 실행 확인을 먼저 선택하십시오."); return; }
    await run(async () => {
      if (kind === "system") {
        const input = buildAdminSystemMailTest(testDraft);
        if (!input) throw new Error("시스템 테스트에는 수신 주소·제목·본문이 모두 필요합니다.");
        const result = await sendAdminSystemMailTest(siteId, input, session.csrf_token);
        await refresh(result.mail_log_id);
        setMessage(`시스템 테스트 로그 #${result.mail_log_id}를 만들고 재조회했습니다.`);
      } else {
        const input = buildAdminMailTest(testDraft);
        if (!input) throw new Error("테스트 수신 주소와 메일 원본을 확인하십시오.");
        const result = kind === "modern"
          ? await createAdminMailTest(siteId, input, session.csrf_token)
          : await sendAdminMailTestLegacy(siteId, input, session.csrf_token);
        setMessage(`${kind === "modern" ? "현재" : "레거시 호환"} 테스트 결과: ${result.sent ? "발송됨" : "발송 안 됨"} · mail ${result.mail_enabled ? "ON" : "OFF"}`);
      }
      setExternalConfirmed(false);
    });
  }

  if (!siteId) return <p className="error-message">site_id가 없는 메일 관리 경로입니다.</p>;
  const writeDisabled = busy || !session.step_up_active;
  return (
    <section className="page mails-page" aria-labelledby="mails-title">
      <div className="page-heading"><div><span className="eyebrow">Sites / {siteId} / Mail</span><h2 id="mails-title">메일 관리</h2><p>템플릿·수신자·테스트·회원 발송을 사이트별 typed HTTP로 관리합니다. 실제 발송은 기본 차단됩니다.</p></div><Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link></div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      <div className="theme-summary-grid" aria-label="메일 상태 요약">
        <Summary label="관리 템플릿" value={`${list?.pagination.total ?? 0}건`} />
        <Summary label="시스템 계약" value={`${systemList?.pagination.total ?? 0}건`} />
        <Summary label="메일 수신 동의" value={`${recipients?.pagination.total ?? 0}명`} />
      </div>

      <div className="mail-template-workspace">
        <section className="member-list-panel" aria-labelledby="mail-template-list-title">
          <div className="workspace-panel-heading"><div><h3 id="mail-template-list-title">템플릿 목록</h3><p>관리·시스템 목록 계약을 함께 재조회합니다.</p></div><span>{list?.items.length ?? 0}개 표시</span></div>
          <AdminDataTable columns={[
            { header: "ID", render: (mail) => <strong>#{mail.ma_id}</strong> },
            { header: "제목 / 시각", render: (mail) => <><strong>{mail.ma_subject}</strong><small>{mail.ma_time}</small></> },
          ]} emptyMessage="메일 템플릿이 없습니다." getRowKey={(mail) => String(mail.ma_id)} onRowClick={(mail) => setSelectedId(mail.ma_id)} rows={list?.items ?? []} selectedKey={selectedId === null ? null : String(selectedId)} />
        </section>
        <div className="theme-editor-stack">
          <MailTemplateEditor title="새 템플릿" draft={templateDraft} disabled={writeDisabled} submitLabel="생성·재조회" onChange={setTemplateDraft} onSubmit={createTemplate} />
          {selected ? <MailTemplateEditor title={`템플릿 #${selected.ma_id}`} draft={editDraft} disabled={writeDisabled} submitLabel="저장·재조회" onChange={setEditDraft} onSubmit={updateTemplate} footer={<div className="action-row"><button type="button" disabled={busy} onClick={() => setEditDraft({ subject: selected.ma_subject, content: selected.ma_content })}>서버 값 복원</button><button className="danger-action" type="button" disabled={writeDisabled} onClick={() => setDeleteOpen(true)}>템플릿 삭제</button></div>} /> : null}
        </div>
      </div>

      <section className="member-list-panel mail-recipient-panel" aria-labelledby="mail-recipient-title">
        <div className="workspace-panel-heading"><div><h3 id="mail-recipient-title">수신자 선택</h3><p>메일 수신 동의 회원만 기본 조회하며 선택값은 회원 대상 발송에 사용합니다.</p></div><span>선택 {selectedMembers.length}명 · 시스템 {systemRecipients?.pagination.total ?? 0}명</span></div>
        <form className="member-filter mail-recipient-filter" onSubmit={filterRecipients}>
          <label>검색<input aria-label="수신자 검색" value={recipientDraft.search} onChange={(event) => setRecipientDraft({ ...recipientDraft, search: event.currentTarget.value })} /></label>
          <label>최소 레벨<input aria-label="최소 레벨" type="number" min="1" max="10" value={recipientDraft.levelMin} onChange={(event) => setRecipientDraft({ ...recipientDraft, levelMin: event.currentTarget.value })} /></label>
          <label>최대 레벨<input aria-label="최대 레벨" type="number" min="1" max="10" value={recipientDraft.levelMax} onChange={(event) => setRecipientDraft({ ...recipientDraft, levelMax: event.currentTarget.value })} /></label>
          <label>그룹<input aria-label="그룹" value={recipientDraft.groupId} onChange={(event) => setRecipientDraft({ ...recipientDraft, groupId: event.currentTarget.value })} /></label>
          <label className="mail-inline-check"><input type="checkbox" checked={recipientDraft.maillingOnly} onChange={(event) => setRecipientDraft({ ...recipientDraft, maillingOnly: event.currentTarget.checked })} />수신 동의만</label>
          <button className="primary-action" type="submit" disabled={busy}>수신자 조회</button>
        </form>
        <AdminDataTable columns={[
          { header: "선택", render: (member) => <input aria-label={`${member.mb_id} 선택`} type="checkbox" checked={selectedMembers.includes(member.mb_id)} onChange={() => setSelectedMembers((current) => current.includes(member.mb_id) ? current.filter((id) => id !== member.mb_id) : [...current, member.mb_id])} /> },
          { header: "회원", render: (member) => <><strong>{member.mb_id}</strong><small>{member.mb_name || member.mb_nick}</small></> },
          { header: "이메일", render: (member) => member.mb_email },
          { header: "레벨 / 동의", render: (member) => <><strong>Lv.{member.mb_level}</strong><small>{member.mb_mailling ? "수신 동의" : "수신 거부"}</small></> },
        ]} emptyMessage="조건에 맞는 수신자가 없습니다." getRowKey={(member) => member.mb_id} rows={recipients?.items ?? []} />
      </section>

      <div className="mail-action-workspace">
        <form className="member-editor mail-send-editor" onSubmit={(event) => { event.preventDefault(); void executeSend(false); }}>
          <header><span className="eyebrow">Safe delivery</span><h3>회원 메일 발송</h3><p>선택 회원 또는 직접 지정 대상에 dry-run부터 실행합니다.</p></header>
          <fieldset disabled={writeDisabled}>
            <label>템플릿<select aria-label="발송 템플릿" value={sendDraft.templateId} onChange={(event) => setSendDraft({ ...sendDraft, templateId: event.currentTarget.value })}><option value="">직접 작성</option>{list?.items.map((mail) => <option key={mail.ma_id} value={mail.ma_id}>#{mail.ma_id} {mail.ma_subject}</option>)}</select></label>
            <label>대상<select aria-label="발송 대상" value={sendDraft.targetType} onChange={(event) => setSendDraft({ ...sendDraft, targetType: event.currentTarget.value as AdminMailSendDraft["targetType"] })}><option value="member">선택 회원</option><option value="all">전체</option><option value="level">레벨 범위</option><option value="group">그룹</option></select></label>
            <label>회원 아이디<input aria-label="발송 회원 아이디" value={selectedMembers.length ? selectedMembers.join(", ") : sendDraft.memberIds} readOnly={selectedMembers.length > 0} onChange={(event) => setSendDraft({ ...sendDraft, memberIds: event.currentTarget.value })} /></label>
            <div className="mail-short-fields"><label>최소 레벨<input type="number" min="1" max="10" value={sendDraft.levelMin} onChange={(event) => setSendDraft({ ...sendDraft, levelMin: event.currentTarget.value })} /></label><label>최대 레벨<input type="number" min="1" max="10" value={sendDraft.levelMax} onChange={(event) => setSendDraft({ ...sendDraft, levelMax: event.currentTarget.value })} /></label><label>그룹<input value={sendDraft.groupId} onChange={(event) => setSendDraft({ ...sendDraft, groupId: event.currentTarget.value })} /></label></div>
            <label>직접 제목<input value={sendDraft.subject} onChange={(event) => setSendDraft({ ...sendDraft, subject: event.currentTarget.value })} /></label>
            <label>직접 본문<textarea rows={5} value={sendDraft.content} onChange={(event) => setSendDraft({ ...sendDraft, content: event.currentTarget.value })} /></label>
            <div className="mail-safety-row"><label><input type="checkbox" checked={sendDraft.maillingOnly} onChange={(event) => setSendDraft({ ...sendDraft, maillingOnly: event.currentTarget.checked })} />수신 동의만</label><label><input type="checkbox" checked={sendDraft.dryRun} onChange={(event) => setSendDraft({ ...sendDraft, dryRun: event.currentTarget.checked })} />Dry-run</label></div>
          </fieldset>
          <div className="action-row"><button className="primary-action" type="submit" disabled={writeDisabled || !externalConfirmed}>관리 계약 실행</button><button type="button" disabled={writeDisabled || !externalConfirmed} onClick={() => void executeSend(true)}>시스템 계약 실행</button></div>
        </form>

        <form className="member-editor mail-test-editor" onSubmit={(event) => { event.preventDefault(); void executeTest("modern"); }}>
          <header><span className="eyebrow">Delivery probe</span><h3>테스트 메일</h3><p>현재·레거시 호환·시스템 계약을 구분해 검증합니다.</p></header>
          <fieldset disabled={writeDisabled}>
            <label>템플릿<select aria-label="테스트 템플릿" value={testDraft.templateId} onChange={(event) => setTestDraft({ ...testDraft, templateId: event.currentTarget.value })}><option value="">직접 작성</option>{list?.items.map((mail) => <option key={mail.ma_id} value={mail.ma_id}>#{mail.ma_id} {mail.ma_subject}</option>)}</select></label>
            <label>수신 주소<input type="email" value={testDraft.to} onChange={(event) => setTestDraft({ ...testDraft, to: event.currentTarget.value })} /></label>
            <label>직접 제목<input value={testDraft.subject} onChange={(event) => setTestDraft({ ...testDraft, subject: event.currentTarget.value })} /></label>
            <label>직접 본문<textarea rows={5} value={testDraft.content} onChange={(event) => setTestDraft({ ...testDraft, content: event.currentTarget.value })} /></label>
          </fieldset>
          <div className="action-row"><button className="primary-action" type="submit" disabled={writeDisabled || !externalConfirmed}>현재 테스트</button><button type="button" disabled={writeDisabled || !externalConfirmed} onClick={() => void executeTest("legacy")}>레거시 호환</button><button type="button" disabled={writeDisabled || !externalConfirmed} onClick={() => void executeTest("system")}>시스템 로그 테스트</button></div>
        </form>
      </div>

      <aside className="mail-safety-confirm" aria-label="메일 실행 안전 확인"><label><input type="checkbox" checked={externalConfirmed} onChange={(event) => setExternalConfirmed(event.currentTarget.checked)} />선택한 사이트·대상·dry-run 상태를 확인했고 이 1회 실행을 승인합니다.</label><span>{sendDraft.dryRun ? "DRY-RUN · 외부 전달 없음" : "LIVE · 외부 전달 가능"}</span></aside>
      {!session.step_up_active ? <p className="admin-step-up-note">메일 변경과 실행은 보안 설정에서 최근 본인 확인 후 가능합니다.</p> : null}
      {deleteOpen && selected ? <div className="dialog-backdrop"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="mail-delete-title"><h3 id="mail-delete-title">메일 템플릿 삭제</h3><p>#{selected.ma_id} {selected.ma_subject} 템플릿을 삭제합니다.</p><div className="action-row"><button type="button" disabled={busy} onClick={() => setDeleteOpen(false)}>취소</button><button className="danger-action" type="button" disabled={busy} onClick={() => void removeTemplate()}>삭제·재조회</button></div></div></div> : null}
    </section>
  );
}

function MailTemplateEditor({ title, draft, disabled, submitLabel, onChange, onSubmit, footer }: { title: string; draft: AdminMailTemplateDraft; disabled: boolean; submitLabel: string; onChange: (draft: AdminMailTemplateDraft) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; footer?: React.ReactNode }) {
  return <form className="member-editor mail-template-editor" onSubmit={onSubmit}><header><span className="eyebrow">Template</span><h3>{title}</h3><p>제목과 본문을 저장한 뒤 서버 값을 다시 읽습니다.</p></header><fieldset disabled={disabled}><label>메일 제목<input aria-label={`${title} 제목`} value={draft.subject} onChange={(event) => onChange({ ...draft, subject: event.currentTarget.value })} /></label><label>메일 본문<textarea aria-label={`${title} 본문`} rows={6} value={draft.content} onChange={(event) => onChange({ ...draft, content: event.currentTarget.value })} /></label></fieldset><div className="action-row"><button className="primary-action" type="submit" disabled={disabled}>{submitLabel}</button></div>{footer}</form>;
}
function Summary({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function errorMessage(caught: unknown, fallback: string): string { return caught instanceof Error ? caught.message : fallback; }
