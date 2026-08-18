import type {
  AdminLayoutDetail,
  AdminLayoutSave,
  AdminLayoutWidget,
  AdminLayoutWidgetCreate,
  AdminLayoutWidgetType,
  AdminLayoutWidgetUpdate,
} from "../../api/fleet";

export const ADMIN_LAYOUT_WIDGET_TYPES: AdminLayoutWidgetType[] = [
  "latest_posts",
  "notice_banner",
  "popular_posts",
  "category_grid",
  "search_bar",
  "image_carousel",
  "ad_banner",
  "spacer",
  "html_block",
  "quick_menu",
];

export interface AdminLayoutDraft {
  pageId: string;
  title: string;
  widgetsJson: string;
}

export interface AdminLayoutWidgetDraft {
  widgetId: string;
  type: AdminLayoutWidgetType;
  title: string;
  order: string;
  configJson: string;
  styleJson: string;
}

export function emptyAdminLayoutDraft(): AdminLayoutDraft {
  return { pageId: "", title: "", widgetsJson: "[]" };
}

export function emptyAdminLayoutWidgetDraft(nextOrder = 1): AdminLayoutWidgetDraft {
  return {
    widgetId: "",
    type: "html_block",
    title: "",
    order: String(nextOrder),
    configJson: "{}",
    styleJson: "{}",
  };
}

export function layoutToDraft(layout: AdminLayoutDetail): AdminLayoutDraft {
  return {
    pageId: layout.sl_page_id,
    title: layout.sl_title,
    widgetsJson: JSON.stringify(parseAdminLayoutSchema(layout.sl_schema), null, 2),
  };
}

export function widgetToDraft(widget: AdminLayoutWidget): AdminLayoutWidgetDraft {
  return {
    widgetId: widget.widget_id,
    type: widget.type,
    title: widget.title,
    order: String(widget.order),
    configJson: JSON.stringify(widget.config, null, 2),
    styleJson: JSON.stringify(widget.style, null, 2),
  };
}

export function parseAdminLayoutSchema(schemaJson: string): AdminLayoutWidget[] {
  try {
    const parsed = JSON.parse(schemaJson) as { widgets?: unknown };
    return Array.isArray(parsed.widgets)
      ? parsed.widgets.flatMap((widget) => {
          const normalized = normalizeStoredWidget(widget);
          return normalized ? [normalized] : [];
        })
      : [];
  } catch {
    return [];
  }
}

function normalizeStoredWidget(value: unknown): AdminLayoutWidget | null {
  if (!value || typeof value !== "object") return null;
  const widget = value as Partial<AdminLayoutWidget>;
  if (typeof widget.widget_id !== "string"
    || !validSlug(widget.widget_id, 80)
    || typeof widget.type !== "string"
    || !ADMIN_LAYOUT_WIDGET_TYPES.includes(widget.type as AdminLayoutWidgetType)) {
    return null;
  }
  const config = normalizeStoredObject(widget.config);
  const style = normalizeStoredObject(widget.style);
  if (!config || !style) return null;
  return {
    widget_id: widget.widget_id,
    type: widget.type as AdminLayoutWidgetType,
    title: typeof widget.title === "string" ? widget.title : "",
    order: Number.isInteger(widget.order) && (widget.order ?? 0) >= 1 ? widget.order! : 1,
    config,
    style,
  };
}

function normalizeStoredObject(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  return Array.isArray(value) && value.length === 0 ? {} : null;
}

export function validateAdminLayoutDraft(draft: AdminLayoutDraft): string[] {
  const errors: string[] = [];
  if (!validSlug(draft.pageId, 120)) {
    errors.push("page_id는 영문·숫자·하이픈·밑줄만 사용할 수 있습니다.");
  }
  if (draft.title.length > 255) errors.push("제목은 255자 이하여야 합니다.");
  const parsed = parseWidgetsInput(draft.widgetsJson);
  if (parsed.error) errors.push(parsed.error);
  return errors;
}

export function buildAdminLayoutSave(draft: AdminLayoutDraft): AdminLayoutSave | null {
  if (validateAdminLayoutDraft(draft).length > 0) return null;
  const parsed = parseWidgetsInput(draft.widgetsJson);
  if (!parsed.widgets) return null;
  return { title: draft.title.trim(), widgets: parsed.widgets };
}

export function validateAdminLayoutWidgetDraft(draft: AdminLayoutWidgetDraft): string[] {
  const errors: string[] = [];
  if (draft.widgetId && !validSlug(draft.widgetId, 80)) {
    errors.push("widget_id는 영문·숫자·하이픈·밑줄만 사용할 수 있습니다.");
  }
  if (!ADMIN_LAYOUT_WIDGET_TYPES.includes(draft.type)) errors.push("지원하지 않는 위젯 유형입니다.");
  const order = parsePositiveInteger(draft.order);
  if (order === null) errors.push("순서는 1 이상의 정수여야 합니다.");
  if (draft.title.length > 255) errors.push("위젯 제목은 255자 이하여야 합니다.");
  if (!parseObject(draft.configJson)) errors.push("config는 JSON 객체여야 합니다.");
  if (!parseObject(draft.styleJson)) errors.push("style은 JSON 객체여야 합니다.");
  return errors;
}

export function buildAdminLayoutWidgetCreate(
  draft: AdminLayoutWidgetDraft,
): AdminLayoutWidgetCreate | null {
  if (validateAdminLayoutWidgetDraft(draft).length > 0) return null;
  return {
    ...(draft.widgetId.trim() ? { widget_id: draft.widgetId.trim() } : {}),
    type: draft.type,
    title: draft.title.trim(),
    order: parsePositiveInteger(draft.order)!,
    config: parseObject(draft.configJson)!,
    style: parseObject(draft.styleJson)!,
  };
}

export function buildAdminLayoutWidgetUpdate(
  baseline: AdminLayoutWidget,
  draft: AdminLayoutWidgetDraft,
): AdminLayoutWidgetUpdate | null {
  if (validateAdminLayoutWidgetDraft(draft).length > 0) return null;
  const current = buildAdminLayoutWidgetCreate(draft)!;
  const update: AdminLayoutWidgetUpdate = {};
  if (baseline.type !== current.type) update.type = current.type;
  if (baseline.title !== current.title) update.title = current.title;
  if (baseline.order !== current.order) update.order = current.order;
  if (JSON.stringify(baseline.config) !== JSON.stringify(current.config)) update.config = current.config;
  if (JSON.stringify(baseline.style) !== JSON.stringify(current.style)) update.style = current.style;
  return Object.keys(update).length ? update : null;
}

function parseWidgetsInput(value: string): { widgets: AdminLayoutWidget[] | null; error: string } {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return { widgets: null, error: "widgets는 JSON 배열이어야 합니다." };
    if (!parsed.every(isAdminLayoutWidget)) {
      return { widgets: null, error: "각 위젯의 ID·유형·순서·config·style을 확인하십시오." };
    }
    const widgets = parsed as AdminLayoutWidget[];
    if (new Set(widgets.map((widget) => widget.widget_id)).size !== widgets.length) {
      return { widgets: null, error: "widget_id는 중복될 수 없습니다." };
    }
    return { widgets, error: "" };
  } catch {
    return { widgets: null, error: "widgets JSON 문법이 올바르지 않습니다." };
  }
}

function isAdminLayoutWidget(value: unknown): value is AdminLayoutWidget {
  if (!value || typeof value !== "object") return false;
  const widget = value as Partial<AdminLayoutWidget>;
  return typeof widget.widget_id === "string"
    && validSlug(widget.widget_id, 80)
    && typeof widget.type === "string"
    && ADMIN_LAYOUT_WIDGET_TYPES.includes(widget.type as AdminLayoutWidgetType)
    && typeof widget.title === "string"
    && Number.isInteger(widget.order)
    && (widget.order ?? 0) >= 1
    && isRecord(widget.config)
    && isRecord(widget.style);
}

function parseObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validSlug(value: string, maxLength: number): boolean {
  return value.length > 0 && value.length <= maxLength && /^[A-Za-z0-9_-]+$/.test(value);
}

function parsePositiveInteger(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return parsed >= 1 ? parsed : null;
}
