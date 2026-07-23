import type { AdminQaConfigResponse } from "../../types/AdminQaConfigResponse";
import type { AdminQaConfigUpdateInput } from "../../types/AdminQaConfigUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminQaConfig(): Promise<AdminQaConfigResponse> {
  return invokeCommand<AdminQaConfigResponse>("cmd_admin_qa_config_get");
}

export async function updateAdminQaConfig(
  input: AdminQaConfigUpdateInput,
): Promise<AdminQaConfigResponse> {
  return invokeCommand<AdminQaConfigResponse>("cmd_admin_qa_config_update", {
    input,
  });
}
