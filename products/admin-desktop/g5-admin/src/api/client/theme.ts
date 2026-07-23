import type { AdminThemeConfigResponse } from "../../types/AdminThemeConfigResponse";
import type { AdminThemeConfigUpdateInput } from "../../types/AdminThemeConfigUpdateInput";
import type { AdminThemeDetailResponse } from "../../types/AdminThemeDetailResponse";
import type { AdminThemeListResponse } from "../../types/AdminThemeListResponse";
import { invokeCommand } from "./core";

export async function getAdminThemeConfig(): Promise<AdminThemeConfigResponse> {
  return invokeCommand<AdminThemeConfigResponse>("cmd_admin_theme_config_get");
}

export async function updateAdminThemeConfig(
  input: Partial<AdminThemeConfigUpdateInput>,
): Promise<AdminThemeConfigResponse> {
  return invokeCommand<AdminThemeConfigResponse>("cmd_admin_theme_config_update", {
    input,
  });
}

export async function getAdminThemeList(): Promise<AdminThemeListResponse> {
  return invokeCommand<AdminThemeListResponse>("cmd_admin_theme_get_list");
}

export async function getAdminTheme(
  theme: string,
): Promise<AdminThemeDetailResponse> {
  return invokeCommand<AdminThemeDetailResponse>("cmd_admin_theme_get", { theme });
}
