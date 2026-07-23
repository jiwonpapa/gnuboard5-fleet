import type { AdminBrowscapConvertInput } from "../../types/AdminBrowscapConvertInput";
import type { AdminBrowscapConvertResponse } from "../../types/AdminBrowscapConvertResponse";
import type { AdminBrowscapStatusResponse } from "../../types/AdminBrowscapStatusResponse";
import type { AdminPhpInfoResponse } from "../../types/AdminPhpInfoResponse";
import { invokeCommand } from "./core";

export async function getAdminPhpInfo(): Promise<AdminPhpInfoResponse> {
  return invokeCommand<AdminPhpInfoResponse>("cmd_admin_phpinfo_get");
}

export async function getAdminBrowscapStatus(): Promise<AdminBrowscapStatusResponse> {
  return invokeCommand<AdminBrowscapStatusResponse>("cmd_admin_browscap_status_get");
}

export async function updateAdminBrowscap(): Promise<AdminBrowscapStatusResponse> {
  return invokeCommand<AdminBrowscapStatusResponse>("cmd_admin_browscap_update");
}

export async function convertAdminBrowscap(
  input: AdminBrowscapConvertInput,
): Promise<AdminBrowscapConvertResponse> {
  return invokeCommand<AdminBrowscapConvertResponse>("cmd_admin_browscap_convert", {
    input,
  });
}
