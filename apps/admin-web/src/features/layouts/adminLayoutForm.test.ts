import { describe, expect, it } from "vitest";

import {
  buildAdminLayoutSave,
  buildAdminLayoutWidgetUpdate,
  layoutToDraft,
  parseAdminLayoutSchema,
  validateAdminLayoutDraft,
  widgetToDraft,
} from "./adminLayoutForm";

const widget = {
  widget_id: "hero",
  type: "html_block" as const,
  title: "Hero",
  order: 1,
  config: { html: "<p>Fleet</p>" },
  style: {},
};

describe("admin layout form", () => {
  it("reuses the legacy schema editor but fails closed for malformed widgets", () => {
    const detail = {
      sl_id: 1,
      sl_page_id: "dashboard-main",
      sl_title: "대시보드",
      sl_schema: JSON.stringify({ widgets: [widget] }),
      sl_active: 1,
      sl_datetime: "2026-08-18 00:00:00",
      sl_updated: "2026-08-18 00:00:00",
    };
    expect(parseAdminLayoutSchema(detail.sl_schema)).toEqual([widget]);
    expect(parseAdminLayoutSchema(JSON.stringify({
      widgets: [{ ...widget, config: [], style: [] }],
    }))).toEqual([{ ...widget, config: {} }]);
    expect(buildAdminLayoutSave(layoutToDraft(detail))).toEqual({
      title: "대시보드",
      widgets: [widget],
    });

    const invalid = { ...layoutToDraft(detail), widgetsJson: '[{"widget_id":"bad space"}]' };
    expect(validateAdminLayoutDraft(invalid)).toContain(
      "각 위젯의 ID·유형·순서·config·style을 확인하십시오.",
    );
    expect(buildAdminLayoutSave(invalid)).toBeNull();
  });

  it("sends only changed widget fields", () => {
    const draft = { ...widgetToDraft(widget), title: "새 Hero" };
    expect(buildAdminLayoutWidgetUpdate(widget, draft)).toEqual({ title: "새 Hero" });
    expect(buildAdminLayoutWidgetUpdate(widget, widgetToDraft(widget))).toBeNull();
  });
});
