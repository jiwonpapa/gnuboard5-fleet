import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  createAdminSystemPoll,
  deleteAdminSystemPoll,
  getAdminSystemPoll,
  listAdminSystemPolls,
  updateAdminSystemPoll,
  type AdminPoll,
  type AdminPollList,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminPollCreate,
  buildAdminPollUpdate,
  emptyAdminPollForm,
  pollDraft,
  type AdminPollFormDraft,
} from "./adminPollForm";

const choiceFields = [
  "po_poll1", "po_poll2", "po_poll3", "po_poll4", "po_poll5",
  "po_poll6", "po_poll7", "po_poll8", "po_poll9",
] as const;

export function AdminPollsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [list, setList] = useState<AdminPollList | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminPoll | null>(null);
  const [page, setPage] = useState(1);
  const [createDraft, setCreateDraft] = useState<AdminPollFormDraft>(emptyAdminPollForm);
  const [editDraft, setEditDraft] = useState<AdminPollFormDraft>(emptyAdminPollForm);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void listAdminSystemPolls(siteId, { page, per_page: 20 })
      .then((result) => {
        if (!active) return;
        setList(result);
        setSelectedId((current) =>
          current !== null && result.items.some((poll) => poll.po_id === current)
            ? current
            : result.items[0]?.po_id ?? null,
        );
      })
      .catch((caught) => active && setError(errorMessage(caught, "투표 목록을 읽지 못했습니다.")));
    return () => { active = false; };
  }, [page, siteId]);

  useEffect(() => {
    if (selectedId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- An empty async list must clear stale detail state.
      setSelected(null);
      return;
    }
    let active = true;
    void getAdminSystemPoll(siteId, selectedId)
      .then((poll) => {
        if (!active) return;
        setSelected(poll);
        setEditDraft(pollDraft(poll));
      })
      .catch((caught) => active && setError(errorMessage(caught, "투표 상세를 읽지 못했습니다.")));
    return () => { active = false; };
  }, [selectedId, siteId]);

  async function refresh(preferredId?: number) {
    const result = await listAdminSystemPolls(siteId, { page, per_page: 20 });
    setList(result);
    const nextId = preferredId ?? selectedId;
    const resolvedId = nextId !== null && result.items.some((item) => item.po_id === nextId)
      ? nextId
      : result.items[0]?.po_id ?? null;
    setSelectedId(resolvedId);
    if (resolvedId !== null) {
      const poll = await getAdminSystemPoll(siteId, resolvedId);
      setSelected(poll);
      setEditDraft(pollDraft(poll));
    } else {
      setSelected(null);
    }
  }

  async function createPoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = buildAdminPollCreate(createDraft);
    if (!input) {
      setError("투표 제목, 항목 1·2와 0 이상의 정수 설정값을 확인하십시오.");
      return;
    }
    await run(async () => {
      const poll = await createAdminSystemPoll(siteId, input, session.csrf_token);
      setCreateDraft(emptyAdminPollForm);
      await refresh(poll.po_id);
      setMessage("투표를 생성하고 목록·상세를 재조회했습니다.");
    });
  }

  async function updatePoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const input = buildAdminPollUpdate(editDraft);
    if (!input) {
      setError("투표 제목, 항목 1·2와 0 이상의 정수 설정값을 확인하십시오.");
      return;
    }
    await run(async () => {
      const poll = await updateAdminSystemPoll(
        siteId,
        selected.po_id,
        input,
        session.csrf_token,
      );
      await refresh(poll.po_id);
      setMessage("투표를 저장하고 목록·상세를 재조회했습니다.");
    });
  }

  async function deletePoll() {
    if (!selected) return;
    await run(async () => {
      await deleteAdminSystemPoll(siteId, selected.po_id, session.csrf_token);
      setDeleteOpen(false);
      setSelectedId(null);
      await refresh();
      setMessage("투표를 삭제하고 목록을 재조회했습니다.");
    });
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (caught) {
      setError(errorMessage(caught, "투표 작업에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 투표 관리 경로입니다.</p>;

  const pagination = list?.pagination;
  return (
    <section className="page polls-page" aria-labelledby="polls-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Polls</span>
          <h2 id="polls-title">투표 관리</h2>
          <p>기존 목록·상세·생성·수정·삭제 UX를 사이트별 typed HTTP와 반응형 작업대로 이관했습니다.</p>
        </div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      <div className="theme-summary-grid" aria-label="투표 상태 요약">
        <Summary label="전체 투표" value={`${pagination?.total ?? 0}건`} />
        <Summary label="선택 투표" value={selected ? `#${selected.po_id}` : "없음"} />
        <Summary label="현재 상태" value={selected?.po_use === 1 ? "사용" : "비사용"} />
      </div>

      <div className="member-workspace polls-workspace">
        <section className="member-list-panel" aria-labelledby="poll-list-title">
          <div className="workspace-panel-heading"><h3 id="poll-list-title">투표 목록</h3><span>{pagination?.total ?? 0}건</span></div>
          <AdminDataTable
            columns={[
              { header: "ID", render: (poll) => <strong>#{poll.po_id}</strong> },
              { header: "제목 / 등록일", render: (poll) => <><strong>{poll.po_subject}</strong><small>{poll.po_date || "-"}</small></> },
              { header: "상태", render: (poll) => <span>{poll.po_use === 1 ? "사용" : "비사용"}</span> },
            ]}
            emptyMessage="조회된 투표가 없습니다."
            getRowKey={(poll) => String(poll.po_id)}
            onRowClick={(poll) => setSelectedId(poll.po_id)}
            rows={list?.items ?? []}
            selectedKey={selectedId === null ? null : String(selectedId)}
          />
          <div className="action-row poll-pagination">
            <button type="button" disabled={busy || !pagination?.has_prev} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button>
            <span>{pagination?.page ?? page} / {pagination?.last_page ?? 1}</span>
            <button type="button" disabled={busy || !pagination?.has_next} onClick={() => setPage((value) => value + 1)}>다음</button>
          </div>
        </section>

        <div className="theme-editor-stack">
          <PollEditor
            title="투표 생성"
            draft={createDraft}
            disabled={busy || !session.step_up_active}
            submitLabel="투표 생성·재조회"
            onChange={setCreateDraft}
            onSubmit={createPoll}
          />
          {selected ? (
            <PollEditor
              title={`선택 투표 #${selected.po_id}`}
              draft={editDraft}
              disabled={busy || !session.step_up_active}
              submitLabel="투표 저장·재조회"
              onChange={setEditDraft}
              onSubmit={updatePoll}
              footer={<div className="action-row"><button type="button" disabled={busy} onClick={() => setEditDraft(pollDraft(selected))}>서버 값으로 되돌리기</button><button className="danger-action" type="button" disabled={busy || !session.step_up_active} onClick={() => setDeleteOpen(true)}>투표 삭제</button></div>}
            />
          ) : <section className="member-editor"><h3>선택 투표 편집</h3><p>목록에서 투표를 선택하십시오.</p></section>}
          {!session.step_up_active ? <p className="admin-step-up-note">투표 변경은 보안 설정에서 최근 본인 확인 후 가능합니다.</p> : null}
        </div>
      </div>

      {deleteOpen && selected ? <div className="dialog-backdrop"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="poll-delete-title"><h3 id="poll-delete-title">투표 삭제</h3><p>#{selected.po_id} {selected.po_subject} 투표를 삭제합니다.</p><div className="action-row"><button type="button" disabled={busy} onClick={() => setDeleteOpen(false)}>취소</button><button className="danger-action" type="button" disabled={busy} onClick={() => void deletePoll()}>삭제·재조회</button></div></div></div> : null}
    </section>
  );
}

function PollEditor({ title, draft, disabled, submitLabel, onChange, onSubmit, footer }: {
  title: string;
  draft: AdminPollFormDraft;
  disabled: boolean;
  submitLabel: string;
  onChange: (draft: AdminPollFormDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  footer?: React.ReactNode;
}) {
  return (
    <form className="member-editor poll-editor" onSubmit={onSubmit}>
      <header><span className="eyebrow">Poll workspace</span><h3>{title}</h3><p>제목과 항목 1·2는 필수이며 최대 9개 항목을 관리합니다.</p></header>
      <fieldset disabled={disabled}>
        <legend>{title} 입력</legend>
        <label>투표 제목<input value={draft.po_subject} onChange={(event) => onChange({ ...draft, po_subject: event.currentTarget.value })} /></label>
        <div className="poll-choice-grid">
          {choiceFields.map((field, index) => <label key={field}>항목 {index + 1}<input value={draft[field]} onChange={(event) => onChange({ ...draft, [field]: event.currentTarget.value })} /></label>)}
        </div>
        <label>기타의견<input value={draft.po_etc} maxLength={125} onChange={(event) => onChange({ ...draft, po_etc: event.currentTarget.value })} /></label>
        <div className="poll-number-grid">
          <label>참여 레벨<input type="number" min="0" step="1" value={draft.po_level} onChange={(event) => onChange({ ...draft, po_level: event.currentTarget.value })} /></label>
          <label>포인트<input type="number" min="0" step="1" value={draft.po_point} onChange={(event) => onChange({ ...draft, po_point: event.currentTarget.value })} /></label>
          <label className="poll-toggle"><input type="checkbox" checked={draft.po_use} onChange={(event) => onChange({ ...draft, po_use: event.currentTarget.checked })} />사용</label>
        </div>
      </fieldset>
      <div className="action-row"><button className="primary-action" type="submit" disabled={disabled}>{submitLabel}</button></div>
      {footer}
    </form>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
