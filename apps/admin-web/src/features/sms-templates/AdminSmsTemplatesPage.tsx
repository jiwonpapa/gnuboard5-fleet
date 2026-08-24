import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  batchAdminSmsTemplates,
  clearAdminSmsTemplateGroup,
  createAdminSmsTemplate,
  createAdminSmsTemplateGroup,
  deleteAdminSmsTemplate,
  deleteAdminSmsTemplateGroup,
  getAdminSmsTemplate,
  getAdminSmsTemplateGroup,
  listAdminSmsTemplateGroups,
  listAdminSmsTemplates,
  moveAdminSmsTemplateGroup,
  updateAdminSmsTemplate,
  updateAdminSmsTemplateGroup,
  type AdminSmsTemplate,
  type AdminSmsTemplateGroup,
  type AdminSmsTemplateList,
} from "../../api/fleet";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildSmsTemplateBatch,
  buildSmsTemplateGroupInput,
  buildSmsTemplateInput,
  emptySmsTemplateDraft,
  emptySmsTemplateGroupDraft,
  validateSmsTemplateDraft,
  validateSmsTemplateGroupDraft,
  type SmsTemplateDraft,
  type SmsTemplateGroupDraft,
} from "./adminSmsTemplatesForm";

interface Confirmation {
  title: string;
  description: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

export function AdminSmsTemplatesPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [groups, setGroups] = useState<AdminSmsTemplateGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupDraft, setGroupDraft] = useState<SmsTemplateGroupDraft>(emptySmsTemplateGroupDraft);
  const [moveTarget, setMoveTarget] = useState("");
  const [templateList, setTemplateList] = useState<AdminSmsTemplateList | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AdminSmsTemplate | null>(null);
  const [draft, setDraft] = useState<SmsTemplateDraft>(emptySmsTemplateDraft);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"all" | "name" | "content">("all");
  const [page, setPage] = useState(1);
  const [batchTarget, setBatchTarget] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refreshGroups = useCallback(async (preferredGroupId?: number) => {
    const result = await listAdminSmsTemplateGroups(siteId);
    setGroups(result.groups);
    setActiveGroupId((current) => {
      const candidate = preferredGroupId ?? current;
      if (candidate !== null && result.groups.some((group) => group.fg_no === candidate)) return candidate;
      return result.groups[0]?.fg_no ?? null;
    });
    return result.groups;
  }, [siteId]);

  const refreshTemplates = useCallback(async () => {
    const result = await listAdminSmsTemplates(siteId, {
      page,
      per_page: 20,
      ...(activeGroupId !== null ? { fg_no: activeGroupId } : {}),
      search_field: searchField,
      ...(search.trim() ? { search: search.trim() } : {}),
    });
    setTemplateList(result);
    setSelectedIds((current) => current.filter((id) => result.templates.some((item) => item.fo_no === id)));
    return result;
  }, [activeGroupId, page, search, searchField, siteId]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The async site-scoped read hydrates state only after its request resolves.
    setBusy(true);
    refreshGroups()
      .catch((caught) => active && setError(errorMessage(caught, "SMS 템플릿 그룹을 읽지 못했습니다.")))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [refreshGroups]);

  useEffect(() => {
    if (activeGroupId === null) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Filters hydrate from the site-scoped server response.
    setBusy(true);
    refreshTemplates()
      .catch((caught) => active && setError(errorMessage(caught, "SMS 템플릿을 읽지 못했습니다.")))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [activeGroupId, refreshTemplates]);

  const activeGroup = useMemo(
    () => groups.find((group) => group.fg_no === activeGroupId) ?? null,
    [activeGroupId, groups],
  );
  useEffect(() => {
    if (!creatingGroup && activeGroup && !groupDraft.fg_name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialize the editor from the first resolved group without erasing explicit create mode.
      setGroupDraft({ fg_name: activeGroup.fg_name, fg_member: activeGroup.fg_member === 1 });
    }
  }, [activeGroup, creatingGroup, groupDraft.fg_name]);
  const groupDraftError = validateSmsTemplateGroupDraft(groupDraft);
  const templateDraftError = validateSmsTemplateDraft(draft);
  const canWrite = session.step_up_active && !busy;

  async function mutate(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (caught) {
      setError(errorMessage(caught, "SMS 템플릿 작업에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function selectGroup(fgNo: number) {
    setCreatingGroup(false);
    setActiveGroupId(fgNo);
    setSelectedIds([]);
    setSelectedTemplate(null);
    setDraft({ ...emptySmsTemplateDraft, fg_no: String(fgNo) });
    setPage(1);
    try {
      const detail = await getAdminSmsTemplateGroup(siteId, fgNo);
      setGroupDraft({ fg_name: detail.fg_name, fg_member: detail.fg_member === 1 });
    } catch (caught) {
      setError(errorMessage(caught, "템플릿 그룹 상세를 읽지 못했습니다."));
    }
  }

  function startGroupCreate() {
    setCreatingGroup(true);
    setGroupDraft(emptySmsTemplateGroupDraft);
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (groupDraftError) return setError(groupDraftError);
    await mutate(async () => {
      const input = buildSmsTemplateGroupInput(groupDraft);
      if (!creatingGroup && activeGroupId !== null && activeGroupId > 0) {
        const updated = await updateAdminSmsTemplateGroup(siteId, activeGroupId, input, session.csrf_token);
        setGroupDraft({ fg_name: updated.fg_name, fg_member: updated.fg_member === 1 });
        await refreshGroups(updated.fg_no);
        setMessage("템플릿 그룹을 저장하고 서버 값을 재조회했습니다.");
      } else {
        const created = await createAdminSmsTemplateGroup(siteId, input, session.csrf_token);
        setCreatingGroup(false);
        setActiveGroupId(created.fg_no);
        setDraft({ ...emptySmsTemplateDraft, fg_no: String(created.fg_no) });
        await refreshGroups(created.fg_no);
        setMessage("새 템플릿 그룹을 만들었습니다.");
      }
    });
  }

  async function selectTemplate(foNo: number) {
    try {
      const template = await getAdminSmsTemplate(siteId, foNo);
      setSelectedTemplate(template);
      setDraft({ fg_no: String(template.fg_no), fo_name: template.fo_name, fo_content: template.fo_content });
    } catch (caught) {
      setError(errorMessage(caught, "템플릿 상세를 읽지 못했습니다."));
    }
  }

  function resetTemplate() {
    setSelectedTemplate(null);
    setDraft({ ...emptySmsTemplateDraft, fg_no: String(activeGroupId ?? 0) });
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (templateDraftError) return setError(templateDraftError);
    await mutate(async () => {
      const input = buildSmsTemplateInput(draft);
      if (selectedTemplate) {
        const updated = await updateAdminSmsTemplate(siteId, selectedTemplate.fo_no, input, session.csrf_token);
        setSelectedTemplate(updated);
        setDraft({ fg_no: String(updated.fg_no), fo_name: updated.fo_name, fo_content: updated.fo_content });
        setMessage("템플릿을 저장하고 서버 값을 재조회했습니다.");
      } else {
        const created = await createAdminSmsTemplate(siteId, input, session.csrf_token);
        setSelectedTemplate(created);
        setMessage("새 SMS 템플릿을 등록했습니다.");
      }
      await Promise.all([refreshGroups(), refreshTemplates()]);
    });
  }

  function confirmBatch(action: "move" | "delete") {
    if (!selectedIds.length) return setError("일괄 처리할 템플릿을 선택해 주십시오.");
    const target = Number(batchTarget);
    if (action === "move" && (!Number.isInteger(target) || target < 0)) return setError("대상 그룹을 선택해 주십시오.");
    const label = action === "move" ? "이동" : "삭제";
    setConfirmation({
      title: `선택 템플릿 ${label}`,
      description: `${selectedIds.length}건을 ${label}합니다. 서버가 확인값과 재인증을 다시 검사합니다.`,
      confirmLabel: `${label} 실행`,
      action: async () => mutate(async () => {
        const result = await batchAdminSmsTemplates(siteId, buildSmsTemplateBatch(action, selectedIds, target), session.csrf_token);
        setSelectedIds([]);
        await Promise.all([refreshGroups(), refreshTemplates()]);
        setMessage(`${result.affected}건 ${label} 처리를 완료했습니다.`);
      }),
    });
  }

  if (!siteId) return <p className="error-message">site_id가 없는 SMS 템플릿 경로입니다.</p>;

  return (
    <section className="page sms-templates-page" aria-labelledby="sms-templates-title">
      <div className="page-heading">
        <div><span className="eyebrow">Sites / {siteId} / SMS templates</span><h2 id="sms-templates-title">SMS 템플릿</h2><p>그룹별 문안과 본문을 정리하고 변경 결과를 다시 읽어 확인합니다.</p></div>
        <div className="sms-template-links"><Link to={`/sites/${encodeURIComponent(siteId)}/admin/sms`}>SMS 설정</Link><Link to={`/sites/${encodeURIComponent(siteId)}/admin/sms-contacts`}>연락처</Link></div>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      {!session.step_up_active ? <p className="admin-step-up-note">템플릿 변경에는 최근 재인증이 필요합니다.</p> : null}

      <div className="theme-summary-grid sms-template-summary" aria-label="템플릿 상태 요약">
        <Summary label="그룹" value={groups.filter((group) => !group.is_virtual).length} />
        <Summary label="현재 그룹" value={activeGroup?.fg_count ?? 0} />
        <Summary label="검색 결과" value={templateList?.pagination.total ?? templateList?.templates.length ?? 0} />
        <Summary label="회원 그룹" value={groups.filter((group) => group.fg_member === 1).length} />
        <Summary label="선택" value={selectedIds.length} />
      </div>

      <div className="sms-template-workspace">
        <aside className="member-list-panel sms-group-panel">
          <div className="workspace-panel-heading"><div><span className="eyebrow">Group index</span><h3>템플릿 그룹</h3></div><button type="button" onClick={startGroupCreate}>새 그룹</button></div>
          <div className="sms-group-list">
            {groups.map((group) => <button type="button" data-active={group.fg_no === activeGroupId} key={group.fg_no} onClick={() => void selectGroup(group.fg_no)}><span>{group.fg_name}</span><strong>{group.fg_count}</strong><small>{group.is_virtual ? "기본 분류" : group.fg_member === 1 ? "회원 전용" : "공용"}</small></button>)}
          </div>
          <form onSubmit={saveGroup} className="sms-group-editor">
            <label>그룹명<input aria-label="템플릿 그룹명" value={groupDraft.fg_name} disabled={!creatingGroup && activeGroup?.is_virtual} onChange={(event) => setGroupDraft({ ...groupDraft, fg_name: event.currentTarget.value })} /></label>
            <label className="sms-template-check"><input type="checkbox" checked={groupDraft.fg_member} disabled={!creatingGroup && activeGroup?.is_virtual} onChange={(event) => setGroupDraft({ ...groupDraft, fg_member: event.currentTarget.checked })} />회원 전용 그룹</label>
            <button className="primary-action" disabled={!canWrite || Boolean(groupDraftError) || (!creatingGroup && Boolean(activeGroup?.is_virtual))}>{creatingGroup ? "그룹 만들기" : "그룹 저장"}</button>
          </form>
          {activeGroup && !creatingGroup ? <div className="sms-group-danger">
            <label>이동 대상<select aria-label="템플릿 그룹 이동 대상" value={moveTarget} onChange={(event) => setMoveTarget(event.currentTarget.value)}><option value="">선택</option>{groups.filter((group) => group.fg_no !== activeGroupId).map((group) => <option key={group.fg_no} value={group.fg_no}>{group.fg_name}</option>)}</select></label>
            <button disabled={!canWrite || !moveTarget} onClick={() => setConfirmation({ title: "그룹 템플릿 이동", description: `${activeGroup.fg_name} 그룹의 템플릿을 선택한 그룹으로 옮깁니다.`, confirmLabel: "이동 실행", action: async () => mutate(async () => { const result = await moveAdminSmsTemplateGroup(siteId, activeGroup.fg_no, Number(moveTarget), session.csrf_token); await Promise.all([refreshGroups(), refreshTemplates()]); setMessage(`${result.affected}건을 대상 그룹으로 옮겼습니다.`); }) })}>그룹 템플릿 이동</button>
            <button disabled={!canWrite} onClick={() => setConfirmation({ title: "그룹 템플릿 비우기", description: `${activeGroup.fg_name} 그룹의 템플릿을 모두 삭제합니다.`, confirmLabel: "그룹 비우기", action: async () => mutate(async () => { const result = await clearAdminSmsTemplateGroup(siteId, activeGroup.fg_no, session.csrf_token); resetTemplate(); await Promise.all([refreshGroups(), refreshTemplates()]); setMessage(`${result.deleted}건을 삭제했습니다.`); }) })}>그룹 비우기</button>
            {!activeGroup.is_virtual ? <button className="danger-action" disabled={!canWrite} onClick={() => setConfirmation({ title: "템플릿 그룹 삭제", description: "잔여 템플릿 제약은 서버가 최종 확인합니다.", confirmLabel: "그룹 삭제", action: async () => mutate(async () => { await deleteAdminSmsTemplateGroup(siteId, activeGroup.fg_no, session.csrf_token); setActiveGroupId(null); setGroupDraft(emptySmsTemplateGroupDraft); resetTemplate(); await refreshGroups(); setMessage("템플릿 그룹을 삭제했습니다."); }) })}>그룹 삭제</button> : null}
          </div> : null}
        </aside>

        <main className="sms-template-main">
          <section className="member-list-panel">
            <div className="workspace-panel-heading"><div><span className="eyebrow">Template inventory</span><h3>{activeGroup?.fg_name ?? "전체"} 문안</h3></div><button type="button" onClick={resetTemplate}>새 템플릿</button></div>
            <div className="sms-contact-filter">
              <select aria-label="템플릿 검색 필드" value={searchField} onChange={(event) => { setPage(1); setSearchField(event.currentTarget.value as typeof searchField); }}><option value="all">전체</option><option value="name">이름</option><option value="content">내용</option></select>
              <input aria-label="템플릿 검색" placeholder="이름 또는 본문" value={search} onChange={(event) => { setPage(1); setSearch(event.currentTarget.value); }} />
              <span>{selectedIds.length}건 선택</span>
            </div>
            <div className="sms-template-table-wrap"><table className="admin-table sms-template-table"><thead><tr><th><span className="sr-only">선택</span></th><th>이름</th><th>본문</th><th>그룹</th><th>수정일</th></tr></thead><tbody>{templateList?.templates.map((template) => <tr key={template.fo_no} data-selected={selectedTemplate?.fo_no === template.fo_no}><td><input aria-label={`${template.fo_name} 선택`} type="checkbox" checked={selectedIds.includes(template.fo_no)} onChange={() => setSelectedIds((current) => current.includes(template.fo_no) ? current.filter((id) => id !== template.fo_no) : [...current, template.fo_no])} /></td><td><button type="button" onClick={() => void selectTemplate(template.fo_no)}>{template.fo_name}</button></td><td className="sms-template-preview">{template.fo_content}</td><td>{template.fg_name ?? "미분류"}</td><td>{template.fo_datetime ?? "—"}</td></tr>)}</tbody></table></div>
            {!templateList?.templates.length && !busy ? <p className="empty-state">조건에 맞는 템플릿이 없습니다.</p> : null}
            <div className="sms-batch-row"><select aria-label="일괄 대상 템플릿 그룹" value={batchTarget} onChange={(event) => setBatchTarget(event.currentTarget.value)}><option value="">대상 그룹</option>{groups.map((group) => <option key={group.fg_no} value={group.fg_no}>{group.fg_name}</option>)}</select><button disabled={!canWrite || !selectedIds.length || !batchTarget} onClick={() => confirmBatch("move")}>이동</button><button className="danger-action" disabled={!canWrite || !selectedIds.length} onClick={() => confirmBatch("delete")}>삭제</button></div>
            <div className="pagination-row"><button disabled={page <= 1 || busy} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button><span>{page} / {templateList?.pagination.last_page ?? 1}</span><button disabled={busy || !(templateList?.pagination.has_next ?? false)} onClick={() => setPage((value) => value + 1)}>다음</button></div>
          </section>

          <form className="member-editor sms-template-editor" onSubmit={saveTemplate}>
            <header><span className="eyebrow">Template detail</span><h3>{selectedTemplate ? "템플릿 편집" : "템플릿 등록"}</h3></header>
            <div className="sms-template-form-grid"><label>그룹<select aria-label="템플릿 그룹" value={draft.fg_no} onChange={(event) => setDraft({ ...draft, fg_no: event.currentTarget.value })}>{groups.map((group) => <option key={group.fg_no} value={group.fg_no}>{group.fg_name}</option>)}</select></label><label>템플릿 이름<input aria-label="템플릿 이름" value={draft.fo_name} onChange={(event) => setDraft({ ...draft, fo_name: event.currentTarget.value })} /></label><label className="sms-template-content">본문<textarea aria-label="템플릿 본문" value={draft.fo_content} onChange={(event) => setDraft({ ...draft, fo_content: event.currentTarget.value })} /></label></div>
            {templateDraftError ? <p className="field-error">{templateDraftError}</p> : null}
            <div className="action-row"><button type="button" onClick={resetTemplate}>새 템플릿</button>{selectedTemplate ? <button type="button" className="danger-action" disabled={!canWrite} onClick={() => setConfirmation({ title: "SMS 템플릿 삭제", description: `${selectedTemplate.fo_name} 템플릿을 삭제합니다.`, confirmLabel: "템플릿 삭제", action: async () => mutate(async () => { await deleteAdminSmsTemplate(siteId, selectedTemplate.fo_no, session.csrf_token); resetTemplate(); await Promise.all([refreshGroups(), refreshTemplates()]); setMessage("템플릿을 삭제했습니다."); }) })}>삭제</button> : null}<button className="primary-action" disabled={!canWrite || Boolean(templateDraftError)}>{selectedTemplate ? "저장·재조회" : "템플릿 등록"}</button></div>
          </form>
        </main>
      </div>

      {confirmation ? <div className="dialog-backdrop"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="sms-template-confirm-title"><span className="eyebrow">Explicit confirmation</span><h3 id="sms-template-confirm-title">{confirmation.title}</h3><p>{confirmation.description}</p><div><button onClick={() => setConfirmation(null)}>취소</button><button className="danger-action" disabled={busy} onClick={() => { const action = confirmation.action; setConfirmation(null); void action(); }}>{confirmation.confirmLabel}</button></div></section></div> : null}
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <article><span>{label}</span><strong>{value.toLocaleString()}</strong></article>;
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
