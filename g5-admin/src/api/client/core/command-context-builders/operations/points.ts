import {
  type CommandContextBuilder,
  stringFromPayload,
  stringFromRecord,
} from "../shared";

export const operationsPointCommandContextBuilders: Readonly<
  Record<string, CommandContextBuilder>
> = {
  "cmd_admin_point_get_list": (payload) => ({
    area: "Admin Points",
    localTarget:
      stringFromRecord(payload?.query, "mb_id") ??
      stringFromRecord(payload?.query, "search") ??
      "points.list",
    operation: "포인트 내역 조회",
  }),

  "cmd_admin_point_summary_get": (payload) => ({
    area: "Admin Points",
    localTarget: stringFromPayload(payload, "mbId") ?? "points.summary",
    operation: "포인트 합계 조회",
  }),

  "cmd_admin_point_grant": (payload) => ({
    area: "Admin Points",
    localTarget: stringFromRecord(payload?.input, "mb_id"),
    operation: "포인트 지급",
  }),

  "cmd_admin_point_grant_legacy": (payload) => ({
    area: "Admin Points",
    localTarget: stringFromRecord(payload?.input, "mb_id"),
    operation: "포인트 지급 (/admin/points/grant)",
  }),

  "cmd_admin_point_deduct": (payload) => ({
    area: "Admin Points",
    localTarget: stringFromRecord(payload?.input, "mb_id"),
    operation: "포인트 차감",
  }),

  "cmd_admin_point_deduct_legacy": (payload) => ({
    area: "Admin Points",
    localTarget: stringFromRecord(payload?.input, "mb_id"),
    operation: "포인트 차감 (/admin/points/deduct)",
  }),

  "cmd_admin_point_delete": () => ({
    area: "Admin Points",
    localTarget: "points.delete",
    operation: "포인트 내역 삭제",
  }),

  "cmd_admin_point_expire": (payload) => ({
    area: "Admin Points",
    localTarget:
      stringFromRecord(payload?.input, "base_date") ?? "points.expire",
    operation: "포인트 만료 처리",
  }),

  "cmd_admin_point_expire_legacy": (payload) => ({
    area: "Admin Points",
    localTarget:
      stringFromRecord(payload?.input, "base_date") ?? "points.expire",
    operation: "포인트 만료 처리 (/admin/points/expire)",
  }),
};
