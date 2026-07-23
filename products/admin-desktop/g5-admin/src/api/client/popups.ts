import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminPopupCreateInput } from "../../types/AdminPopupCreateInput";
import type { AdminPopupDeleteInput } from "../../types/AdminPopupDeleteInput";
import type { AdminPopupDetailResponse } from "../../types/AdminPopupDetailResponse";
import type { AdminPopupListQuery } from "../../types/AdminPopupListQuery";
import type { AdminPopupListResponse } from "../../types/AdminPopupListResponse";
import type { AdminPopupUpdateInput } from "../../types/AdminPopupUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminPopupList(
  query?: Partial<AdminPopupListQuery>
): Promise<AdminPopupListResponse> {
  return invokeCommand<AdminPopupListResponse>("cmd_admin_popup_get_list", {
    query: {
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
    },
  });
}

export async function getAdminPopup(
  nwId: number
): Promise<AdminPopupDetailResponse> {
  return invokeCommand<AdminPopupDetailResponse>("cmd_admin_popup_get", {
    nwId,
  });
}

export async function createAdminPopup(
  input: AdminPopupCreateInput
): Promise<AdminPopupDetailResponse> {
  return invokeCommand<AdminPopupDetailResponse>("cmd_admin_popup_create", {
    input,
  });
}

export async function updateAdminPopup(
  input: AdminPopupUpdateInput
): Promise<AdminPopupDetailResponse> {
  return invokeCommand<AdminPopupDetailResponse>("cmd_admin_popup_update", {
    input,
  });
}

export async function deleteAdminPopup(
  input: AdminPopupDeleteInput
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_popup_delete", { input });
}

export async function getLegacyAdminPopupList(
  query?: Partial<AdminPopupListQuery>
): Promise<AdminPopupListResponse> {
  return invokeCommand<AdminPopupListResponse>(
    "cmd_admin_popup_legacy_get_list",
    {
      query: {
        page: query?.page ?? 1,
        per_page: query?.per_page ?? 20,
      },
    }
  );
}

export async function getLegacyAdminPopup(
  nwId: number
): Promise<AdminPopupDetailResponse> {
  return invokeCommand<AdminPopupDetailResponse>("cmd_admin_popup_legacy_get", {
    nwId,
  });
}

export async function createLegacyAdminPopup(
  input: AdminPopupCreateInput
): Promise<AdminPopupDetailResponse> {
  return invokeCommand<AdminPopupDetailResponse>(
    "cmd_admin_popup_legacy_create",
    { input }
  );
}

export async function updateLegacyAdminPopup(
  input: AdminPopupUpdateInput
): Promise<AdminPopupDetailResponse> {
  return invokeCommand<AdminPopupDetailResponse>(
    "cmd_admin_popup_legacy_update",
    { input }
  );
}

export async function deleteLegacyAdminPopup(
  input: AdminPopupDeleteInput
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_popup_legacy_delete", {
    input,
  });
}
