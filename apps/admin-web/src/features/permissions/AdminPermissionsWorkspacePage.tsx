import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  deleteAdminAuthByMember,
  deleteAdminSystemPermission,
  getMyProfile,
  listAdminAuth,
  listAdminSystemPermissions,
  saveAdminSystemPermission,
  upsertAdminAuth,
  type AdminAuthAssignment,
  type AdminAuthMember,
  type AdminSystemPermission,
  type MemberProfile,
} from "../../api/fleet";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";
import {
  normalizePermissionAuth,
  upsertAuthAssignment,
  validatePermissionDraft,
  type PermissionDraft,
} from "./adminPermissionsForm";

const EMPTY_PERMISSION: PermissionDraft = {
  mb_id: "",
  au_menu: "",
  au_auth: "r",
};

export function AdminPermissionsWorkspacePage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [permissions, setPermissions] = useState<AdminSystemPermission[]>([]);
  const [members, setMembers] = useState<AdminAuthMember[]>([]);
  const [mode, setMode] = useState<"menu" | "member">("menu");
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState<PermissionDraft>(EMPTY_PERMISSION);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [grants, setGrants] = useState<AdminAuthAssignment[]>([]);
  const [grantDraft, setGrantDraft] = useState({ au_menu: "", au_auth: "r" });
  const [errors, setErrors] = useState<Partial<Record<keyof PermissionDraft, string>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<"permission" | "member" | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getMyProfile(siteId),
      listAdminSystemPermissions(siteId, { page: 1, per_page: 100 }),
      listAdminAuth(siteId, { page: 1, per_page: 100 }),
    ])
      .then(([nextProfile, permissionResult, memberResult]) => {
        if (!active) return;
        setProfile(nextProfile);
        setPermissions(permissionResult.items);
        setMembers(memberResult.items);
        const firstPermission = permissionResult.items[0];
        if (firstPermission) selectPermission(firstPermission);
        const firstMember = memberResult.items[0];
        if (firstMember) selectMember(firstMember);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "권한 정보를 읽지 못했습니다.");
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [siteId]);

  const selectedPermission = useMemo(
    () => permissions.find((item) => permissionKey(item) === selectedKey) ?? null,
    [permissions, selectedKey],
  );
  const selectedMember = useMemo(
    () => members.find((item) => item.mb_id === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );

  function selectPermission(item: AdminSystemPermission) {
    setSelectedKey(permissionKey(item));
    setDraft({
      mb_id: item.mb_id,
      au_menu: item.au_menu,
      au_auth: normalizePermissionAuth(item.au_auth) ?? item.au_auth,
    });
    setErrors({});
    setMessage("");
  }

  function selectMember(item: AdminAuthMember) {
    setSelectedMemberId(item.mb_id);
    setGrants(item.auths);
    setGrantDraft({ au_menu: "", au_auth: "r" });
    setErrors({});
    setMessage("");
  }

  async function reloadPermissions(preferredKey?: string) {
    const result = await listAdminSystemPermissions(siteId, { page: 1, per_page: 100 });
    setPermissions(result.items);
    const next = result.items.find((item) => permissionKey(item) === preferredKey) ??
      result.items[0];
    if (next) selectPermission(next);
    else {
      setSelectedKey("");
      setDraft(EMPTY_PERMISSION);
    }
  }

  async function reloadMembers(preferredId?: string) {
    const result = await listAdminAuth(siteId, { page: 1, per_page: 100 });
    setMembers(result.items);
    const next = result.items.find((item) => item.mb_id === preferredId) ?? result.items[0];
    if (next) selectMember(next);
    else {
      setSelectedMemberId("");
      setGrants([]);
    }
  }

  async function savePermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validatePermissionDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const auAuth = normalizePermissionAuth(draft.au_auth);
    if (!auAuth) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await saveAdminSystemPermission(
        siteId,
        { ...draft, au_auth: auAuth },
        session.csrf_token,
      );
      await reloadPermissions(permissionKey(saved));
      setMessage("메뉴 권한을 저장하고 목록을 재조회했습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "메뉴 권한을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function addGrant() {
    const next = upsertAuthAssignment(grants, grantDraft);
    if (!next) {
      setErrors(validatePermissionDraft({
        mb_id: selectedMemberId || "___",
        ...grantDraft,
      }, true));
      return;
    }
    setGrants(next);
    setGrantDraft({ au_menu: "", au_auth: "r" });
    setErrors({});
    setMessage("권한 묶음에 변경이 대기 중입니다.");
  }

  async function saveMemberGrants() {
    if (!selectedMember || !grants.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await upsertAdminAuth(siteId, selectedMember.mb_id, grants, session.csrf_token);
      await reloadMembers(selectedMember.mb_id);
      setMessage("회원 권한 묶음을 저장하고 재조회했습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "회원 권한 묶음을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function removeConfirmed() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (confirm === "permission" && selectedPermission) {
        await deleteAdminSystemPermission(
          siteId,
          selectedPermission.mb_id,
          selectedPermission.au_menu,
          session.csrf_token,
        );
        await reloadPermissions();
        setMessage("선택한 메뉴 권한을 삭제하고 재조회했습니다.");
      } else if (confirm === "member" && selectedMember) {
        await deleteAdminAuthByMember(siteId, selectedMember.mb_id, session.csrf_token);
        await reloadMembers();
        setMessage("선택 회원의 전체 관리자 권한을 삭제하고 재조회했습니다.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "권한을 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  if (!siteId) {
    return <p className="error-message" role="alert">site_id가 없는 권한 경로입니다.</p>;
  }

  return (
    <section className="page permissions-page" aria-labelledby="permissions-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Access</span>
          <h2 id="permissions-title">관리자 권한</h2>
          <p>선택 사이트의 권한만 조회하며 변경 작업은 최근 본인 확인을 요구합니다.</p>
        </div>
        <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
      </div>

      <div className="permission-context" aria-label="G5 연결 사용자">
        <span className="eyebrow">Connected identity</span>
        <strong>{profile?.mb_name || profile?.mb_nick || profile?.mb_id || "확인 중"}</strong>
        <code>{profile?.mb_id ?? "—"}</code>
        <span>레벨 {profile?.mb_level ?? "—"}</span>
      </div>

      <nav className="permission-mode" aria-label="권한 작업 범위">
        <button aria-current={mode === "menu" ? "page" : undefined} onClick={() => setMode("menu")} type="button">
          메뉴별 권한 <small>{permissions.length}</small>
        </button>
        <button aria-current={mode === "member" ? "page" : undefined} onClick={() => setMode("member")} type="button">
          회원별 권한 묶음 <small>{members.length}</small>
        </button>
      </nav>

      {loading ? <p className="audit-loading" role="status">회원과 권한 계약을 확인 중입니다.</p> : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      {!loading && mode === "menu" ? (
        <div className="permission-workspace">
          <PermissionList
            items={permissions}
            onNew={() => {
              setSelectedKey("");
              setDraft(EMPTY_PERMISSION);
              setErrors({});
            }}
            onSelect={selectPermission}
            selectedKey={selectedKey}
          />
          <form className="permission-editor" onSubmit={savePermission}>
            <EditorHeading
              description="회원 ID와 메뉴 코드 조합 하나를 읽기·쓰기·삭제 범위로 제한합니다."
              title={selectedPermission ? "메뉴 권한 수정" : "새 메뉴 권한"}
            />
            <label>
              회원 ID
              <input
                aria-invalid={Boolean(errors.mb_id)}
                onChange={(event) => setDraft({ ...draft, mb_id: event.currentTarget.value.trim() })}
                value={draft.mb_id}
              />
              {errors.mb_id ? <small className="field-error">{errors.mb_id}</small> : null}
            </label>
            <label>
              메뉴 코드
              <input
                aria-invalid={Boolean(errors.au_menu)}
                onChange={(event) => setDraft({ ...draft, au_menu: event.currentTarget.value.trim() })}
                value={draft.au_menu}
              />
              {errors.au_menu ? <small className="field-error">{errors.au_menu}</small> : null}
            </label>
            <AuthChecks draft={draft} onChange={setDraft} />
            {errors.au_auth ? <small className="field-error">{errors.au_auth}</small> : null}
            <div className="permission-actions">
              <button className="primary-action" disabled={busy || !session.step_up_active} type="submit">저장·재조회</button>
              <button className="danger-action" disabled={busy || !selectedPermission || !session.step_up_active} onClick={() => setConfirm("permission")} type="button">
                선택 권한 삭제
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {!loading && mode === "member" ? (
        <div className="permission-workspace">
          <MemberList items={members} onSelect={selectMember} selectedId={selectedMemberId} />
          <div className="permission-editor">
            <EditorHeading
              description="한 회원에게 부여된 숫자 메뉴 코드 권한 전체를 원자적으로 저장합니다."
              title={selectedMember ? `${selectedMember.mb_id} 권한 묶음` : "회원을 선택하십시오"}
            />
            <ul className="grant-list">
              {grants.map((grant) => (
                <li key={grant.au_menu}>
                  <code>{grant.au_menu}</code><span>{grant.au_auth}</span>
                  <button onClick={() => setGrants((current) => current.filter((item) => item.au_menu !== grant.au_menu))} type="button">제거</button>
                </li>
              ))}
            </ul>
            <div className="grant-composer">
              <label>숫자 메뉴 코드<input value={grantDraft.au_menu} onChange={(event) => setGrantDraft({ ...grantDraft, au_menu: event.currentTarget.value.trim() })} /></label>
              <label>권한<input value={grantDraft.au_auth} onChange={(event) => setGrantDraft({ ...grantDraft, au_auth: event.currentTarget.value })} /></label>
              <button onClick={addGrant} type="button">묶음에 반영</button>
            </div>
            {errors.au_menu || errors.au_auth ? <small className="field-error">{errors.au_menu ?? errors.au_auth}</small> : null}
            <div className="permission-actions">
              <button className="primary-action" disabled={busy || !selectedMember || !grants.length || !session.step_up_active} onClick={() => void saveMemberGrants()} type="button">전체 묶음 저장·재조회</button>
              <button className="danger-action" disabled={busy || !selectedMember || !session.step_up_active} onClick={() => setConfirm("member")} type="button">회원 전체 권한 삭제</button>
            </div>
          </div>
        </div>
      ) : null}

      {!session.step_up_active ? <p className="admin-step-up-note">권한 변경은 보안 설정에서 최근 본인 확인 후 가능합니다.</p> : null}
      <ConfirmActionDialog
        busy={busy}
        description={confirm === "member"
          ? "선택 회원에게 부여된 관리자 권한 전체가 삭제됩니다."
          : "선택한 회원·메뉴 조합의 권한 하나가 삭제됩니다."}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void removeConfirmed()}
        open={confirm !== null}
        title="권한 삭제를 실행하시겠습니까?"
      />
    </section>
  );
}

function PermissionList(props: {
  items: AdminSystemPermission[];
  selectedKey: string;
  onSelect: (item: AdminSystemPermission) => void;
  onNew: () => void;
}) {
  return (
    <aside className="permission-list">
      <header><div><span className="eyebrow">Menu scope</span><strong>권한 목록</strong></div><button onClick={props.onNew} type="button">새 권한</button></header>
      <ul>
        {props.items.map((item) => (
          <li key={permissionKey(item)}>
            <button aria-current={permissionKey(item) === props.selectedKey ? "true" : undefined} onClick={() => props.onSelect(item)} type="button">
              <span><strong>{item.mb_id}</strong><small>{item.mb_name || item.mb_nick || "이름 없음"}</small></span>
              <span><code>{item.au_menu}</code><b>{item.au_auth}</b></span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function MemberList(props: {
  items: AdminAuthMember[];
  selectedId: string;
  onSelect: (item: AdminAuthMember) => void;
}) {
  return (
    <aside className="permission-list">
      <header><div><span className="eyebrow">Member scope</span><strong>권한 회원</strong></div></header>
      <ul>
        {props.items.map((item) => (
          <li key={item.mb_id}>
            <button aria-current={item.mb_id === props.selectedId ? "true" : undefined} onClick={() => props.onSelect(item)} type="button">
              <span><strong>{item.mb_id}</strong><small>{item.mb_name || item.mb_nick}</small></span>
              <b>{item.auths.length}</b>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function EditorHeading(props: { title: string; description: string }) {
  return <header><span className="eyebrow">Permission editor</span><h3>{props.title}</h3><p>{props.description}</p></header>;
}

function AuthChecks(props: {
  draft: PermissionDraft;
  onChange: (draft: PermissionDraft) => void;
}) {
  return (
    <fieldset className="auth-checks">
      <legend>허용 작업</legend>
      {[["r", "읽기"], ["w", "쓰기"], ["d", "삭제"]].map(([flag, label]) => (
        <label key={flag}>
          <input
            checked={props.draft.au_auth.includes(flag)}
            onChange={(event) => {
              const next = event.currentTarget.checked
                ? `${props.draft.au_auth}${flag}`
                : props.draft.au_auth.replaceAll(flag, "");
              props.onChange({ ...props.draft, au_auth: next });
            }}
            type="checkbox"
          />
          {label} <code>{flag}</code>
        </label>
      ))}
    </fieldset>
  );
}

function permissionKey(item: Pick<AdminSystemPermission, "mb_id" | "au_menu">) {
  return `${item.mb_id}::${item.au_menu}`;
}
