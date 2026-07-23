import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminMemberDeleteInput } from "../../types/AdminMemberDeleteInput";
import type { AdminMemberDetailResponse } from "../../types/AdminMemberDetailResponse";
import type { AdminMemberLevelUpdateInput } from "../../types/AdminMemberLevelUpdateInput";
import type { AdminMemberListQuery } from "../../types/AdminMemberListQuery";
import type { AdminMemberListResponse } from "../../types/AdminMemberListResponse";
import type { AdminMemberMediaResponse } from "../../types/AdminMemberMediaResponse";
import type { AdminMemberMediaUploadInput } from "../../types/AdminMemberMediaUploadInput";
import type { AdminMemberUpdateInput } from "../../types/AdminMemberUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminMemberList(
  query?: Partial<AdminMemberListQuery>,
): Promise<AdminMemberListResponse> {
  return invokeCommand<AdminMemberListResponse>("cmd_admin_member_get_list", {
    query: {
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
      search: query?.search ?? null,
      search_field: query?.search_field ?? null,
    },
  });
}

export async function exportAdminMembersExcel(
  query?: Partial<AdminMemberListQuery>,
): Promise<AdminMemberListResponse> {
  return invokeCommand<AdminMemberListResponse>("cmd_admin_member_export_excel", {
    query: {
      page: 1,
      per_page: query?.per_page ?? 100,
      search: query?.search ?? null,
      search_field: query?.search_field ?? null,
    },
  });
}

export async function getAdminMember(
  mbId: string,
): Promise<AdminMemberDetailResponse> {
  return invokeCommand<AdminMemberDetailResponse>("cmd_admin_member_get", {
    mbId,
  });
}

export async function updateAdminMemberLevel(
  input: AdminMemberLevelUpdateInput,
): Promise<AdminMemberDetailResponse> {
  return invokeCommand<AdminMemberDetailResponse>(
    "cmd_admin_member_update_level",
    { input },
  );
}

export async function updateAdminMember(
  input: AdminMemberUpdateInput,
): Promise<AdminMemberDetailResponse> {
  return invokeCommand<AdminMemberDetailResponse>("cmd_admin_member_update", {
    input,
  });
}

export async function deleteAdminMember(
  input: AdminMemberDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_member_delete", { input });
}

export async function uploadAdminMemberIcon(
  input: AdminMemberMediaUploadInput,
): Promise<AdminMemberMediaResponse> {
  return invokeCommand<AdminMemberMediaResponse>("cmd_admin_member_icon_upload", { input });
}

export async function deleteAdminMemberIcon(
  mbId: string,
): Promise<AdminMemberMediaResponse> {
  return invokeCommand<AdminMemberMediaResponse>("cmd_admin_member_icon_delete", { mbId });
}

export async function uploadAdminMemberImage(
  input: AdminMemberMediaUploadInput,
): Promise<AdminMemberMediaResponse> {
  return invokeCommand<AdminMemberMediaResponse>("cmd_admin_member_image_upload", { input });
}

export async function deleteAdminMemberImage(
  mbId: string,
): Promise<AdminMemberMediaResponse> {
  return invokeCommand<AdminMemberMediaResponse>("cmd_admin_member_image_delete", { mbId });
}
