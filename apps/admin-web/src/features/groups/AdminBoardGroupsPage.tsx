import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  addAdminBoardGroupMember,
  createAdminBoardGroup,
  deleteAdminBoardGroup,
  deleteAdminBoardGroupMember,
  getAdminBoardGroup,
  listAdminBoardGroupMembers,
  listAdminBoardGroups,
  updateAdminBoardGroup,
  type AdminBoardGroup,
  type AdminBoardGroupMember,
  type AdminBoardGroupMemberList,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminBoardGroupCreate,
  buildAdminBoardGroupUpdate,
  emptyAdminBoardGroupDraft,
  groupToDraft,
  validateAdminBoardGroupDraft,
  type AdminBoardGroupDraft,
} from "./adminBoardGroupForm";

const emptyMembers: AdminBoardGroupMemberList = {
  items: [],
  pagination: {
    mode: null,
    total: 0,
    page: 1,
    per_page: 20,
    last_page: 1,
    cursor: null,
    next_cursor: null,
    has_next: false,
    has_prev: false,
  },
};

export function AdminBoardGroupsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [groups, setGroups] = useState<AdminBoardGroup[]>([]);
  const [selected, setSelected] = useState<AdminBoardGroup | null>(null);
  const [draft, setDraft] = useState<AdminBoardGroupDraft>(emptyAdminBoardGroupDraft);
  const [members, setMembers] = useState(emptyMembers);
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<AdminBoardGroupMember | null>(null);
  const selectedGroupId = selected?.gr_id ?? null;

  async function selectGroup(grId: string) {
    const detail = await getAdminBoardGroup(siteId, grId);
    setSelected(detail);
    setDraft(groupToDraft(detail));
    setMemberPage(1);
    setMemberSearch("");
    setMembers(await listAdminBoardGroupMembers(siteId, grId, { page: 1, per_page: 20 }));
  }

  async function reloadGroups(preferredId?: string) {
    const list = await listAdminBoardGroups(siteId);
    setGroups(list.items);
    const target = list.items.find((group) => group.gr_id === preferredId) ?? list.items[0];
    if (target) await selectGroup(target.gr_id);
    else newGroup();
  }

  useEffect(() => {
    let active = true;
    void listAdminBoardGroups(siteId)
      .then(async (list) => {
        if (!active) return;
        setGroups(list.items);
        const first = list.items[0];
        if (first) {
          const [detail, memberList] = await Promise.all([
            getAdminBoardGroup(siteId, first.gr_id),
            listAdminBoardGroupMembers(siteId, first.gr_id, { page: 1, per_page: 20 }),
          ]);
          if (active) {
            setSelected(detail);
            setDraft(groupToDraft(detail));
            setMembers(memberList);
          }
        }
      })
      .catch((caught) => active && setError(errorMessage(caught, "게시판 그룹을 읽지 못했습니다.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [siteId]);

  useEffect(() => {
    if (!selectedGroupId) return;
    let active = true;
    void listAdminBoardGroupMembers(siteId, selectedGroupId, {
      page: memberPage,
      per_page: 20,
      search: memberSearch || undefined,
    }).then((value) => active && setMembers(value))
      .catch((caught) => active && setError(errorMessage(caught, "그룹 회원을 읽지 못했습니다.")));
    return () => { active = false; };
  }, [memberPage, memberSearch, selectedGroupId, siteId]);

  function newGroup() {
    setSelected(null);
    setDraft(emptyAdminBoardGroupDraft);
    setMembers(emptyMembers);
    setMemberPage(1);
    setMemberSearch("");
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAdminBoardGroupDraft(draft);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    await runMutation(async () => {
      const saved = selected
        ? await updateAdminBoardGroup(
          siteId,
          selected.gr_id,
          buildAdminBoardGroupUpdate(draft),
          session.csrf_token,
        )
        : await createAdminBoardGroup(
          siteId,
          buildAdminBoardGroupCreate(draft),
          session.csrf_token,
        );
      const readback = await getAdminBoardGroup(siteId, saved.gr_id);
      await reloadGroups(readback.gr_id);
      setMessage("게시판 그룹을 저장하고 재조회했습니다.");
    });
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const mbId = String(data.get("mb_id") ?? "").trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(mbId)) {
      setError("회원 ID는 영문·숫자·밑줄 3~20자여야 합니다.");
      return;
    }
    await runMutation(async () => {
      await addAdminBoardGroupMember(siteId, selected.gr_id, mbId, session.csrf_token);
      setMembers(await listAdminBoardGroupMembers(siteId, selected.gr_id, {
        page: memberPage, per_page: 20, search: memberSearch || undefined,
      }));
      setMessage("그룹 회원을 추가하고 재조회했습니다.");
      event.currentTarget.reset();
    });
  }

  async function removeMember() {
    if (!selected || !deleteMemberTarget) return;
    await runMutation(async () => {
      await deleteAdminBoardGroupMember(
        siteId, selected.gr_id, deleteMemberTarget.mb_id, session.csrf_token,
      );
      setDeleteMemberTarget(null);
      setMembers(await listAdminBoardGroupMembers(siteId, selected.gr_id, {
        page: memberPage, per_page: 20, search: memberSearch || undefined,
      }));
      setMessage("그룹 회원을 제거하고 재조회했습니다.");
    });
  }

  async function removeGroup() {
    if (!selected) return;
    await runMutation(async () => {
      await deleteAdminBoardGroup(siteId, selected.gr_id, session.csrf_token);
      setDeleteGroupOpen(false);
      await reloadGroups();
      setMessage("게시판 그룹을 삭제하고 목록을 재조회했습니다.");
    });
  }

  async function runMutation(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try { await action(); }
    catch (caught) { setError(errorMessage(caught, "그룹 작업을 완료하지 못했습니다.")); }
    finally { setBusy(false); }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 그룹 관리 경로입니다.</p>;

  return (
    <section className="page groups-page" aria-labelledby="groups-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Board groups</span>
          <h2 id="groups-title">게시판 그룹 관리</h2>
          <p>그룹과 접근 회원을 같은 사이트 범위에서 조회·편집하고 변경 결과를 재조회합니다.</p>
        </div>
        <div className="action-row">
          <button type="button" disabled={busy} onClick={newGroup}>새 그룹</button>
          <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
        </div>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      <div className="member-workspace">
        <div className="member-list-panel">
          {loading ? <p className="audit-loading">게시판 그룹을 불러오는 중입니다.</p> : (
            <AdminDataTable
              columns={[
                { header: "그룹", render: (group: AdminBoardGroup) => <><strong>{group.gr_id}</strong><small>{group.gr_subject}</small></> },
                { header: "관리자", render: (group: AdminBoardGroup) => group.gr_admin || "—" },
                { header: "접근", render: (group: AdminBoardGroup) => group.gr_use_access ? "회원 제한" : "공개" },
              ]}
              emptyMessage="등록된 게시판 그룹이 없습니다."
              getRowKey={(group: AdminBoardGroup) => group.gr_id}
              onRowClick={(group: AdminBoardGroup) => void selectGroup(group.gr_id).catch((caught) => setError(errorMessage(caught, "그룹 상세를 읽지 못했습니다.")))}
              rows={groups}
              selectedKey={selected?.gr_id}
            />
          )}

          {selected ? (
            <div className="settings-card stacked-form group-members-panel">
              <h3>그룹 회원</h3>
              <form className="member-search" onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setMemberPage(1);
                setMemberSearch(String(data.get("search") ?? "").trim());
              }}>
                <input name="search" defaultValue={memberSearch} placeholder="회원 검색" aria-label="그룹 회원 검색" />
                <button type="submit" disabled={busy}>검색</button>
              </form>
              <form className="member-search" onSubmit={addMember}>
                <input name="mb_id" placeholder="추가할 회원 ID" aria-label="추가할 회원 ID" />
                <button type="submit" disabled={busy}>회원 추가</button>
              </form>
              <AdminDataTable
                columns={[
                  { header: "회원", render: (member: AdminBoardGroupMember) => <><strong>{member.mb_id}</strong><small>{member.mb_name || member.mb_nick || "—"}</small></> },
                  { header: "레벨", render: (member: AdminBoardGroupMember) => member.mb_level ?? "—" },
                  { header: "등록일", render: (member: AdminBoardGroupMember) => member.gm_datetime },
                  { header: "관리", render: (member: AdminBoardGroupMember) => <button type="button" onClick={() => setDeleteMemberTarget(member)}>제거</button> },
                ]}
                emptyMessage="등록된 그룹 회원이 없습니다."
                getRowKey={(member: AdminBoardGroupMember) => `${member.gr_id}:${member.mb_id}`}
                rows={members.items}
              />
              <div className="member-pagination">
                <span>{members.pagination.page ?? memberPage} / {members.pagination.last_page ?? 1}</span>
                <button type="button" disabled={busy || memberPage <= 1} onClick={() => setMemberPage((value) => Math.max(1, value - 1))}>이전</button>
                <button type="button" disabled={busy || !members.pagination.has_next} onClick={() => setMemberPage((value) => value + 1)}>다음</button>
              </div>
            </div>
          ) : null}
        </div>

        <form className="member-editor" onSubmit={saveGroup}>
          <header><span className="eyebrow">Group detail</span><h3>{selected?.gr_id ?? "새 그룹"}</h3><p>그룹 ID는 생성 후 변경할 수 없습니다.</p></header>
          <fieldset disabled={busy}>
            <legend>기본 정보</legend>
            <label>그룹 ID<input aria-label="그룹 ID" value={draft.gr_id} readOnly={Boolean(selected)} onChange={(event) => setDraft({ ...draft, gr_id: event.currentTarget.value })} /></label>
            <label>그룹 제목<input aria-label="그룹 제목" value={draft.gr_subject} onChange={(event) => setDraft({ ...draft, gr_subject: event.currentTarget.value })} /></label>
            <label>그룹 관리자<input aria-label="그룹 관리자" value={draft.gr_admin} onChange={(event) => setDraft({ ...draft, gr_admin: event.currentTarget.value })} /></label>
            <label>접속 기기<select aria-label="접속 기기" value={draft.gr_device} onChange={(event) => setDraft({ ...draft, gr_device: event.currentTarget.value as AdminBoardGroupDraft["gr_device"] })}><option value="both">PC/모바일</option><option value="pc">PC</option><option value="mobile">모바일</option></select></label>
            <label className="checkbox-row"><input aria-label="접근 회원 제한" type="checkbox" checked={draft.gr_use_access} onChange={(event) => setDraft({ ...draft, gr_use_access: event.currentTarget.checked })} />그룹 회원만 접근</label>
          </fieldset>
          <div className="action-row">
            <button className="primary-action" type="submit" disabled={busy}>저장·재조회</button>
            {selected ? <button className="danger-action" type="button" disabled={busy} onClick={() => setDeleteGroupOpen(true)}>그룹 삭제</button> : null}
          </div>
        </form>
      </div>

      <ConfirmActionDialog busy={busy} open={deleteGroupOpen} title="게시판 그룹을 삭제하시겠습니까?" description="그룹에 게시판이 연결되어 있으면 공급자가 삭제를 거부합니다." onCancel={() => setDeleteGroupOpen(false)} onConfirm={() => void removeGroup()} />
      <ConfirmActionDialog busy={busy} open={Boolean(deleteMemberTarget)} title="그룹 회원을 제거하시겠습니까?" description={`${deleteMemberTarget?.mb_id ?? "선택 회원"}의 그룹 접근 권한을 제거합니다.`} onCancel={() => setDeleteMemberTarget(null)} onConfirm={() => void removeMember()} />
    </section>
  );
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
