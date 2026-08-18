import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  type AdminLayoutDetail,
  type AdminLayoutSummary,
  type AdminLayoutWidget,
  addAdminLayoutWidget,
  deleteAdminLayoutWidget,
  getAdminLayout,
  listAdminLayouts,
  reorderAdminLayoutWidgets,
  saveAdminLayout,
  updateAdminLayoutWidget,
} from "../../api/fleet";
import { AdminDataTable } from "../../admin/AdminDataTable";
import { ConfirmActionDialog } from "../../admin/ConfirmActionDialog";
import { useAuthSession } from "../auth/useAuthSession";
import {
  ADMIN_LAYOUT_WIDGET_TYPES,
  buildAdminLayoutSave,
  buildAdminLayoutWidgetCreate,
  buildAdminLayoutWidgetUpdate,
  emptyAdminLayoutDraft,
  emptyAdminLayoutWidgetDraft,
  layoutToDraft,
  parseAdminLayoutSchema,
  validateAdminLayoutDraft,
  validateAdminLayoutWidgetDraft,
  widgetToDraft,
  type AdminLayoutDraft,
  type AdminLayoutWidgetDraft,
} from "./adminLayoutForm";

export function AdminLayoutsPage() {
  const { siteId = "" } = useParams();
  const { session } = useAuthSession();
  const [layouts, setLayouts] = useState<AdminLayoutSummary[]>([]);
  const [selected, setSelected] = useState<AdminLayoutDetail | null>(null);
  const [draft, setDraft] = useState<AdminLayoutDraft>(() => emptyAdminLayoutDraft());
  const [widgetDraft, setWidgetDraft] = useState<AdminLayoutWidgetDraft>(() => emptyAdminLayoutWidgetDraft());
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [deleteWidgetId, setDeleteWidgetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const widgets = useMemo(
    () => selected ? parseAdminLayoutSchema(selected.sl_schema) : [],
    [selected],
  );

  useEffect(() => {
    let active = true;
    void listAdminLayouts(siteId, { page: 1, per_page: 20 })
      .then(async (result) => {
        if (!active) return;
        setLayouts(result.items);
        if (result.items[0]) {
          const detail = await getAdminLayout(siteId, result.items[0].sl_page_id);
          if (active) hydrateLayout(detail);
        }
      })
      .catch((caught) => active && setError(errorMessage(caught, "레이아웃 목록을 읽지 못했습니다.")))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [siteId]);

  function hydrateLayout(layout: AdminLayoutDetail) {
    const parsed = parseAdminLayoutSchema(layout.sl_schema);
    setSelected(layout);
    setDraft(layoutToDraft(layout));
    setEditingWidgetId(null);
    setWidgetDraft(emptyAdminLayoutWidgetDraft(nextWidgetOrder(parsed)));
  }

  async function selectLayout(pageId: string) {
    const detail = await getAdminLayout(siteId, pageId);
    hydrateLayout(detail);
  }

  async function reloadLayouts(preferredPageId?: string) {
    const result = await listAdminLayouts(siteId, { page: 1, per_page: 20 });
    setLayouts(result.items);
    const pageId = preferredPageId
      ?? selected?.sl_page_id
      ?? result.items[0]?.sl_page_id;
    if (pageId) await selectLayout(pageId);
  }

  function newLayout() {
    setSelected(null);
    setDraft(emptyAdminLayoutDraft());
    setEditingWidgetId(null);
    setWidgetDraft(emptyAdminLayoutWidgetDraft());
    setError("");
    setMessage("");
  }

  async function saveLayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAdminLayoutDraft(draft);
    if (errors.length) return setError(errors.join(" "));
    const payload = buildAdminLayoutSave(draft);
    if (!payload) return setError("레이아웃 저장값을 확인하십시오.");
    await runMutation(async () => {
      const saved = await saveAdminLayout(siteId, draft.pageId, payload, session.csrf_token);
      const readback = await getAdminLayout(siteId, saved.sl_page_id);
      await reloadLayouts(readback.sl_page_id);
      setMessage("레이아웃을 저장하고 상세를 재조회했습니다.");
    });
  }

  function editWidget(widget: AdminLayoutWidget) {
    setEditingWidgetId(widget.widget_id);
    setWidgetDraft(widgetToDraft(widget));
    setError("");
  }

  async function saveWidget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return setError("먼저 레이아웃을 저장하거나 선택하십시오.");
    const errors = validateAdminLayoutWidgetDraft(widgetDraft);
    if (errors.length) return setError(errors.join(" "));
    await runMutation(async () => {
      let result: AdminLayoutDetail;
      if (editingWidgetId) {
        const baseline = widgets.find((widget) => widget.widget_id === editingWidgetId);
        if (!baseline) throw new Error("수정할 위젯을 찾지 못했습니다.");
        const update = buildAdminLayoutWidgetUpdate(baseline, widgetDraft);
        if (!update) throw new Error("변경된 위젯 항목이 없습니다.");
        result = await updateAdminLayoutWidget(
          siteId, selected.sl_page_id, editingWidgetId, update, session.csrf_token,
        );
      } else {
        const create = buildAdminLayoutWidgetCreate(widgetDraft);
        if (!create) throw new Error("위젯 입력값을 확인하십시오.");
        result = await addAdminLayoutWidget(
          siteId, selected.sl_page_id, create, session.csrf_token,
        );
      }
      const readback = await getAdminLayout(siteId, result.sl_page_id);
      hydrateLayout(readback);
      await reloadLayoutSummaries();
      setMessage(editingWidgetId
        ? "위젯을 수정하고 레이아웃을 재조회했습니다."
        : "위젯을 추가하고 레이아웃을 재조회했습니다.");
    });
  }

  async function moveWidget(widgetId: string, direction: -1 | 1) {
    if (!selected) return;
    const index = widgets.findIndex((widget) => widget.widget_id === widgetId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= widgets.length) return;
    const ids = widgets.map((widget) => widget.widget_id);
    [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
    await runMutation(async () => {
      await reorderAdminLayoutWidgets(
        siteId, selected.sl_page_id, { widget_ids: ids }, session.csrf_token,
      );
      const readback = await getAdminLayout(siteId, selected.sl_page_id);
      hydrateLayout(readback);
      setMessage("위젯 순서를 저장하고 레이아웃을 재조회했습니다.");
    });
  }

  async function removeWidget() {
    if (!selected || !deleteWidgetId) return;
    await runMutation(async () => {
      await deleteAdminLayoutWidget(
        siteId, selected.sl_page_id, deleteWidgetId, session.csrf_token,
      );
      const readback = await getAdminLayout(siteId, selected.sl_page_id);
      setDeleteWidgetId(null);
      hydrateLayout(readback);
      await reloadLayoutSummaries();
      setMessage("위젯을 삭제하고 레이아웃을 재조회했습니다.");
    });
  }

  async function reloadLayoutSummaries() {
    const result = await listAdminLayouts(siteId, { page: 1, per_page: 20 });
    setLayouts(result.items);
  }

  async function runMutation(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try { await action(); }
    catch (caught) { setError(errorMessage(caught, "레이아웃 작업을 완료하지 못했습니다.")); }
    finally { setBusy(false); }
  }

  if (!siteId) return <p className="error-message">site_id가 없는 레이아웃 관리 경로입니다.</p>;

  return (
    <section className="page layouts-page" aria-labelledby="layouts-title">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Sites / {siteId} / Layouts</span>
          <h2 id="layouts-title">레이아웃 관리</h2>
          <p>레이아웃과 위젯을 사이트별 typed HTTP 요청으로 저장하고 즉시 재조회합니다.</p>
        </div>
        <div className="action-row">
          <button type="button" disabled={busy} onClick={newLayout}>새 레이아웃</button>
          <Link to={`/sites/${encodeURIComponent(siteId)}`}>사이트로 돌아가기</Link>
        </div>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="success-message" role="status">{message}</p> : null}

      <div className="layout-workspace">
        <div className="member-list-panel">
          <div className="workspace-panel-heading">
            <h3>레이아웃 목록</h3>
            <span>{layouts.length}개</span>
          </div>
          {loading ? <p className="audit-loading">레이아웃 목록을 불러오는 중입니다.</p> : (
            <AdminDataTable
              columns={[
                { header: "레이아웃", render: (layout: AdminLayoutSummary) => <><strong>{layout.sl_title}</strong><small>{layout.sl_page_id}</small></> },
                { header: "상태", render: (layout: AdminLayoutSummary) => layout.sl_active === 1 ? "활성" : "비활성" },
                { header: "업데이트", render: (layout: AdminLayoutSummary) => layout.sl_updated || layout.sl_datetime },
              ]}
              emptyMessage="등록된 레이아웃이 없습니다."
              getRowKey={(layout: AdminLayoutSummary) => layout.sl_page_id}
              onRowClick={(layout: AdminLayoutSummary) => void selectLayout(layout.sl_page_id).catch((caught) => setError(errorMessage(caught, "레이아웃 상세를 읽지 못했습니다.")))}
              rows={layouts}
              selectedKey={selected?.sl_page_id ?? null}
            />
          )}
        </div>

        <form className="member-editor layout-editor" onSubmit={saveLayout}>
          <header>
            <span className="eyebrow">Layout detail</span>
            <h3>{selected?.sl_title ?? "새 레이아웃"}</h3>
            <p>기존 편집 UX의 전체 widgets JSON 저장을 서버 경계로 재사용했습니다.</p>
          </header>
          <fieldset disabled={busy}>
            <legend>레이아웃 정보</legend>
            <TextField label="page_id" value={draft.pageId} disabled={Boolean(selected)} onChange={(pageId) => setDraft({ ...draft, pageId })} />
            <TextField label="레이아웃 제목" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
            <label>widgets JSON<textarea aria-label="widgets JSON" rows={12} value={draft.widgetsJson} onChange={(event) => setDraft({ ...draft, widgetsJson: event.currentTarget.value })} /></label>
          </fieldset>
          <div className="action-row">
            <button className="primary-action" type="submit" disabled={busy}>레이아웃 저장·재조회</button>
            <button type="button" disabled={busy} onClick={newLayout}>새 항목</button>
          </div>
        </form>
      </div>

      <div className="layout-widget-workspace">
        <section className="member-list-panel" aria-labelledby="widgets-title">
          <div className="workspace-panel-heading">
            <h3 id="widgets-title">현재 위젯</h3>
            <span>{widgets.length}개</span>
          </div>
          {selected && widgets.length === 0 ? <p className="empty-state">등록된 위젯이 없습니다.</p> : null}
          {!selected ? <p className="empty-state">레이아웃을 먼저 선택하거나 저장하십시오.</p> : null}
          <ol className="layout-widget-list">
            {widgets.map((widget, index) => (
              <li key={widget.widget_id}>
                <div><strong>{widget.title || widget.widget_id}</strong><small>{widget.widget_id} · {widget.type}</small></div>
                <span>순서 {widget.order}</span>
                <div className="action-row">
                  <button type="button" aria-label={`${widget.widget_id} 위로`} disabled={busy || index === 0} onClick={() => void moveWidget(widget.widget_id, -1)}>↑</button>
                  <button type="button" aria-label={`${widget.widget_id} 아래로`} disabled={busy || index === widgets.length - 1} onClick={() => void moveWidget(widget.widget_id, 1)}>↓</button>
                  <button type="button" disabled={busy} onClick={() => editWidget(widget)}>편집</button>
                  <button className="danger-action" type="button" disabled={busy} onClick={() => setDeleteWidgetId(widget.widget_id)}>삭제</button>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <form className="member-editor layout-widget-editor" onSubmit={saveWidget}>
          <header><span className="eyebrow">Widget detail</span><h3>{editingWidgetId ? "위젯 수정" : "위젯 추가"}</h3><p>config와 style은 JSON 객체로 검증한 뒤 전송합니다.</p></header>
          <fieldset disabled={busy || !selected}>
            <legend>위젯 정보</legend>
            <TextField label="widget_id" value={widgetDraft.widgetId} disabled={Boolean(editingWidgetId)} onChange={(widgetId) => setWidgetDraft({ ...widgetDraft, widgetId })} />
            <label>위젯 유형<select aria-label="위젯 유형" value={widgetDraft.type} onChange={(event) => setWidgetDraft({ ...widgetDraft, type: event.currentTarget.value as AdminLayoutWidgetDraft["type"] })}>{ADMIN_LAYOUT_WIDGET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <div className="form-grid-two">
              <TextField label="위젯 제목" value={widgetDraft.title} onChange={(title) => setWidgetDraft({ ...widgetDraft, title })} />
              <TextField label="위젯 순서" value={widgetDraft.order} inputMode="numeric" onChange={(order) => setWidgetDraft({ ...widgetDraft, order })} />
            </div>
            <label>config JSON<textarea aria-label="config JSON" rows={5} value={widgetDraft.configJson} onChange={(event) => setWidgetDraft({ ...widgetDraft, configJson: event.currentTarget.value })} /></label>
            <label>style JSON<textarea aria-label="style JSON" rows={5} value={widgetDraft.styleJson} onChange={(event) => setWidgetDraft({ ...widgetDraft, styleJson: event.currentTarget.value })} /></label>
          </fieldset>
          <div className="action-row">
            <button className="primary-action" type="submit" disabled={busy || !selected}>{editingWidgetId ? "위젯 수정·재조회" : "위젯 추가·재조회"}</button>
            <button type="button" disabled={busy || !selected} onClick={() => { setEditingWidgetId(null); setWidgetDraft(emptyAdminLayoutWidgetDraft(nextWidgetOrder(widgets))); }}>입력 초기화</button>
          </div>
        </form>
      </div>

      <ConfirmActionDialog
        busy={busy}
        open={Boolean(deleteWidgetId)}
        title="위젯을 삭제하시겠습니까?"
        description={`선택한 위젯(${deleteWidgetId ?? "ID 없음"})을 레이아웃에서 삭제합니다.`}
        onCancel={() => setDeleteWidgetId(null)}
        onConfirm={() => void removeWidget()}
      />
    </section>
  );
}

function TextField(props: { label: string; value: string; disabled?: boolean; inputMode?: "numeric"; onChange: (value: string) => void }) {
  return <label>{props.label}<input aria-label={props.label} disabled={props.disabled} inputMode={props.inputMode} value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)} /></label>;
}

function nextWidgetOrder(widgets: AdminLayoutWidget[]): number {
  return widgets.length ? Math.max(...widgets.map((widget) => widget.order)) + 1 : 1;
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
