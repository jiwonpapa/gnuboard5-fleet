import {
  composeCompositeTarget,
  type CommandContextBuilder,
  stringFromRecord,
} from "../shared";

export const operationsAccessCommandContextBuilders: Readonly<
  Record<string, CommandContextBuilder>
> = {
  "cmd_admin_permission_get_list": (payload) => ({
    area: "Admin Permissions",
    localTarget: stringFromRecord(payload?.query, "mb_id") ?? "permissions.list",
    operation: "권한 목록 조회",
  }),

  "cmd_admin_permission_save": (payload) => ({
    area: "Admin Permissions",
    localTarget: composeCompositeTarget(payload?.input, ["mb_id", "au_menu"]),
    operation: "권한 저장",
  }),

  "cmd_admin_permission_delete": (payload) => ({
    area: "Admin Permissions",
    localTarget: composeCompositeTarget(payload?.input, ["mb_id", "au_menu"]),
    operation: "권한 삭제",
  }),

  "cmd_admin_auth_get_list": (payload) => ({
    area: "Admin Auth",
    localTarget: stringFromRecord(payload?.query, "mb_id") ?? "auth.list",
    operation: "관리자 권한 묶음 조회",
  }),

  "cmd_admin_auth_upsert": (payload) => ({
    area: "Admin Auth",
    localTarget: stringFromRecord(payload?.input, "mb_id") ?? "auth.upsert",
    operation: "관리자 권한 묶음 저장",
  }),

  "cmd_admin_auth_delete_member": (payload) => ({
    area: "Admin Auth",
    localTarget: stringFromRecord(payload?.input, "mb_id") ?? "auth.delete",
    operation: "관리자 권한 일괄 삭제",
  }),
};
