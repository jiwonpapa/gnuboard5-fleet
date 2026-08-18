import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  type AdminMenu,
  createAdminMenu,
  deleteAdminMenu,
  getAdminMenu,
  listAdminMenus,
  reorderAdminMenus,
  updateAdminMenu,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";
import {
  buildAdminMenuCreate,
  buildAdminMenuReorder,
  buildAdminMenuUpdate,
  countChangedMenuOrders,
  emptyAdminMenuDraft,
  menuToDraft,
  validateAdminMenuDraft,
  type AdminMenuDraft,
} from "./adminMenuForm";

export function AdminMenusPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [menus, setMenus] = useState<AdminMenu[]>([]);
  const [selected, setSelected] = useState<AdminMenu | null>(null);
  const [draft, setDraft] = useState<AdminMenuDraft>(() => emptyAdminMenuDraft());
  const [orderDrafts, setOrderDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function selectMenu(meId: number) {
    const detail = await getAdminMenu(siteId, meId);
    setSelected(detail);
    setDraft(menuToDraft(detail));
  }

  function hydrateOrderDrafts(items: AdminMenu[]) {
    setOrderDrafts(Object.fromEntries(items.map((menu) => [menu.me_id, String(menu.me_order)])));
  }

  async function reloadMenus(preferredId?: number) {
    const result = await listAdminMenus(siteId);
    setMenus(result.items);
    hydrateOrderDrafts(result.items);
    const target = result.items.find((menu) => menu.me_id === preferredId)
      ?? result.items.find((menu) => menu.me_id === selected?.me_id)
      ?? result.items[0];
    if (target) await selectMenu(target.me_id);
    else newMenu(result.items);
  }

  useEffect(() => {
    let active = true;
    void listAdminMenus(siteId)
      .then(async (result) => {
        if (!active) return;
        setMenus(result.items);
        hydrateOrderDrafts(result.items);
        const first = result.items[0];
        if (first) {
          const detail = await getAdminMenu(siteId, first.me_id);
          if (active) {
            setSelected(detail);
            setDraft(menuToDraft(detail));
          }
        } else {
          setSelected(null);
          setDraft(emptyAdminMenuDraft());
        }
      })
      .catch((caught) => active && setError(errorMessage(caught, "메뉴 목록을 읽지 못했습니다.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [siteId]);

  const orderedMenus = useMemo(() => [...menus].sort((left, right) => {
    const leftOrder = Number(orderDrafts[left.me_id] ?? left.me_order);
    const rightOrder = Number(orderDrafts[right.me_id] ?? right.me_order);
    return leftOrder - rightOrder || left.me_id - right.me_id;
  }), [menus, orderDrafts]);
  const reorderPayload = buildAdminMenuReorder(menus, orderDrafts);
  const pendingOrderChanges = countChangedMenuOrders(menus, orderDrafts);

  function newMenu(current = menus) {
    setSelected(null);
    setDraft(emptyAdminMenuDraft(current.length ? Math.max(...current.map((menu) => menu.me_order)) + 1 : 0));
    setError("");
    setMessage("");
  }

  async function saveMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAdminMenuDraft(draft);
    if (errors.length) return setError(errors.join(" "));
    const update = selected ? buildAdminMenuUpdate(selected, draft) : null;
    if (update && Object.keys(update).length === 0) return setError("변경된 항목이 없습니다.");
    await runMutation(async () => {
      const saved = selected
        ? await updateAdminMenu(siteId, selected.me_id, update!, session.csrf_token)
        : await createAdminMenu(siteId, buildAdminMenuCreate(draft), session.csrf_token);
      const readback = await getAdminMenu(siteId, saved.me_id);
      await reloadMenus(readback.me_id);
      setMessage("메뉴를 저장하고 상세를 재조회했습니다.");
    });
  }

  async function saveOrderDrafts() {
    if (!reorderPayload) return setError("변경된 메뉴 순서가 없거나 입력값이 올바르지 않습니다.");
    await runMutation(async () => {
      await reorderAdminMenus(siteId, reorderPayload, session.csrf_token);
      await reloadMenus(selected?.me_id);
      setMessage("메뉴 순서를 저장하고 목록을 재조회했습니다.");
    });
  }

  async function removeMenu() {
    if (!selected) return;
    await runMutation(async () => {
      await deleteAdminMenu(siteId, selected.me_id, session.csrf_token);
      setDeleteOpen(false);
      setSelected(null);
      await reloadMenus();
      setMessage("메뉴를 삭제하고 목록을 재조회했습니다.");
    });
  }

  async function runMutation(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try { await action(); }
    catch (caught) { setError(errorMessage(caught, "메뉴 관리 작업을 완료하지 못했습니다.")); }
    finally { setBusy(false); }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 메뉴 관리 경로입니다.</p>;

  return (
    <section className="page menus-page" aria-labelledby="menus-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Menus</span>
          <h2 id="menus-title">메뉴 관리</h2>
          <p>메뉴 코드·링크·노출 상태·순서를 동일한 사이트 범위에서 저장하고 재조회합니다.</p>
        </div>
        <div className="action-row">
          <button type="button" disabled={busy} onClick={() => newMenu()}>새 메뉴</button>
          <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
        </div>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      <div className="action-row menu-reorder-actions">
        <span>{menus.length}개 · 정렬 변경 {pendingOrderChanges}개</span>
        <button className="primary-action" type="button" disabled={busy || !reorderPayload} onClick={() => void saveOrderDrafts()}>정렬 저장·재조회</button>
        <button type="button" disabled={busy || pendingOrderChanges === 0} onClick={() => hydrateOrderDrafts(menus)}>서버 순서 복원</button>
      </div>

      <div className="member-workspace">
        <div className="member-list-panel">
          {loading ? <p className="audit-loading">메뉴 목록을 불러오는 중입니다.</p> : (
            <AdminDataTable
              columns={[
                { header: "메뉴", render: (menu: AdminMenu) => <><strong>{menu.me_name}</strong><small>{menu.me_code}</small></> },
                { header: "링크", render: (menu: AdminMenu) => <><span>{menu.me_link}</span><small>{menu.me_target}</small></> },
                { header: "노출", render: (menu: AdminMenu) => `PC ${menu.me_use ? "ON" : "OFF"} · 모바일 ${menu.me_mobile_use ? "ON" : "OFF"}` },
                { header: "순서", render: (menu: AdminMenu) => (
                  <input
                    aria-label={`${menu.me_name} 메뉴 순서`}
                    className="menu-order-input"
                    inputMode="numeric"
                    value={orderDrafts[menu.me_id] ?? String(menu.me_order)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setOrderDrafts((current) => ({ ...current, [menu.me_id]: value }));
                    }}
                  />
                ) },
              ]}
              emptyMessage="등록된 메뉴가 없습니다."
              getRowKey={(menu: AdminMenu) => String(menu.me_id)}
              onRowClick={(menu: AdminMenu) => void selectMenu(menu.me_id).catch((caught) => setError(errorMessage(caught, "메뉴 상세를 읽지 못했습니다.")))}
              rows={orderedMenus}
              selectedKey={selected ? String(selected.me_id) : null}
            />
          )}
        </div>

        <form className="member-editor" onSubmit={saveMenu}>
          <header><span className="eyebrow">Menu detail</span><h3>{selected?.me_name ?? "새 메뉴"}</h3><p>기존 메뉴 UX를 typed same-origin 서버 흐름으로 옮겼습니다.</p></header>
          <fieldset disabled={busy}>
            <legend>메뉴 정보</legend>
            <TextField label="메뉴 코드" value={draft.me_code} onChange={(value) => setDraft({ ...draft, me_code: value })} />
            <TextField label="메뉴 이름" value={draft.me_name} onChange={(value) => setDraft({ ...draft, me_name: value })} />
            <TextField label="메뉴 링크" value={draft.me_link} onChange={(value) => setDraft({ ...draft, me_link: value })} />
            <div className="form-grid-two">
              <TextField label="링크 target" value={draft.me_target} onChange={(value) => setDraft({ ...draft, me_target: value })} />
              <TextField label="정렬 순서" value={draft.me_order} inputMode="numeric" onChange={(value) => setDraft({ ...draft, me_order: value })} />
            </div>
            <label className="checkbox-row"><input aria-label="PC 노출" type="checkbox" checked={draft.me_use} onChange={(event) => setDraft({ ...draft, me_use: event.currentTarget.checked })} />PC 노출</label>
            <label className="checkbox-row"><input aria-label="모바일 노출" type="checkbox" checked={draft.me_mobile_use} onChange={(event) => setDraft({ ...draft, me_mobile_use: event.currentTarget.checked })} />모바일 노출</label>
          </fieldset>
          <div className="action-row">
            <button className="primary-action" type="submit" disabled={busy}>저장·재조회</button>
            <button type="button" disabled={busy} onClick={() => newMenu()}>새 항목</button>
            {selected ? <button className="danger-action" type="button" disabled={busy} onClick={() => setDeleteOpen(true)}>메뉴 삭제</button> : null}
          </div>
        </form>
      </div>

      <ConfirmActionDialog busy={busy} open={deleteOpen} title="메뉴를 삭제하시겠습니까?" description={`${selected?.me_name ?? "선택 메뉴"}와 연결 정보가 삭제됩니다.`} onCancel={() => setDeleteOpen(false)} onConfirm={() => void removeMenu()} />
    </section>
  );
}

function TextField(props: { label: string; value: string; inputMode?: "numeric"; onChange: (value: string) => void }) {
  return <label>{props.label}<input aria-label={props.label} inputMode={props.inputMode} value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} /></label>;
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
