import type { AdminSmsConfigResponse } from "../../types/AdminSmsConfigResponse";
import type { AdminSmsConfigUpdateInput } from "../../types/AdminSmsConfigUpdateInput";
import type { AdminSmsMemberSyncResponse } from "../../types/AdminSmsMemberSyncResponse";
import { invokeCommand } from "./core";

export async function getAdminSmsConfig(): Promise<AdminSmsConfigResponse> {
  return invokeCommand<AdminSmsConfigResponse>("cmd_admin_sms_config_get");
}

export async function updateAdminSmsConfig(
  input: Partial<AdminSmsConfigUpdateInput>,
): Promise<AdminSmsConfigResponse> {
  return invokeCommand<AdminSmsConfigResponse>("cmd_admin_sms_config_update", {
    input,
  });
}

export async function syncAdminSmsMembers(): Promise<AdminSmsMemberSyncResponse> {
  return invokeCommand<AdminSmsMemberSyncResponse>("cmd_admin_sms_member_sync");
}
