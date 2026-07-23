import type { AdminLayoutDetailResponse } from "../../types/AdminLayoutDetailResponse";
import type { AdminLayoutListQuery } from "../../types/AdminLayoutListQuery";
import type { AdminLayoutListResponse } from "../../types/AdminLayoutListResponse";
import type { AdminLayoutReorderInput } from "../../types/AdminLayoutReorderInput";
import type { AdminLayoutSaveInput } from "../../types/AdminLayoutSaveInput";
import type { AdminLayoutWidgetCreateInput } from "../../types/AdminLayoutWidgetCreateInput";
import type { AdminLayoutWidgetDeleteInput } from "../../types/AdminLayoutWidgetDeleteInput";
import type { AdminLayoutWidgetUpdateInput } from "../../types/AdminLayoutWidgetUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminLayoutList(
  query?: Partial<AdminLayoutListQuery>
): Promise<AdminLayoutListResponse> {
  return invokeCommand<AdminLayoutListResponse>("cmd_admin_layout_get_list", {
    query: {
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
    },
  });
}

export async function getAdminLayout(
  pageId: string
): Promise<AdminLayoutDetailResponse> {
  return invokeCommand<AdminLayoutDetailResponse>("cmd_admin_layout_get", {
    pageId,
  });
}

export async function saveAdminLayout(
  input: AdminLayoutSaveInput
): Promise<AdminLayoutDetailResponse> {
  return invokeCommand<AdminLayoutDetailResponse>("cmd_admin_layout_save", {
    input,
  });
}

export async function addAdminLayoutWidget(
  input: AdminLayoutWidgetCreateInput
): Promise<AdminLayoutDetailResponse> {
  return invokeCommand<AdminLayoutDetailResponse>(
    "cmd_admin_layout_widget_add",
    { input }
  );
}

export async function updateAdminLayoutWidget(
  input: AdminLayoutWidgetUpdateInput
): Promise<AdminLayoutDetailResponse> {
  return invokeCommand<AdminLayoutDetailResponse>(
    "cmd_admin_layout_widget_update",
    { input }
  );
}

export async function deleteAdminLayoutWidget(
  input: AdminLayoutWidgetDeleteInput
): Promise<AdminLayoutDetailResponse> {
  return invokeCommand<AdminLayoutDetailResponse>(
    "cmd_admin_layout_widget_delete",
    { input }
  );
}

export async function reorderAdminLayoutWidgets(
  input: AdminLayoutReorderInput
): Promise<AdminLayoutDetailResponse> {
  return invokeCommand<AdminLayoutDetailResponse>("cmd_admin_layout_reorder", {
    input,
  });
}

export async function reorderLegacyAdminLayoutWidgets(
  input: AdminLayoutReorderInput
): Promise<AdminLayoutDetailResponse> {
  return invokeCommand<AdminLayoutDetailResponse>(
    "cmd_admin_layout_reorder_legacy",
    {
      input,
    }
  );
}
