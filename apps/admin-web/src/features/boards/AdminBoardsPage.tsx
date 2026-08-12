import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  type AdminBoard,
  copyAdminBoard,
  createAdminBoard,
  deleteAdminBoard,
  deleteAdminNewPosts,
  getAdminBoard,
  listAdminBoards,
  updateAdminBoard,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";
import {
  boardToDraft,
  buildAdminBoardCopy,
  buildAdminBoardCreate,
  buildAdminBoardUpdate,
  emptyAdminBoardDraft,
  parseNewPostIds,
  validateAdminBoardDraft,
  type AdminBoardDraft,
} from "./adminBoardForm";

export function AdminBoardsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [boards, setBoards] = useState<AdminBoard[]>([]);
  const [selected, setSelected] = useState<AdminBoard | null>(null);
  const [draft, setDraft] = useState<AdminBoardDraft>(emptyAdminBoardDraft);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTable, setCopyTable] = useState("");
  const [copySubject, setCopySubject] = useState("");
  const [copyPosts, setCopyPosts] = useState(false);
  const [newPostIds, setNewPostIds] = useState("");
  const [newPostsOpen, setNewPostsOpen] = useState(false);

  async function selectBoard(boTable: string) {
    const detail = await getAdminBoard(siteId, boTable);
    setSelected(detail);
    setDraft(boardToDraft(detail));
  }

  async function reloadBoards(preferredTable?: string) {
    const result = await listAdminBoards(siteId, {
      page,
      per_page: 20,
      search: submittedSearch || undefined,
      sort_by: "bo_table",
      sort_direction: "ASC",
    });
    setBoards(result.items);
    setLastPage(result.pagination.last_page ?? 1);
    const target = result.items.find((item) => item.bo_table === preferredTable)
      ?? result.items.find((item) => item.bo_table === selected?.bo_table)
      ?? result.items[0];
    if (target) await selectBoard(target.bo_table);
    else newBoard();
  }

  useEffect(() => {
    let active = true;
    void listAdminBoards(siteId, {
      page,
      per_page: 20,
      search: submittedSearch || undefined,
      sort_by: "bo_table",
      sort_direction: "ASC",
    }).then(async (result) => {
      if (!active) return;
      setBoards(result.items);
      setLastPage(result.pagination.last_page ?? 1);
      const first = result.items[0];
      if (first) {
        const detail = await getAdminBoard(siteId, first.bo_table);
        if (active) {
          setSelected(detail);
          setDraft(boardToDraft(detail));
        }
      } else {
        setSelected(null);
        setDraft(emptyAdminBoardDraft);
      }
    }).catch((caught) => active && setError(errorMessage(caught, "게시판을 읽지 못했습니다.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [page, siteId, submittedSearch]);

  function newBoard() {
    setSelected(null);
    setDraft(emptyAdminBoardDraft);
  }

  async function saveBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAdminBoardDraft(draft);
    if (errors.length) return setError(errors.join(" "));
    const update = selected ? buildAdminBoardUpdate(selected, draft) : null;
    if (update && Object.keys(update).length === 0) {
      return setError("변경된 항목이 없습니다.");
    }
    await runMutation(async () => {
      const saved = selected
        ? await updateAdminBoard(
          siteId,
          selected.bo_table,
          update!,
          session.csrf_token,
        )
        : await createAdminBoard(siteId, buildAdminBoardCreate(draft), session.csrf_token);
      const readback = await getAdminBoard(siteId, saved.bo_table);
      await reloadBoards(readback.bo_table);
      setMessage("게시판을 저장하고 상세를 재조회했습니다.");
    });
  }

  async function copyBoard() {
    if (!selected) return;
    const copy = buildAdminBoardCopy(copyTable, copySubject, copyPosts);
    if (!copy) return setError("복제 게시판 ID는 영문·숫자·밑줄 1~20자여야 합니다.");
    await runMutation(async () => {
      const copied = await copyAdminBoard(
        siteId, selected.bo_table, copy, session.csrf_token,
      );
      setCopyOpen(false);
      setCopyTable("");
      setCopySubject("");
      setCopyPosts(false);
      await reloadBoards(copied.bo_table);
      setMessage("게시판을 복제하고 상세를 재조회했습니다.");
    });
  }

  async function removeBoard() {
    if (!selected) return;
    await runMutation(async () => {
      await deleteAdminBoard(siteId, selected.bo_table, session.csrf_token);
      setDeleteOpen(false);
      await reloadBoards();
      setMessage("게시판을 삭제하고 목록을 재조회했습니다.");
    });
  }

  async function removeNewPosts() {
    const ids = parseNewPostIds(newPostIds);
    if (!ids) return setError("최근글 ID를 중복 없이 쉼표 또는 공백으로 입력하십시오.");
    await runMutation(async () => {
      const result = await deleteAdminNewPosts(siteId, ids, session.csrf_token);
      setNewPostsOpen(false);
      setNewPostIds("");
      setMessage(`최근글 ${result.deleted_count}건을 정리했습니다.`);
    });
  }

  async function runMutation(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try { await action(); }
    catch (caught) { setError(errorMessage(caught, "게시판 작업을 완료하지 못했습니다.")); }
    finally { setBusy(false); }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 게시판 관리 경로입니다.</p>;

  return (
    <section className="page boards-page" aria-labelledby="boards-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Boards</span>
          <h2 id="boards-title">게시판 관리</h2>
          <p>목록·상세·생성·수정·복제·삭제 결과를 같은 사이트 범위에서 재조회합니다.</p>
        </div>
        <div className="action-row">
          <button type="button" disabled={busy} onClick={newBoard}>새 게시판</button>
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
            <input aria-label="게시판 검색" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="게시판 ID 또는 제목" />
            <button type="submit" disabled={busy}>검색</button>
          </form>
          {loading ? <p className="audit-loading">게시판을 불러오는 중입니다.</p> : (
            <AdminDataTable
              columns={[
                { header: "게시판", render: (board: AdminBoard) => <><strong>{board.bo_table}</strong><small>{board.bo_subject || "제목 없음"}</small></> },
                { header: "그룹", render: (board: AdminBoard) => board.gr_id || "—" },
                { header: "글/댓글", render: (board: AdminBoard) => `${board.bo_count_write ?? 0} / ${board.bo_count_comment ?? 0}` },
              ]}
              emptyMessage="조회된 게시판이 없습니다."
              getRowKey={(board: AdminBoard) => board.bo_table}
              onRowClick={(board: AdminBoard) => void selectBoard(board.bo_table).catch((caught) => setError(errorMessage(caught, "게시판 상세를 읽지 못했습니다.")))}
              rows={boards}
              selectedKey={selected?.bo_table}
            />
          )}
          <div className="member-pagination">
            <span>{page} / {lastPage}</span>
            <button type="button" disabled={busy || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button>
            <button type="button" disabled={busy || page >= lastPage} onClick={() => setPage((value) => value + 1)}>다음</button>
          </div>

          <div className="settings-card stacked-form">
            <h3>최근글 정리</h3>
            <p>그누보드 새글 테이블의 ID만 명시적으로 삭제합니다.</p>
            <input aria-label="최근글 ID" value={newPostIds} onChange={(event) => setNewPostIds(event.currentTarget.value)} placeholder="101, 102" />
            <button className="danger-action" type="button" disabled={busy} onClick={() => parseNewPostIds(newPostIds) ? setNewPostsOpen(true) : setError("최근글 ID를 중복 없이 입력하십시오.")}>삭제 확인</button>
          </div>
        </div>

        <form className="member-editor" onSubmit={saveBoard}>
          <header><span className="eyebrow">Board detail</span><h3>{selected?.bo_table ?? "새 게시판"}</h3><p>게시판 ID는 생성 후 변경할 수 없습니다.</p></header>
          <fieldset disabled={busy}>
            <legend>기본 정보</legend>
            <label>게시판 ID<input aria-label="게시판 ID" value={draft.bo_table} readOnly={Boolean(selected)} onChange={(event) => setDraft({ ...draft, bo_table: event.currentTarget.value })} /></label>
            <label>게시판 제목<input aria-label="게시판 제목" value={draft.bo_subject} onChange={(event) => setDraft({ ...draft, bo_subject: event.currentTarget.value })} /></label>
            <label>그룹 ID<input aria-label="게시판 그룹 ID" value={draft.gr_id} onChange={(event) => setDraft({ ...draft, gr_id: event.currentTarget.value })} /></label>
            <label className="checkbox-row"><input aria-label="분류 사용" type="checkbox" checked={draft.bo_use_category} onChange={(event) => setDraft({ ...draft, bo_use_category: event.currentTarget.checked })} />분류 사용</label>
            <label>분류 목록<input aria-label="분류 목록" value={draft.bo_category_list} onChange={(event) => setDraft({ ...draft, bo_category_list: event.currentTarget.value })} placeholder="공지|일반" /></label>
            <div className="form-grid-two">
              <NumberField label="읽기 레벨" value={draft.bo_read_level} onChange={(value) => setDraft({ ...draft, bo_read_level: value })} />
              <NumberField label="쓰기 레벨" value={draft.bo_write_level} onChange={(value) => setDraft({ ...draft, bo_write_level: value })} />
              <NumberField label="댓글 레벨" value={draft.bo_comment_level} onChange={(value) => setDraft({ ...draft, bo_comment_level: value })} />
              <NumberField label="다운로드 레벨" value={draft.bo_download_level} onChange={(value) => setDraft({ ...draft, bo_download_level: value })} />
              <NumberField label="업로드 개수" value={draft.bo_upload_count} onChange={(value) => setDraft({ ...draft, bo_upload_count: value })} />
              <NumberField label="업로드 크기" value={draft.bo_upload_size} onChange={(value) => setDraft({ ...draft, bo_upload_size: value })} />
            </div>
            <label>비밀글 정책<select aria-label="비밀글 정책" value={draft.bo_use_secret} onChange={(event) => setDraft({ ...draft, bo_use_secret: event.currentTarget.value })}><option value="0">사용 안 함</option><option value="1">체크박스</option><option value="2">강제</option></select></label>
          </fieldset>
          <div className="action-row">
            <button className="primary-action" type="submit" disabled={busy}>저장·재조회</button>
            {selected ? <button type="button" disabled={busy} onClick={() => setCopyOpen(true)}>게시판 복제</button> : null}
            {selected ? <button className="danger-action" type="button" disabled={busy} onClick={() => setDeleteOpen(true)}>게시판 삭제</button> : null}
          </div>
        </form>
      </div>

      {copyOpen ? <div className="dialog-backdrop"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="copy-title"><h3 id="copy-title">게시판 복제</h3><label>대상 게시판 ID<input aria-label="복제 게시판 ID" value={copyTable} onChange={(event) => setCopyTable(event.currentTarget.value)} /></label><label>대상 제목<input aria-label="복제 게시판 제목" value={copySubject} onChange={(event) => setCopySubject(event.currentTarget.value)} /></label><label className="checkbox-row"><input aria-label="게시글 함께 복제" type="checkbox" checked={copyPosts} onChange={(event) => setCopyPosts(event.currentTarget.checked)} />게시글·첨부파일도 함께 복제</label><div className="action-row"><button type="button" onClick={() => setCopyOpen(false)}>취소</button><button className="primary-action" type="button" disabled={busy} onClick={() => void copyBoard()}>복제·재조회</button></div></div></div> : null}
      <ConfirmActionDialog busy={busy} open={deleteOpen} title="게시판을 삭제하시겠습니까?" description={`${selected?.bo_table ?? "선택 게시판"}의 게시글 테이블까지 삭제될 수 있습니다.`} onCancel={() => setDeleteOpen(false)} onConfirm={() => void removeBoard()} />
      <ConfirmActionDialog busy={busy} open={newPostsOpen} title="선택한 최근글 항목을 삭제하시겠습니까?" description="입력한 새글 ID만 공급자에서 삭제하고 결과 건수를 확인합니다." onCancel={() => setNewPostsOpen(false)} onConfirm={() => void removeNewPosts()} />
    </section>
  );
}

function NumberField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return <label>{props.label}<input aria-label={props.label} inputMode="numeric" value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} /></label>;
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
