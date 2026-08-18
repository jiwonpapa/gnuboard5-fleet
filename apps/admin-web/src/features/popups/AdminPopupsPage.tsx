import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createAdminSystemPopup,
  deleteAdminSystemPopup,
  getAdminSystemPopup,
  listAdminSystemPopups,
  updateAdminSystemPopup,
  type AdminPopup,
  type AdminPopupList,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminPopupCreate,
  buildAdminPopupUpdate,
  emptyAdminPopupForm,
  popupDeviceOptions,
  popupDivisionOptions,
  popupDraft,
  type AdminPopupFormDraft,
} from "./adminPopupForm";

export function AdminPopupsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [list, setList] = useState<AdminPopupList | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminPopup | null>(null);
  const [page, setPage] = useState(1);
  const [createDraft, setCreateDraft] = useState<AdminPopupFormDraft>(emptyAdminPopupForm);
  const [editDraft, setEditDraft] = useState<AdminPopupFormDraft>(emptyAdminPopupForm);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void listAdminSystemPopups(siteId, { page, per_page: 20 }).then((result) => {
      if (!active) return;
      setList(result);
      setSelectedId((current) => current !== null && result.items.some((item) => item.nw_id === current) ? current : result.items[0]?.nw_id ?? null);
    }).catch((caught) => active && setError(errorMessage(caught, "팝업 목록을 읽지 못했습니다.")));
    return () => { active = false; };
  }, [page, siteId]);

  useEffect(() => {
    if (selectedId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- An empty async list must clear stale detail state.
      setSelected(null);
      return;
    }
    let active = true;
    void getAdminSystemPopup(siteId, selectedId).then((popup) => {
      if (!active) return;
      setSelected(popup);
      setEditDraft(popupDraft(popup));
    }).catch((caught) => active && setError(errorMessage(caught, "팝업 상세를 읽지 못했습니다.")));
    return () => { active = false; };
  }, [selectedId, siteId]);

  async function refresh(preferredId?: number) {
    const result = await listAdminSystemPopups(siteId, { page, per_page: 20 });
    setList(result);
    const next = preferredId ?? selectedId;
    const resolved = next !== null && result.items.some((item) => item.nw_id === next) ? next : result.items[0]?.nw_id ?? null;
    setSelectedId(resolved);
    if (resolved === null) { setSelected(null); return; }
    const popup = await getAdminSystemPopup(siteId, resolved);
    setSelected(popup);
    setEditDraft(popupDraft(popup));
  }

  async function createPopup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = buildAdminPopupCreate(createDraft);
    if (!input) { setError("제목·본문과 0 이상의 위치·크기 값을 확인하십시오."); return; }
    await run(async () => {
      const popup = await createAdminSystemPopup(siteId, input, session.csrf_token);
      setCreateDraft(emptyAdminPopupForm);
      await refresh(popup.nw_id);
      setMessage("팝업을 생성하고 목록·상세를 재조회했습니다.");
    });
  }

  async function updatePopup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const input = buildAdminPopupUpdate(selected, editDraft);
    if (!input) { setError("변경값이 없거나 입력값이 올바르지 않습니다."); return; }
    await run(async () => {
      const popup = await updateAdminSystemPopup(siteId, selected.nw_id, input, session.csrf_token);
      await refresh(popup.nw_id);
      setMessage("팝업을 저장하고 목록·상세를 재조회했습니다.");
    });
  }

  async function deletePopup() {
    if (!selected) return;
    await run(async () => {
      await deleteAdminSystemPopup(siteId, selected.nw_id, session.csrf_token);
      setDeleteOpen(false);
      setSelectedId(null);
      await refresh();
      setMessage("팝업을 삭제하고 목록을 재조회했습니다.");
    });
  }

  async function run(task: () => Promise<void>) {
    setBusy(true); setError(""); setMessage("");
    try { await task(); } catch (caught) { setError(errorMessage(caught, "팝업 작업에 실패했습니다.")); }
    finally { setBusy(false); }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 팝업 관리 경로입니다.</p>;
  const pagination = list?.pagination;
  return (
    <section className="page popups-page" aria-labelledby="popups-title">
      <div className="page-heading"><div><span className="eyebrow">Sites / {siteId} / Popups</span><h2 id="popups-title">팝업 관리</h2><p>기존 Tauri 화면의 목록·상세·생성·희소 수정·삭제 흐름을 반응형 웹 작업대로 옮겼습니다.</p></div><Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link></div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}
      <div className="theme-summary-grid" aria-label="팝업 상태 요약">
        <Summary label="전체 팝업" value={`${pagination?.total ?? 0}건`} />
        <Summary label="선택 팝업" value={selected ? `#${selected.nw_id}` : "없음"} />
        <Summary label="노출 기기" value={selected?.nw_device ?? "선택 대기"} />
      </div>
      <div className="member-workspace popups-workspace">
        <section className="member-list-panel" aria-labelledby="popup-list-title">
          <div className="workspace-panel-heading"><h3 id="popup-list-title">팝업 목록</h3><span>{pagination?.total ?? 0}건</span></div>
          <AdminDataTable columns={[
            { header: "ID", render: (popup) => <strong>#{popup.nw_id}</strong> },
            { header: "제목 / 기간", render: (popup) => <><strong>{popup.nw_subject || "제목 없음"}</strong><small>{popup.nw_begin_time || "시작 미지정"} → {popup.nw_end_time || "종료 미지정"}</small></> },
            { header: "기기", render: (popup) => <span>{popup.nw_device || "both"}</span> },
          ]} emptyMessage="조회된 팝업이 없습니다." getRowKey={(popup) => String(popup.nw_id)} onRowClick={(popup) => setSelectedId(popup.nw_id)} rows={list?.items ?? []} selectedKey={selectedId === null ? null : String(selectedId)} />
          <div className="action-row popup-pagination"><button type="button" disabled={busy || !pagination?.has_prev} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button><span>{pagination?.page ?? page} / {pagination?.last_page ?? 1}</span><button type="button" disabled={busy || !pagination?.has_next} onClick={() => setPage((value) => value + 1)}>다음</button></div>
        </section>
        <div className="theme-editor-stack">
          <PopupEditor title="팝업 생성" draft={createDraft} disabled={busy || !session.step_up_active} submitLabel="팝업 생성·재조회" onChange={setCreateDraft} onSubmit={createPopup} />
          {selected ? <PopupEditor title={`선택 팝업 #${selected.nw_id}`} draft={editDraft} disabled={busy || !session.step_up_active} submitLabel="팝업 저장·재조회" onChange={setEditDraft} onSubmit={updatePopup} footer={<div className="action-row"><button type="button" disabled={busy} onClick={() => setEditDraft(popupDraft(selected))}>서버 값으로 되돌리기</button><button className="danger-action" type="button" disabled={busy || !session.step_up_active} onClick={() => setDeleteOpen(true)}>팝업 삭제</button></div>} /> : <section className="member-editor"><h3>선택 팝업 편집</h3><p>목록에서 팝업을 선택하십시오.</p></section>}
          {!session.step_up_active ? <p className="admin-step-up-note">팝업 변경은 보안 설정에서 최근 본인 확인 후 가능합니다.</p> : null}
        </div>
      </div>
      {deleteOpen && selected ? <div className="dialog-backdrop"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="popup-delete-title"><h3 id="popup-delete-title">팝업 삭제</h3><p>#{selected.nw_id} {selected.nw_subject} 팝업을 삭제합니다.</p><div className="action-row"><button type="button" disabled={busy} onClick={() => setDeleteOpen(false)}>취소</button><button className="danger-action" type="button" disabled={busy} onClick={() => void deletePopup()}>삭제·재조회</button></div></div></div> : null}
    </section>
  );
}

function PopupEditor({ title, draft, disabled, submitLabel, onChange, onSubmit, footer }: { title: string; draft: AdminPopupFormDraft; disabled: boolean; submitLabel: string; onChange: (draft: AdminPopupFormDraft) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; footer?: React.ReactNode }) {
  const numberFields = [["nw_disable_hours", "닫기 유지시간"], ["nw_left", "좌측"], ["nw_top", "상단"], ["nw_height", "높이"], ["nw_width", "너비"]] as const;
  return <form className="member-editor popup-editor" onSubmit={onSubmit}><header><span className="eyebrow">Popup workspace</span><h3>{title}</h3><p>노출 범위·기간·위치·크기와 본문을 한 작업면에서 관리합니다.</p></header><fieldset disabled={disabled}><legend>{title} 입력</legend><div className="popup-field-grid"><label>구분<select value={draft.nw_division} onChange={(event) => onChange({ ...draft, nw_division: event.currentTarget.value as AdminPopupFormDraft["nw_division"] })}>{popupDivisionOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label>디바이스<select value={draft.nw_device} onChange={(event) => onChange({ ...draft, nw_device: event.currentTarget.value as AdminPopupFormDraft["nw_device"] })}>{popupDeviceOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label>시작 시각<input placeholder="YYYY-MM-DD HH:MM:SS" value={draft.nw_begin_time} onChange={(event) => onChange({ ...draft, nw_begin_time: event.currentTarget.value })} /></label><label>종료 시각<input placeholder="YYYY-MM-DD HH:MM:SS" value={draft.nw_end_time} onChange={(event) => onChange({ ...draft, nw_end_time: event.currentTarget.value })} /></label>{numberFields.map(([field, label]) => <label key={field}>{label}<input type="number" min="0" step="1" value={draft[field]} onChange={(event) => onChange({ ...draft, [field]: event.currentTarget.value })} /></label>)}</div><label>팝업 제목<input value={draft.nw_subject} onChange={(event) => onChange({ ...draft, nw_subject: event.currentTarget.value })} /></label><label>팝업 본문<textarea rows={7} value={draft.nw_content} onChange={(event) => onChange({ ...draft, nw_content: event.currentTarget.value })} /></label><label className="poll-toggle"><input type="checkbox" checked={draft.nw_content_html} onChange={(event) => onChange({ ...draft, nw_content_html: event.currentTarget.checked })} />HTML 본문</label></fieldset><div className="action-row"><button className="primary-action" type="submit" disabled={disabled}>{submitLabel}</button></div>{footer}</form>;
}

function Summary({ label, value }: { label: string; value: string }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function errorMessage(caught: unknown, fallback: string): string { return caught instanceof Error ? caught.message : fallback; }
