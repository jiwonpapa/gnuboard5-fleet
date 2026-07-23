import type { AdminConfigResponse } from "../../types/AdminConfigResponse";
import type { AdminConfigUpdateInput } from "../../types/AdminConfigUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminConfig(): Promise<AdminConfigResponse> {
  return invokeCommand<AdminConfigResponse>("cmd_admin_config_get");
}

export async function updateAdminConfig(
  input: Partial<AdminConfigUpdateInput>,
): Promise<AdminConfigResponse> {
  return invokeCommand<AdminConfigResponse>("cmd_admin_config_update", {
    input,
  });
}
