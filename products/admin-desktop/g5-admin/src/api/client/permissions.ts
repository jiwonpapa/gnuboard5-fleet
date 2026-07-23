import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminAuthDeleteInput } from "../../types/AdminAuthDeleteInput";
import type { AdminAuthListQuery } from "../../types/AdminAuthListQuery";
import type { AdminAuthListResponse } from "../../types/AdminAuthListResponse";
import type { AdminAuthUpsertInput } from "../../types/AdminAuthUpsertInput";
import type { AdminAuthUpsertResponse } from "../../types/AdminAuthUpsertResponse";
import type { AdminPermissionDeleteInput } from "../../types/AdminPermissionDeleteInput";
import type { AdminPermissionListQuery } from "../../types/AdminPermissionListQuery";
import type { AdminPermissionListResponse } from "../../types/AdminPermissionListResponse";
import type { AdminPermissionSaveInput } from "../../types/AdminPermissionSaveInput";
import type { AdminPermissionSaveResponse } from "../../types/AdminPermissionSaveResponse";
import { invokeCommand } from "./core";

export async function getAdminPermissionList(
  query?: Partial<AdminPermissionListQuery>,
): Promise<AdminPermissionListResponse> {
  return invokeCommand<AdminPermissionListResponse>(
    "cmd_admin_permission_get_list",
    {
      query: {
        mb_id: query?.mb_id ?? null,
        page: query?.page ?? 1,
        per_page: query?.per_page ?? 20,
      },
    },
  );
}

export async function saveAdminPermission(
  input: AdminPermissionSaveInput,
): Promise<AdminPermissionSaveResponse> {
  return invokeCommand<AdminPermissionSaveResponse>("cmd_admin_permission_save", {
    input,
  });
}

export async function deleteAdminPermission(
  input: AdminPermissionDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_permission_delete", { input });
}

export async function getAdminAuthList(
  query?: Partial<AdminAuthListQuery>,
): Promise<AdminAuthListResponse> {
  return invokeCommand<AdminAuthListResponse>("cmd_admin_auth_get_list", {
    query: {
      date_from: query?.date_from ?? null,
      date_to: query?.date_to ?? null,
      mb_id: query?.mb_id ?? null,
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
    },
  });
}

export async function upsertAdminAuth(
  input: AdminAuthUpsertInput,
): Promise<AdminAuthUpsertResponse> {
  return invokeCommand<AdminAuthUpsertResponse>("cmd_admin_auth_upsert", { input });
}

export async function deleteAdminAuthMember(
  input: AdminAuthDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_auth_delete_member", { input });
}
