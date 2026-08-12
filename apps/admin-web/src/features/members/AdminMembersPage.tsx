import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  deleteAdminMember,
  deleteAdminMemberMedia,
  getAdminMember,
  getMyProfile,
  listAdminMembers,
  updateAdminMember,
  updateAdminMemberLevel,
  uploadAdminMemberMedia,
  type AdminMember,
  type AdminMemberList,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminMemberUpdate,
  fileToMemberUpload,
  memberToDraft,
  validateAdminMemberDraft,
  type AdminMemberDraft,
} from "./adminMemberForm";

const emptyList: AdminMemberList = {
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

export function AdminMembersPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [list, setList] = useState(emptyList);
  const [currentMember, setCurrentMember] = useState<AdminMember | null>(null);
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const [draft, setDraft] = useState<AdminMemberDraft | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"all" | "mb_id" | "mb_name" | "mb_nick" | "mb_email">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function loadList(preferredId?: string) {
    const next = await listAdminMembers(siteId, {
      page,
      per_page: 20,
      search: search || undefined,
      search_field: searchField,
      sort_by: "mb_id",
      sort_direction: "ASC",
    });
    setList(next);
    const target = next.items.find((member) => member.mb_id === preferredId) ?? next.items[0] ?? null;
    if (target) await selectMember(target.mb_id);
    else {
      setSelected(null);
      setDraft(null);
    }
  }

  async function selectMember(mbId: string) {
    setError("");
    const detail = await getAdminMember(siteId, mbId);
    setSelected(detail);
    setDraft(memberToDraft(detail));
  }

  useEffect(() => {
    let active = true;
    void Promise.all([
      getMyProfile(siteId),
      listAdminMembers(siteId, {
        page,
        per_page: 20,
        search: search || undefined,
        search_field: searchField,
        sort_by: "mb_id",
        sort_direction: "ASC",
      }),
    ])
      .then(async ([profile, next]) => {
        if (!active) return;
        setCurrentMember({ ...profile });
        setList(next);
        const first = next.items[0];
        if (first) {
          const detail = await getAdminMember(siteId, first.mb_id);
          if (active) {
            setSelected(detail);
            setDraft(memberToDraft(detail));
          }
        } else {
          setSelected(null);
          setDraft(null);
        }
      })
      .catch((caught) => active && setError(errorMessage(caught, "회원 목록을 읽지 못했습니다.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, search, searchField, siteId]);

  const canMutate = Boolean(
    selected && currentMember &&
      (currentMember.mb_level ?? 0) >= (selected.mb_level ?? 0),
  );
  const canDelete = canMutate && selected?.mb_id !== currentMember?.mb_id && selected?.mb_level !== 10;
  const total = list.pagination.total ?? list.items.length;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft) return;
    const errors = validateAdminMemberDraft(draft);
    if (errors.length) {
      setError(errors.join(" "));
      return;
    }
    const update = buildAdminMemberUpdate(selected, draft);
    if (!update) {
      setMessage("변경된 회원 필드가 없습니다.");
      return;
    }
    await runMutation(async () => {
      await updateAdminMember(siteId, selected.mb_id, update, session.csrf_token);
      const readback = await getAdminMember(siteId, selected.mb_id);
      setSelected(readback);
      setDraft(memberToDraft(readback));
      setMessage("회원 정보를 저장하고 재조회했습니다.");
    });
  }

  async function saveLevel(level: number) {
    if (!selected || level < 1 || level > Math.min(10, currentMember?.mb_level ?? 1)) return;
    await runMutation(async () => {
      await updateAdminMemberLevel(siteId, selected.mb_id, level, session.csrf_token);
      const readback = await getAdminMember(siteId, selected.mb_id);
      setSelected(readback);
      setDraft(memberToDraft(readback));
      setMessage("회원 레벨을 저장하고 재조회했습니다.");
    });
  }

  async function uploadMedia(kind: "icon" | "image", file: File | null) {
    if (!selected || !file) return;
    await runMutation(async () => {
      const upload = await fileToMemberUpload(file);
      const result = await uploadAdminMemberMedia(
        siteId,
        selected.mb_id,
        kind,
        upload,
        session.csrf_token,
      );
      setMessage(`${kind === "icon" ? "아이콘" : "이미지"} 업로드 완료: ${result.relative_path}`);
    });
  }

  async function removeMedia(kind: "icon" | "image") {
    if (!selected) return;
    await runMutation(async () => {
      const result = await deleteAdminMemberMedia(
        siteId,
        selected.mb_id,
        kind,
        session.csrf_token,
      );
      setMessage(`${kind === "icon" ? "아이콘" : "이미지"} 삭제 ${result.deleted ? "완료" : "대상 없음"}`);
    });
  }

  async function removeMember() {
    if (!selected || !canDelete) return;
    await runMutation(async () => {
      await deleteAdminMember(siteId, selected.mb_id, session.csrf_token);
      setConfirmDelete(false);
      await loadList();
      setMessage("회원을 삭제하고 목록을 재조회했습니다.");
    });
  }

  async function runMutation(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught, "회원 작업을 완료하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 회원 관리 경로입니다.</p>;

  return (
    <section className="page members-page" aria-labelledby="members-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Members</span>
          <h2 id="members-title">회원 관리</h2>
          <p>기존 회원 목록과 상세 작업면을 명시적 사이트 범위의 서버 웹으로 이관했습니다.</p>
        </div>
        <div className="member-heading-actions">
          <Link to={`/sites/${encodeURIComponent(siteId)}/admin/members/export`}>회원 내보내기</Link>
          <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
        </div>
      </div>

      <div className="member-summary" aria-label="회원 요약">
        <Summary label="전체 회원" value={String(total)} />
        <Summary label="선택 회원" value={selected?.mb_id ?? "없음"} />
        <Summary label="관리자 레벨" value={String(currentMember?.mb_level ?? "—")} />
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      <div className="member-workspace">
        <div className="member-list-panel">
          <form
            className="member-search"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setPage(1);
              setSearch(String(data.get("search") ?? "").trim());
              setSearchField(String(data.get("search_field") ?? "all") as typeof searchField);
            }}
          >
            <select name="search_field" defaultValue={searchField} aria-label="회원 검색 필드">
              <option value="all">전체</option>
              <option value="mb_id">아이디</option>
              <option value="mb_name">이름</option>
              <option value="mb_nick">닉네임</option>
              <option value="mb_email">이메일</option>
            </select>
            <input name="search" defaultValue={search} placeholder="회원 검색" />
            <button type="submit" disabled={loading || busy}>검색</button>
          </form>
          {loading ? <p className="audit-loading">회원 목록을 불러오는 중입니다.</p> : (
            <AdminDataTable
              columns={[
                { header: "회원", render: (member) => <><strong>{member.mb_id}</strong><small>{member.mb_name || member.mb_nick || "—"}</small></> },
                { header: "레벨", render: (member) => member.mb_level ?? "—" },
                { header: "포인트", render: (member) => member.mb_point?.toLocaleString() ?? "0" },
                { header: "최근 로그인", render: (member) => member.mb_today_login || "—" },
              ]}
              emptyMessage="조회된 회원이 없습니다."
              getRowKey={(member) => member.mb_id}
              onRowClick={(member) => void selectMember(member.mb_id).catch((caught) => setError(errorMessage(caught, "회원 상세를 읽지 못했습니다.")))}
              rows={list.items}
              selectedKey={selected?.mb_id}
            />
          )}
          <div className="member-pagination">
            <span>{list.pagination.page ?? page} / {list.pagination.last_page ?? 1}</span>
            <button type="button" disabled={loading || busy || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</button>
            <button type="button" disabled={loading || busy || !list.pagination.has_next} onClick={() => setPage((value) => value + 1)}>다음</button>
          </div>
        </div>

        {selected && draft ? (
          <MemberEditor
            busy={busy}
            canDelete={canDelete}
            canMutate={canMutate}
            currentLevel={currentMember?.mb_level ?? 1}
            draft={draft}
            member={selected}
            onDelete={() => setConfirmDelete(true)}
            onDraft={setDraft}
            onLevel={(level) => void saveLevel(level)}
            onMediaDelete={(kind) => void removeMedia(kind)}
            onMediaUpload={(kind, file) => void uploadMedia(kind, file)}
            onSubmit={saveProfile}
          />
        ) : <div className="selection-placeholder">목록에서 회원을 선택하십시오.</div>}
      </div>

      <ConfirmActionDialog
        busy={busy}
        description={`${selected?.mb_id ?? "선택 회원"}을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void removeMember()}
        open={confirmDelete}
        title="선택 회원을 삭제하시겠습니까?"
      />
    </section>
  );
}

function MemberEditor(props: {
  busy: boolean;
  canDelete: boolean;
  canMutate: boolean;
  currentLevel: number;
  draft: AdminMemberDraft;
  member: AdminMember;
  onDelete: () => void;
  onDraft: (draft: AdminMemberDraft) => void;
  onLevel: (level: number) => void;
  onMediaDelete: (kind: "icon" | "image") => void;
  onMediaUpload: (kind: "icon" | "image", file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const setText = (field: keyof AdminMemberDraft, value: string) =>
    props.onDraft({ ...props.draft, [field]: value });
  return (
    <div className="member-editor">
      <header><span className="eyebrow">Member detail</span><h3>{props.member.mb_id}</h3><p>가입 {props.member.mb_datetime || "—"} · 포인트 {props.member.mb_point ?? 0}</p></header>
      <form onSubmit={props.onSubmit}>
        <fieldset disabled={props.busy || !props.canMutate}>
          <legend>기본 정보</legend>
          <div className="member-field-grid">
            {([[
              "mb_name", "이름"], ["mb_nick", "닉네임"], ["mb_email", "이메일"], ["mb_hp", "휴대전화"],
              ["mb_tel", "전화"], ["mb_homepage", "홈페이지"], ["mb_zip", "우편번호"], ["mb_addr1", "주소"],
              ["mb_addr2", "상세주소"], ["mb_addr3", "참고주소"], ["mb_addr_jibeon", "지번주소"], ["mb_certify", "본인인증"],
              ["mb_leave_date", "탈퇴일 YYYYMMDD"], ["mb_intercept_date", "차단일 YYYYMMDD"], ["mb_password", "새 비밀번호"],
            ] as const).map(([field, label]) => (
              <label key={field}>{label}<input type={field === "mb_password" ? "password" : "text"} value={props.draft[field]} onChange={(event) => setText(field, event.target.value)} /></label>
            ))}
          </div>
          <div className="member-textareas">
            {([[
              "mb_memo", "관리자 메모"], ["mb_profile", "프로필"], ["mb_signature", "서명"],
            ] as const).map(([field, label]) => (
              <label key={field}>{label}<textarea value={props.draft[field]} onChange={(event) => setText(field, event.target.value)} /></label>
            ))}
          </div>
          <div className="member-flags">
            {([[
              "mb_mailling", "메일 수신"], ["mb_sms", "SMS 수신"], ["mb_marketing_agree", "마케팅 동의"],
              ["mb_thirdparty_agree", "제3자 동의"], ["mb_adult", "성인 인증"], ["mb_open", "정보 공개"],
            ] as const).map(([field, label]) => (
              <label key={field}><input type="checkbox" checked={props.draft[field]} onChange={(event) => props.onDraft({ ...props.draft, [field]: event.target.checked })} />{label}</label>
            ))}
          </div>
          <details><summary>여분 필드 mb_1 ~ mb_10</summary><div className="member-field-grid">{props.draft.extras.map((value, index) => <label key={index}>mb_{index + 1}<input value={value} onChange={(event) => { const extras = [...props.draft.extras]; extras[index] = event.target.value; props.onDraft({ ...props.draft, extras }); }} /></label>)}</div></details>
          <button className="primary-action" type="submit">저장·재조회</button>
        </fieldset>
      </form>

      <section className="member-quick-action"><h4>레벨</h4><input aria-label="회원 레벨" type="number" min="1" max={Math.min(10, props.currentLevel)} defaultValue={props.member.mb_level ?? 1} /><button type="button" disabled={props.busy || !props.canMutate} onClick={(event) => { const input = event.currentTarget.previousElementSibling as HTMLInputElement; props.onLevel(Number(input.value)); }}>레벨 저장</button></section>
      <section className="member-media"><h4>회원 미디어</h4>{(["icon", "image"] as const).map((kind) => <div key={kind}><label>{kind === "icon" ? "아이콘" : "이미지"}<input type="file" accept="image/*" disabled={props.busy || !props.canMutate} onChange={(event) => props.onMediaUpload(kind, event.target.files?.[0] ?? null)} /></label><button type="button" disabled={props.busy || !props.canMutate} onClick={() => props.onMediaDelete(kind)}>삭제</button></div>)}</section>
      <section className="member-danger"><h4>위험 작업</h4><p>본인과 최고관리자 계정은 삭제할 수 없습니다.</p><button className="danger-action" type="button" disabled={props.busy || !props.canDelete} onClick={props.onDelete}>회원 삭제</button></section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}
