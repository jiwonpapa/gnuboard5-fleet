import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminMenuCreateInput } from "../../types/AdminMenuCreateInput";
import type { AdminMenuDeleteInput } from "../../types/AdminMenuDeleteInput";
import type { AdminMenuDetailResponse } from "../../types/AdminMenuDetailResponse";
import type { AdminMenuListResponse } from "../../types/AdminMenuListResponse";
import type { AdminMenuReorderInput } from "../../types/AdminMenuReorderInput";
import type { AdminMenuReorderResponse } from "../../types/AdminMenuReorderResponse";
import type { AdminMenuUpdateInput } from "../../types/AdminMenuUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminMenuList(): Promise<AdminMenuListResponse> {
  return invokeCommand<AdminMenuListResponse>("cmd_admin_menu_get_list");
}

export async function getAdminMenu(
  meId: number
): Promise<AdminMenuDetailResponse> {
  return invokeCommand<AdminMenuDetailResponse>("cmd_admin_menu_get", { meId });
}

export async function createAdminMenu(
  input: AdminMenuCreateInput
): Promise<AdminMenuDetailResponse> {
  return invokeCommand<AdminMenuDetailResponse>("cmd_admin_menu_create", {
    input,
  });
}

export async function updateAdminMenu(
  input: AdminMenuUpdateInput
): Promise<AdminMenuDetailResponse> {
  return invokeCommand<AdminMenuDetailResponse>("cmd_admin_menu_update", {
    input,
  });
}

export async function deleteAdminMenu(
  input: AdminMenuDeleteInput
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_menu_delete", { input });
}

export async function reorderAdminMenus(
  input: AdminMenuReorderInput
): Promise<AdminMenuReorderResponse> {
  return invokeCommand<AdminMenuReorderResponse>("cmd_admin_menu_reorder", {
    input,
  });
}

export async function reorderLegacyAdminMenus(
  input: AdminMenuReorderInput
): Promise<AdminMenuReorderResponse> {
  return invokeCommand<AdminMenuReorderResponse>(
    "cmd_admin_menu_reorder_legacy",
    {
      input,
    }
  );
}
