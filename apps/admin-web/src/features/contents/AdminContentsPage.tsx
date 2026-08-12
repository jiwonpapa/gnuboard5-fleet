import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  type AdminContent,
  createAdminContent,
  deleteAdminContent,
  getAdminContent,
  listAdminContents,
  updateAdminContent,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminContentCreate,
  buildAdminContentUpdate,
  contentToDraft,
  emptyAdminContentDraft,
  validateAdminContentDraft,
  type AdminContentDraft,
} from "./adminContentForm";

export function AdminContentsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [contents, setContents] = useState<AdminContent[]>([]);
  const [selected, setSelected] = useState<AdminContent | null>(null);
  const [draft, setDraft] = useState<AdminContentDraft>(emptyAdminContentDraft);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function selectContent(coId: string) {
    const detail = await getAdminContent(siteId, coId);
    setSelected(detail);
    setDraft(contentToDraft(detail));
  }

  async function reloadContents(preferredId?: string) {
    const result = await listAdminContents(siteId, {
      page,
      per_page: 20,
      search: submittedSearch || undefined,
    });
    setContents(result.items);
    setLastPage(result.pagination.last_page ?? 1);
    const target = result.items.find((item) => item.co_id === preferredId)
      ?? result.items.find((item) => item.co_id === selected?.co_id)
      ?? result.items[0];
    if (target) await selectContent(target.co_id);
    else newContent();
  }

  useEffect(() => {
    let active = true;
    void listAdminContents(siteId, {
      page,
      per_page: 20,
      search: submittedSearch || undefined,
    }).then(async (result) => {
      if (!active) return;
      setContents(result.items);
      setLastPage(result.pagination.last_page ?? 1);
      const first = result.items[0];
      if (first) {
        const detail = await getAdminContent(siteId, first.co_id);
        if (active) {
          setSelected(detail);
          setDraft(contentToDraft(detail));
        }
      } else {
        setSelected(null);
        setDraft(emptyAdminContentDraft);
      }
    }).catch((caught) => active && setError(errorMessage(caught, "내용 항목을 읽지 못했습니다.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [page, siteId, submittedSearch]);

  function newContent() {
    setSelected(null);
    setDraft(emptyAdminContentDraft);
    setError("");
    setMessage("");
  }

  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAdminContentDraft(draft);
    if (errors.length) return setError(errors.join(" "));
    const update = selected ? buildAdminContentUpdate(selected, draft) : null;
    if (update && Object.keys(update).length === 0) return setError("변경된 항목이 없습니다.");
    await runMutation(async () => {
      const saved = selected
        ? await updateAdminContent(siteId, selected.co_id, update!, session.csrf_token)
        : await createAdminContent(siteId, buildAdminContentCreate(draft), session.csrf_token);
      const readback = await getAdminContent(siteId, saved.co_id);
      await reloadContents(readback.co_id);
      setMessage("내용을 저장하고 상세를 재조회했습니다.");
    });
  }

  async function removeContent() {
    if (!selected) return;
    await runMutation(async () => {
      await deleteAdminContent(siteId, selected.co_id, session.csrf_token);
      setDeleteOpen(false);
      setSelected(null);
      await reloadContents();
      setMessage("내용을 삭제하고 목록을 재조회했습니다.");
    });
  }

  async function runMutation(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try { await action(); }
    catch (caught) { setError(errorMessage(caught, "내용 관리 작업을 완료하지 못했습니다.")); }
    finally { setBusy(false); }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 내용 관리 경로입니다.</p>;

  return (
    <section className="page contents-page" aria-labelledby="contents-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Contents</span>
          <h2 id="contents-title">내용 관리</h2>
          <p>정적 내용의 목록·본문·모바일·HTML 모드를 같은 사이트 범위에서 재조회합니다.</p>
        </div>
        <div className="action-row">
          <button type="button" disabled={busy} onClick={newContent}>새 내용</button>
          <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
        </div>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      <div className="member-workspace">
        <div className="member-list-panel">
          <form className="member-search" onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSubmittedSearch(search.trim());
          }}>
            <input aria-label="내용 검색" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="내용 ID 또는 제목" />
            <button type="submit" disabled={busy}>검색</button>
          </form>
          {loading ? <p className="audit-loading">내용 목록을 불러오는 중입니다.</p> : (
            <AdminDataTable
              columns={[
                { header: "내용", render: (item: AdminContent) => <><strong>{item.co_id}</strong><small>{item.co_subject}</small></> },
                { header: "HTML", render: (item: AdminContent) => htmlModeLabel(item.co_html) },
                { header: "모바일", render: (item: AdminContent) => item.co_mobile_content.trim() ? "별도 본문" : "공통 본문" },
              ]}
              emptyMessage="조회된 내용 항목이 없습니다."
              getRowKey={(item: AdminContent) => item.co_id}
              onRowClick={(item: AdminContent) => void selectContent(item.co_id).catch((caught) => setError(errorMessage(caught, "내용 상세를 읽지 못했습니다.")))}
              rows={contents}
              selectedKey={selected?.co_id}
            />
          )}
          <div className="member-pagination">
            <span>{page} / {lastPage}</span>
            <button type="button" disabled={busy || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button>
            <button type="button" disabled={busy || page >= lastPage} onClick={() => setPage((value) => value + 1)}>다음</button>
          </div>
        </div>

        <form className="member-editor" onSubmit={saveContent}>
          <header><span className="eyebrow">Content detail</span><h3>{selected?.co_id ?? "새 내용"}</h3><p>내용 ID는 생성 후 변경할 수 없습니다.</p></header>
          <fieldset disabled={busy}>
            <legend>기본 정보</legend>
            <label>내용 ID<input aria-label="내용 ID" value={draft.co_id} readOnly={Boolean(selected)} onChange={(event) => setDraft({ ...draft, co_id: event.currentTarget.value })} /></label>
            <label>제목<input aria-label="내용 제목" value={draft.co_subject} onChange={(event) => setDraft({ ...draft, co_subject: event.currentTarget.value })} /></label>
            <label>HTML 모드<select aria-label="HTML 모드" value={draft.co_html} onChange={(event) => setDraft({ ...draft, co_html: event.currentTarget.value as AdminContentDraft["co_html"] })}><option value="0">사용 안 함</option><option value="1">HTML</option><option value="2">HTML + 줄바꿈</option></select></label>
            <label>공통 본문<textarea aria-label="공통 본문" rows={10} value={draft.co_content} onChange={(event) => setDraft({ ...draft, co_content: event.currentTarget.value })} /></label>
            <label>모바일 본문<textarea aria-label="모바일 본문" rows={7} value={draft.co_mobile_content} onChange={(event) => setDraft({ ...draft, co_mobile_content: event.currentTarget.value })} placeholder="비우면 공통 본문을 사용합니다." /></label>
            <div className="form-grid-two">
              <TextField label="상단 파일 경로" value={draft.co_include_head} onChange={(value) => setDraft({ ...draft, co_include_head: value })} />
              <TextField label="하단 파일 경로" value={draft.co_include_tail} onChange={(value) => setDraft({ ...draft, co_include_tail: value })} />
              <TextField label="PC 스킨" value={draft.co_skin} onChange={(value) => setDraft({ ...draft, co_skin: value })} />
              <TextField label="모바일 스킨" value={draft.co_mobile_skin} onChange={(value) => setDraft({ ...draft, co_mobile_skin: value })} />
            </div>
            <label className="checkbox-row"><input aria-label="태그 필터 사용" type="checkbox" checked={draft.co_tag_filter_use} onChange={(event) => setDraft({ ...draft, co_tag_filter_use: event.currentTarget.checked })} />태그 필터 사용</label>
          </fieldset>
          <div className="action-row">
            <button className="primary-action" type="submit" disabled={busy}>저장·재조회</button>
            <button type="button" disabled={busy} onClick={newContent}>새 항목</button>
            {selected ? <button className="danger-action" type="button" disabled={busy} onClick={() => setDeleteOpen(true)}>내용 삭제</button> : null}
          </div>
        </form>
      </div>

      <ConfirmActionDialog busy={busy} open={deleteOpen} title="내용 항목을 삭제하시겠습니까?" description={`${selected?.co_id ?? "선택 항목"}의 본문과 모바일 본문이 삭제됩니다.`} onCancel={() => setDeleteOpen(false)} onConfirm={() => void removeContent()} />
    </section>
  );
}

function TextField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return <label>{props.label}<input aria-label={props.label} value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} /></label>;
}

function htmlModeLabel(mode: number) {
  return mode === 2 ? "HTML + 줄바꿈" : mode === 1 ? "HTML" : "사용 안 함";
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
