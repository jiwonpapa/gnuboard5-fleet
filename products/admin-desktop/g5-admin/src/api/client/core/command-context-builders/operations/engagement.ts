import {
  type CommandContextBuilder,
  numberFromPayload,
  numberFromRecord,
  stringFromRecord,
} from "../shared";

export const operationsEngagementCommandContextBuilders: Readonly<
  Record<string, CommandContextBuilder>
> = {
  "cmd_admin_dashboard_get": () => ({
    area: "Admin Dashboard",
    localTarget: "overview.remote-dashboard",
    operation: "관리자 대시보드 조회",
  }),

  "cmd_admin_popular_get_list": (payload) => ({
    area: "Admin Popular",
    localTarget:
      stringFromRecord(payload?.query, "date_from") ??
      stringFromRecord(payload?.query, "page") ??
      "popular.list",
    operation: "인기검색어 목록 조회",
  }),

  "cmd_admin_popular_reset": (payload) => ({
    area: "Admin Popular",
    localTarget:
      stringFromRecord(payload?.input, "date_from") ??
      stringFromRecord(payload?.input, "date_to") ??
      "popular.reset",
    operation: "인기검색어 초기화",
  }),

  "cmd_admin_popular_rank_get": (payload) => ({
    area: "Admin Popular",
    localTarget: String(numberFromRecord(payload?.query, "limit") ?? 20),
    operation: "인기검색어 순위 조회",
  }),

  "cmd_admin_poll_get_list": () => ({
    area: "Admin Polls",
    localTarget: "polls.list",
    operation: "투표 목록 조회",
  }),

  "cmd_admin_poll_get": (payload) => ({
    area: "Admin Polls",
    localTarget: String(numberFromPayload(payload, "poId") ?? "-"),
    operation: "투표 상세 조회",
  }),

  "cmd_admin_poll_create": (payload) => ({
    area: "Admin Polls",
    localTarget: stringFromRecord(payload?.input, "po_subject"),
    operation: "투표 생성",
  }),

  "cmd_admin_poll_update": (payload) => ({
    area: "Admin Polls",
    localTarget: String(numberFromRecord(payload?.input, "po_id") ?? "-"),
    operation: "투표 수정",
  }),

  "cmd_admin_poll_delete": (payload) => ({
    area: "Admin Polls",
    localTarget: String(numberFromRecord(payload?.input, "po_id") ?? "-"),
    operation: "투표 삭제",
  }),

  "cmd_admin_poll_legacy_get_list": () => ({
    area: "Admin Polls",
    localTarget: "polls.list",
    operation: "투표 목록 조회 (/admin/polls)",
  }),

  "cmd_admin_poll_legacy_get": (payload) => ({
    area: "Admin Polls",
    localTarget: String(numberFromPayload(payload, "poId") ?? "-"),
    operation: "투표 상세 조회 (/admin/polls/{po_id})",
  }),

  "cmd_admin_poll_legacy_create": (payload) => ({
    area: "Admin Polls",
    localTarget: stringFromRecord(payload?.input, "po_subject"),
    operation: "투표 생성 (/admin/polls)",
  }),

  "cmd_admin_poll_legacy_update": (payload) => ({
    area: "Admin Polls",
    localTarget: String(numberFromRecord(payload?.input, "po_id") ?? "-"),
    operation: "투표 수정 (/admin/polls/{po_id})",
  }),

  "cmd_admin_poll_legacy_delete": (payload) => ({
    area: "Admin Polls",
    localTarget: String(numberFromRecord(payload?.input, "po_id") ?? "-"),
    operation: "투표 삭제 (/admin/polls/{po_id})",
  }),

  "cmd_admin_popup_get_list": () => ({
    area: "Admin Popups",
    localTarget: "popups.list",
    operation: "팝업 목록 조회",
  }),

  "cmd_admin_popup_get": (payload) => ({
    area: "Admin Popups",
    localTarget: String(numberFromPayload(payload, "nwId") ?? "-"),
    operation: "팝업 상세 조회",
  }),

  "cmd_admin_popup_create": (payload) => ({
    area: "Admin Popups",
    localTarget: stringFromRecord(payload?.input, "nw_subject"),
    operation: "팝업 생성",
  }),

  "cmd_admin_popup_update": (payload) => ({
    area: "Admin Popups",
    localTarget: String(numberFromRecord(payload?.input, "nw_id") ?? "-"),
    operation: "팝업 수정",
  }),

  "cmd_admin_popup_delete": (payload) => ({
    area: "Admin Popups",
    localTarget: String(numberFromRecord(payload?.input, "nw_id") ?? "-"),
    operation: "팝업 삭제",
  }),

  "cmd_admin_popup_legacy_get_list": () => ({
    area: "Admin Popups",
    localTarget: "popups.list",
    operation: "팝업 목록 조회 (/admin/popups)",
  }),

  "cmd_admin_popup_legacy_get": (payload) => ({
    area: "Admin Popups",
    localTarget: String(numberFromPayload(payload, "nwId") ?? "-"),
    operation: "팝업 상세 조회 (/admin/popups/{nw_id})",
  }),

  "cmd_admin_popup_legacy_create": (payload) => ({
    area: "Admin Popups",
    localTarget: stringFromRecord(payload?.input, "nw_subject"),
    operation: "팝업 생성 (/admin/popups)",
  }),

  "cmd_admin_popup_legacy_update": (payload) => ({
    area: "Admin Popups",
    localTarget: String(numberFromRecord(payload?.input, "nw_id") ?? "-"),
    operation: "팝업 수정 (/admin/popups/{nw_id})",
  }),

  "cmd_admin_popup_legacy_delete": (payload) => ({
    area: "Admin Popups",
    localTarget: String(numberFromRecord(payload?.input, "nw_id") ?? "-"),
    operation: "팝업 삭제 (/admin/popups/{nw_id})",
  }),

  "cmd_admin_qa_config_get": () => ({
    area: "Admin QA Config",
    localTarget: "qa-config",
    operation: "QA 설정 조회",
  }),

  "cmd_admin_qa_config_update": () => ({
    area: "Admin QA Config",
    localTarget: "qa-config",
    operation: "QA 설정 수정",
  }),

  "cmd_admin_qa_bulk_delete": () => ({
    area: "Admin QA",
    localTarget: "qa.bulk-delete",
    operation: "QA 일괄 삭제",
  }),
};
