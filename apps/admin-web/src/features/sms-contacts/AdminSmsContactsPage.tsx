import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  batchAdminSmsContacts,
  clearAdminSmsContactGroup,
  createAdminSmsContact,
  createAdminSmsContactGroup,
  deleteAdminSmsContact,
  deleteAdminSmsContactGroup,
  exportAdminSmsContacts,
  getAdminSmsContact,
  getAdminSmsContactGroup,
  importAdminSmsContacts,
  listAdminSmsContactGroups,
  listAdminSmsContacts,
  moveAdminSmsContactGroup,
  updateAdminSmsContact,
  updateAdminSmsContactGroup,
  type AdminSmsContact,
  type AdminSmsContactBatchAction,
  type AdminSmsContactGroup,
  type AdminSmsContactImportResult,
  type AdminSmsContactList,
} from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildSmsContactBatch,
  buildSmsContactInput,
  emptySmsContactDraft,
  parseSmsContactImport,
  smsContactsCsv,
  validateSmsContactDraft,
  type SmsContactDraft,
} from "./adminSmsContactsForm";

interface Confirmation {
  title: string;
  description: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

export function AdminSmsContactsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [groups, setGroups] = useState<AdminSmsContactGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [moveTarget, setMoveTarget] = useState("");
  const [contactList, setContactList] = useState<AdminSmsContactList | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedContact, setSelectedContact] = useState<AdminSmsContact | null>(null);
  const [draft, setDraft] = useState<SmsContactDraft>(emptySmsContactDraft);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"all" | "name" | "hp">("all");
  const [phoneOnly, setPhoneOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [batchTarget, setBatchTarget] = useState("");
  const [importText, setImportText] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [importResult, setImportResult] = useState<AdminSmsContactImportResult | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refreshGroups = useCallback(async () => {
    const result = await listAdminSmsContactGroups(siteId);
    setGroups(result.groups);
    const fallback = activeGroupId && result.groups.some((group) => group.bg_no === activeGroupId)
      ? activeGroupId
      : result.groups[0]?.bg_no ?? null;
    setActiveGroupId(fallback);
    setDraft((current) => ({ ...current, bg_no: current.bg_no || String(fallback ?? "") }));
    return result.groups;
  }, [activeGroupId, siteId]);

  const refreshContacts = useCallback(async () => {
    const result = await listAdminSmsContacts(siteId, {
      page,
      per_page: 20,
      ...(activeGroupId ? { bg_no: activeGroupId } : {}),
      search_field: searchField,
      ...(search.trim() ? { search: search.trim() } : {}),
      with_phone_only: phoneOnly,
    });
    setContactList(result);
    setSelectedIds((current) => current.filter((id) => result.contacts.some((item) => item.bk_no === id)));
    return result;
  }, [activeGroupId, page, phoneOnly, search, searchField, siteId]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The async site-scoped reads hydrate state only after their requests resolve.
    setBusy(true);
    Promise.all([refreshGroups(), refreshContacts()])
      .catch((caught) => active && setError(errorMessage(caught, "SMS 연락처를 읽지 못했습니다.")))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [refreshContacts, refreshGroups]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.bg_no === activeGroupId) ?? null,
    [activeGroupId, groups],
  );
  const draftError = validateSmsContactDraft(draft);
  const canWrite = session.step_up_active && !busy;

  async function mutate(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (caught) {
      setError(errorMessage(caught, "SMS 연락처 작업에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function selectGroup(bgNo: number) {
    setActiveGroupId(bgNo);
    setPage(1);
    setSelectedIds([]);
    setDraft((current) => ({ ...current, bg_no: String(bgNo) }));
    try {
      const detail = await getAdminSmsContactGroup(siteId, bgNo);
      setGroupName(detail.bg_name);
    } catch (caught) {
      setError(errorMessage(caught, "그룹 상세를 읽지 못했습니다."));
    }
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = groupName.trim();
    if (!name) return setError("그룹명을 입력해 주십시오.");
    await mutate(async () => {
      if (activeGroupId) {
        await updateAdminSmsContactGroup(siteId, activeGroupId, name, session.csrf_token);
        setMessage("그룹명을 저장하고 서버 값을 재조회했습니다.");
      } else {
        const created = await createAdminSmsContactGroup(siteId, name, session.csrf_token);
        setActiveGroupId(created.bg_no);
        setDraft((current) => ({ ...current, bg_no: String(created.bg_no) }));
        setMessage("새 연락처 그룹을 만들었습니다.");
      }
      await refreshGroups();
    });
  }

  async function selectContact(bkNo: number) {
    try {
      const contact = await getAdminSmsContact(siteId, bkNo);
      setSelectedContact(contact);
      setDraft({
        bg_no: String(contact.bg_no),
        bk_name: contact.bk_name,
        bk_hp: contact.bk_hp,
        bk_receipt: contact.bk_receipt === 1,
        bk_memo: contact.bk_memo ?? "",
      });
    } catch (caught) {
      setError(errorMessage(caught, "연락처 상세를 읽지 못했습니다."));
    }
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draftError) return setError(draftError);
    await mutate(async () => {
      const input = buildSmsContactInput(draft);
      if (selectedContact) {
        const updated = await updateAdminSmsContact(siteId, selectedContact.bk_no, input, session.csrf_token);
        setSelectedContact(updated);
        setMessage("연락처를 저장하고 서버 값을 재조회했습니다.");
      } else {
        const created = await createAdminSmsContact(siteId, input, session.csrf_token);
        setSelectedContact(created);
        setMessage("새 연락처를 등록했습니다.");
      }
      await Promise.all([refreshGroups(), refreshContacts()]);
    });
  }

  function resetContact() {
    setSelectedContact(null);
    setDraft({ ...emptySmsContactDraft, bg_no: String(activeGroupId ?? groups[0]?.bg_no ?? "") });
  }

  function confirmBatch(action: AdminSmsContactBatchAction) {
    if (!selectedIds.length) return setError("일괄 처리할 연락처를 선택해 주십시오.");
    const target = Number(batchTarget);
    if ((action === "move" || action === "copy") && (!Number.isInteger(target) || target < 1)) return setError("대상 그룹을 선택해 주십시오.");
    setConfirmation({
      title: `선택 연락처 ${batchLabel(action)} 처리`,
      description: `${selectedIds.length}건을 ${batchLabel(action)}합니다. 서버가 확인값과 재인증을 다시 검사합니다.`,
      confirmLabel: `${batchLabel(action)} 실행`,
      action: async () => {
        await mutate(async () => {
          const result = await batchAdminSmsContacts(siteId, buildSmsContactBatch(action, selectedIds, target), session.csrf_token);
          setSelectedIds([]);
          await Promise.all([refreshGroups(), refreshContacts()]);
          setMessage(`${result.affected}건 ${batchLabel(action)} 처리를 완료했습니다.`);
        });
      },
    });
  }

  async function submitImport() {
    const contacts = parseSmsContactImport(importText);
    if (!activeGroupId || !contacts.length) return setError("그룹과 가져올 연락처를 확인해 주십시오.");
    const execute = async () => {
      await mutate(async () => {
        const result = await importAdminSmsContacts(siteId, { bg_no: activeGroupId, dry_run: dryRun, contacts }, session.csrf_token);
        setImportResult(result);
        await Promise.all([refreshGroups(), refreshContacts()]);
        setMessage(dryRun ? `미리보기: ${result.importable_count}건 가져오기 가능` : `${result.imported_count}건을 가져왔습니다.`);
      });
    };
    if (dryRun) return execute();
    setConfirmation({ title: "연락처 가져오기 실행", description: `${contacts.length}개 행을 현재 그룹에 반영합니다. 이 작업은 외부 문자를 발송하지 않습니다.`, confirmLabel: "확인 후 가져오기", action: execute });
  }

  async function downloadExport() {
    await mutate(async () => {
      const result = await exportAdminSmsContacts(siteId, { ...(activeGroupId ? { bg_no: activeGroupId } : {}), include_no_phone: false, with_hyphen: true });
      const url = URL.createObjectURL(new Blob(["\uFEFF", smsContactsCsv(result.items)], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `g5-fleet-sms-contacts-${siteId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`${result.total}건 내보내기 파일을 만들었습니다.`);
    });
  }

  if (!siteId) return <p className="error-message">site_id가 없는 SMS 연락처 경로입니다.</p>;

  return (
    <section className="page sms-contacts-page" aria-labelledby="sms-contacts-title">
      <div className="page-heading">
        <div><span className="eyebrow">Sites / {siteId} / SMS contacts</span><h2 id="sms-contacts-title">SMS 연락처</h2><p>그룹·연락처·가져오기 상태를 한 흐름에서 관리합니다. 이 작업면은 문자를 발송하지 않습니다.</p></div>
        <Link to={`/sites/${encodeURIComponent(siteId)}/admin/sms`}>SMS 설정</Link>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      {!session.step_up_active ? <p className="admin-step-up-note">연락처 변경에는 최근 재인증이 필요합니다.</p> : null}

      <div className="theme-summary-grid sms-contacts-summary" aria-label="연락처 상태 요약">
        <Summary label="그룹" value={groups.length} /><Summary label="전체 연락처" value={contactList?.summary.total_count ?? 0} />
        <Summary label="수신 허용" value={contactList?.summary.receipt_count ?? 0} /><Summary label="수신 거부" value={contactList?.summary.reject_count ?? 0} />
        <Summary label="회원 연동" value={contactList?.summary.member_count ?? 0} /><Summary label="비회원" value={contactList?.summary.non_member_count ?? 0} />
      </div>

      <div className="sms-contacts-workspace">
        <aside className="member-list-panel sms-group-panel">
          <div className="workspace-panel-heading"><div><span className="eyebrow">Group index</span><h3>연락처 그룹</h3></div><button type="button" onClick={() => { setActiveGroupId(null); setGroupName(""); }}>새 그룹</button></div>
          <div className="sms-group-list">
            {groups.map((group) => <button type="button" data-active={group.bg_no === activeGroupId} key={group.bg_no} onClick={() => void selectGroup(group.bg_no)}><span>{group.bg_name}</span><strong>{group.bg_count}</strong><small>허용 {group.bg_receipt} · 거부 {group.bg_reject}</small></button>)}
          </div>
          <form onSubmit={saveGroup} className="sms-group-editor">
            <label>그룹명<input aria-label="그룹명" value={groupName} onChange={(event) => setGroupName(event.currentTarget.value)} /></label>
            <button className="primary-action" disabled={!canWrite || !groupName.trim()}>{activeGroupId ? "그룹명 저장" : "그룹 만들기"}</button>
          </form>
          {activeGroup ? <div className="sms-group-danger">
            <label>이동 대상<select aria-label="그룹 이동 대상" value={moveTarget} onChange={(event) => setMoveTarget(event.currentTarget.value)}><option value="">선택</option>{groups.filter((group) => group.bg_no !== activeGroupId).map((group) => <option key={group.bg_no} value={group.bg_no}>{group.bg_name}</option>)}</select></label>
            <button disabled={!canWrite || !moveTarget} onClick={() => void mutate(async () => { const result = await moveAdminSmsContactGroup(siteId, activeGroup.bg_no, Number(moveTarget), session.csrf_token); await Promise.all([refreshGroups(), refreshContacts()]); setMessage(`${result.affected}건을 대상 그룹으로 옮겼습니다.`); })}>그룹 연락처 이동</button>
            <button disabled={!canWrite} onClick={() => setConfirmation({ title: "그룹 연락처 비우기", description: `${activeGroup.bg_name} 그룹의 연락처를 모두 삭제합니다.`, confirmLabel: "그룹 비우기", action: async () => mutate(async () => { const result = await clearAdminSmsContactGroup(siteId, activeGroup.bg_no, session.csrf_token); await Promise.all([refreshGroups(), refreshContacts()]); setMessage(`${result.deleted}건을 삭제했습니다.`); }) })}>그룹 비우기</button>
            <button className="danger-action" disabled={!canWrite} onClick={() => setConfirmation({ title: "연락처 그룹 삭제", description: "기본 그룹·잔여 연락처 제약은 서버가 최종 확인합니다.", confirmLabel: "그룹 삭제", action: async () => mutate(async () => { await deleteAdminSmsContactGroup(siteId, activeGroup.bg_no, session.csrf_token); setActiveGroupId(null); setGroupName(""); await refreshGroups(); setMessage("연락처 그룹을 삭제했습니다."); }) })}>그룹 삭제</button>
          </div> : null}
        </aside>

        <main className="sms-contact-main">
          <section className="member-list-panel sms-contact-list-panel">
            <div className="workspace-panel-heading"><div><span className="eyebrow">Contact inventory</span><h3>{activeGroup?.bg_name ?? "전체"} 연락처</h3></div><span>{selectedIds.length}건 선택</span></div>
            <div className="sms-contact-filter">
              <select aria-label="검색 필드" value={searchField} onChange={(event) => { setPage(1); setSearchField(event.currentTarget.value as typeof searchField); }}><option value="all">전체</option><option value="name">이름</option><option value="hp">번호</option></select>
              <input aria-label="연락처 검색" placeholder="이름 또는 번호" value={search} onChange={(event) => { setPage(1); setSearch(event.currentTarget.value); }} />
              <label><input type="checkbox" checked={phoneOnly} onChange={(event) => { setPage(1); setPhoneOnly(event.currentTarget.checked); }} />번호 있음만</label>
            </div>
            <div className="sms-contact-table-wrap"><table className="admin-table sms-contact-table"><thead><tr><th><span className="sr-only">선택</span></th><th>이름</th><th>휴대폰</th><th>그룹</th><th>수신</th><th>구분</th></tr></thead><tbody>{contactList?.contacts.map((contact) => <tr key={contact.bk_no} data-selected={selectedContact?.bk_no === contact.bk_no}><td><input aria-label={`${contact.bk_name} 선택`} type="checkbox" checked={selectedIds.includes(contact.bk_no)} onChange={() => setSelectedIds((current) => current.includes(contact.bk_no) ? current.filter((id) => id !== contact.bk_no) : [...current, contact.bk_no])} /></td><td><button type="button" onClick={() => void selectContact(contact.bk_no)}>{contact.bk_name}</button></td><td>{contact.bk_hp || "—"}</td><td>{contact.bg_name ?? contact.bg_no}</td><td><span className="status-chip" data-state={contact.bk_receipt === 1 ? "active" : "planned"}>{contact.receipt_label}</span></td><td>{contact.member_type}</td></tr>)}</tbody></table></div>
            {!contactList?.contacts.length && !busy ? <p className="empty-state">조건에 맞는 연락처가 없습니다.</p> : null}
            <div className="sms-batch-row"><select aria-label="일괄 대상 그룹" value={batchTarget} onChange={(event) => setBatchTarget(event.currentTarget.value)}><option value="">대상 그룹</option>{groups.map((group) => <option key={group.bg_no} value={group.bg_no}>{group.bg_name}</option>)}</select>{(["allow", "reject", "move", "copy", "delete"] as const).map((action) => <button key={action} disabled={!canWrite || !selectedIds.length} className={action === "delete" ? "danger-action" : ""} onClick={() => confirmBatch(action)}>{batchLabel(action)}</button>)}</div>
            <div className="pagination-row"><button disabled={page <= 1 || busy} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button><span>{page} / {contactList?.pagination.last_page ?? 1}</span><button disabled={busy || !(contactList?.pagination.has_next ?? false)} onClick={() => setPage((value) => value + 1)}>다음</button></div>
          </section>

          <div className="sms-contact-detail-grid">
            <form className="member-editor sms-contact-editor" onSubmit={saveContact}>
              <header><span className="eyebrow">Contact detail</span><h3>{selectedContact ? "연락처 편집" : "연락처 등록"}</h3></header>
              <div className="sms-field-grid"><label>그룹<select aria-label="연락처 그룹" value={draft.bg_no} onChange={(event) => setDraft({ ...draft, bg_no: event.currentTarget.value })}><option value="">선택</option>{groups.map((group) => <option key={group.bg_no} value={group.bg_no}>{group.bg_name}</option>)}</select></label><label>이름<input aria-label="연락처 이름" value={draft.bk_name} onChange={(event) => setDraft({ ...draft, bk_name: event.currentTarget.value })} /></label><label>휴대폰<input aria-label="연락처 휴대폰" inputMode="tel" value={draft.bk_hp} onChange={(event) => setDraft({ ...draft, bk_hp: event.currentTarget.value })} /></label><label className="sms-receipt-field"><input type="checkbox" checked={draft.bk_receipt} onChange={(event) => setDraft({ ...draft, bk_receipt: event.currentTarget.checked })} />SMS 수신 허용</label><label className="sms-contact-memo">메모<textarea aria-label="연락처 메모" value={draft.bk_memo} onChange={(event) => setDraft({ ...draft, bk_memo: event.currentTarget.value })} /></label></div>
              {draftError ? <p className="field-error">{draftError}</p> : null}
              <div className="action-row"><button type="button" onClick={resetContact}>새 연락처</button>{selectedContact ? <button type="button" className="danger-action" disabled={!canWrite} onClick={() => setConfirmation({ title: "연락처 삭제", description: `${selectedContact.bk_name} 연락처를 삭제합니다.`, confirmLabel: "연락처 삭제", action: async () => mutate(async () => { await deleteAdminSmsContact(siteId, selectedContact.bk_no, session.csrf_token); resetContact(); await Promise.all([refreshGroups(), refreshContacts()]); setMessage("연락처를 삭제했습니다."); }) })}>삭제</button> : null}<button className="primary-action" disabled={!canWrite || Boolean(draftError)}>{selectedContact ? "저장·재조회" : "연락처 등록"}</button></div>
            </form>

            <section className="member-list-panel sms-import-panel"><header><span className="eyebrow">Import / export</span><h3>가져오기·내보내기</h3><p>쉼표·탭으로 구분한 이름과 번호를 미리 검증합니다.</p></header><textarea aria-label="가져올 연락처" placeholder={'홍길동,010-1234-5678\n김영희\t01098765432'} value={importText} onChange={(event) => setImportText(event.currentTarget.value)} /><input aria-label="연락처 파일" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void file.text().then(setImportText); }} /><label><input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.currentTarget.checked)} />미리보기만 실행</label><div className="action-row"><button disabled={busy} onClick={() => void downloadExport()}>CSV 내보내기</button><button className="primary-action" disabled={!canWrite || !importText.trim()} onClick={() => void submitImport()}>{dryRun ? "가져오기 미리보기" : "가져오기 확인"}</button></div>{importResult ? <dl className="sms-import-result"><div><dt>전체</dt><dd>{importResult.total_count}</dd></div><div><dt>유효</dt><dd>{importResult.importable_count}</dd></div><div><dt>중복</dt><dd>{importResult.duplicate_count}</dd></div><div><dt>오류</dt><dd>{importResult.invalid_count}</dd></div></dl> : null}</section>
          </div>
        </main>
      </div>

      {confirmation ? <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="sms-contact-confirm-title"><span className="eyebrow">Explicit confirmation</span><h3 id="sms-contact-confirm-title">{confirmation.title}</h3><p>{confirmation.description}</p><div><button onClick={() => setConfirmation(null)}>취소</button><button className="danger-action" disabled={busy} onClick={() => { const action = confirmation.action; setConfirmation(null); void action(); }}>{confirmation.confirmLabel}</button></div></section></div> : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <article><span>{label}</span><strong>{value.toLocaleString()}</strong></article>;
}

function batchLabel(action: AdminSmsContactBatchAction): string {
  return ({ allow: "수신 허용", reject: "수신 거부", move: "이동", copy: "복사", delete: "삭제" })[action];
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
