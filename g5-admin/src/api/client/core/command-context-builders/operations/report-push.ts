import {
  type CommandContextBuilder,
  numberFromRecord,
  stringFromRecord,
} from "../shared";

export const operationsReportPushCommandContextBuilders: Readonly<
  Record<string, CommandContextBuilder>
> = {
  "cmd_admin_report_get_list": (payload) => ({
    area: "Admin Reports",
    localTarget:
      stringFromRecord(payload?.query, "status") ??
      stringFromRecord(payload?.query, "target_type") ??
      "reports.list",
    operation: "신고 목록 조회",
  }),

  "cmd_admin_report_stats_get": () => ({
    area: "Admin Reports",
    localTarget: "reports.stats",
    operation: "신고 통계 조회",
  }),

  "cmd_admin_report_update": (payload) => ({
    area: "Admin Reports",
    localTarget: String(numberFromRecord(payload?.input, "report_id") ?? "-"),
    operation: "신고 상태 수정",
  }),

  "cmd_admin_push_message_create": (payload) => ({
    area: "Admin Push",
    localTarget:
      stringFromRecord(payload?.input, "target") ??
      stringFromRecord(payload?.input, "type") ??
      "push.message",
    operation: "푸시 큐 등록",
  }),

  "cmd_admin_push_send": (payload) => ({
    area: "Admin Push",
    localTarget:
      stringFromRecord(payload?.input, "target") ??
      stringFromRecord(payload?.input, "type") ??
      "push.send",
    operation: "레거시 푸시 발송",
  }),
};
