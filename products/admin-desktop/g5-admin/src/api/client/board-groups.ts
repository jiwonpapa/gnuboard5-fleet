import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminBoardGroupCreateInput } from "../../types/AdminBoardGroupCreateInput";
import type { AdminBoardGroupDeleteInput } from "../../types/AdminBoardGroupDeleteInput";
import type { AdminBoardGroupDetailResponse } from "../../types/AdminBoardGroupDetailResponse";
import type { AdminBoardGroupListResponse } from "../../types/AdminBoardGroupListResponse";
import type { AdminBoardGroupMemberAddInput } from "../../types/AdminBoardGroupMemberAddInput";
import type { AdminBoardGroupMemberDeleteInput } from "../../types/AdminBoardGroupMemberDeleteInput";
import type { AdminBoardGroupMemberListQuery } from "../../types/AdminBoardGroupMemberListQuery";
import type { AdminBoardGroupMemberListResponse } from "../../types/AdminBoardGroupMemberListResponse";
import type { AdminBoardGroupMemberResponse } from "../../types/AdminBoardGroupMemberResponse";
import type { AdminBoardGroupUpdateInput } from "../../types/AdminBoardGroupUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminBoardGroupList(): Promise<AdminBoardGroupListResponse> {
  return invokeCommand<AdminBoardGroupListResponse>(
    "cmd_admin_board_group_get_list"
  );
}

export async function getAdminBoardGroup(
  grId: string
): Promise<AdminBoardGroupDetailResponse> {
  return invokeCommand<AdminBoardGroupDetailResponse>(
    "cmd_admin_board_group_get",
    {
      gr_id: grId,
    }
  );
}

export async function createAdminBoardGroup(
  input: AdminBoardGroupCreateInput
): Promise<AdminBoardGroupDetailResponse> {
  return invokeCommand<AdminBoardGroupDetailResponse>(
    "cmd_admin_board_group_create",
    { input }
  );
}

export async function updateAdminBoardGroup(
  input: AdminBoardGroupUpdateInput
): Promise<AdminBoardGroupDetailResponse> {
  return invokeCommand<AdminBoardGroupDetailResponse>(
    "cmd_admin_board_group_update",
    { input }
  );
}

export async function patchAdminBoardGroup(
  input: AdminBoardGroupUpdateInput
): Promise<AdminBoardGroupDetailResponse> {
  return invokeCommand<AdminBoardGroupDetailResponse>(
    "cmd_admin_board_group_patch",
    { input }
  );
}

export async function deleteAdminBoardGroup(
  input: AdminBoardGroupDeleteInput
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_board_group_delete", {
    input,
  });
}

export async function getAdminBoardGroupMembers(
  query: AdminBoardGroupMemberListQuery
): Promise<AdminBoardGroupMemberListResponse> {
  return invokeCommand<AdminBoardGroupMemberListResponse>(
    "cmd_admin_board_group_members_get",
    {
      query,
    }
  );
}

export async function addAdminBoardGroupMember(
  input: AdminBoardGroupMemberAddInput
): Promise<AdminBoardGroupMemberResponse> {
  return invokeCommand<AdminBoardGroupMemberResponse>(
    "cmd_admin_board_group_member_add",
    { input }
  );
}

export async function deleteAdminBoardGroupMember(
  input: AdminBoardGroupMemberDeleteInput
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_board_group_member_delete", {
    input,
  });
}

export async function getLegacyAdminGroupList(): Promise<AdminBoardGroupListResponse> {
  return invokeCommand<AdminBoardGroupListResponse>(
    "cmd_admin_group_legacy_get_list"
  );
}

export async function getLegacyAdminGroup(
  grId: string
): Promise<AdminBoardGroupDetailResponse> {
  return invokeCommand<AdminBoardGroupDetailResponse>(
    "cmd_admin_group_legacy_get",
    {
      grId,
    }
  );
}

export async function createLegacyAdminGroup(
  input: AdminBoardGroupCreateInput
): Promise<AdminBoardGroupDetailResponse> {
  return invokeCommand<AdminBoardGroupDetailResponse>(
    "cmd_admin_group_legacy_create",
    {
      input,
    }
  );
}

export async function updateLegacyAdminGroup(
  input: AdminBoardGroupUpdateInput
): Promise<AdminBoardGroupDetailResponse> {
  return invokeCommand<AdminBoardGroupDetailResponse>(
    "cmd_admin_group_legacy_update",
    {
      input,
    }
  );
}

export async function deleteLegacyAdminGroup(
  input: AdminBoardGroupDeleteInput
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_group_legacy_delete", {
    input,
  });
}

export async function getLegacyAdminGroupMembers(
  query: AdminBoardGroupMemberListQuery
): Promise<AdminBoardGroupMemberListResponse> {
  return invokeCommand<AdminBoardGroupMemberListResponse>(
    "cmd_admin_group_legacy_members_get",
    { query }
  );
}

export async function addLegacyAdminGroupMember(
  input: AdminBoardGroupMemberAddInput
): Promise<AdminBoardGroupMemberResponse> {
  return invokeCommand<AdminBoardGroupMemberResponse>(
    "cmd_admin_group_legacy_member_add",
    { input }
  );
}

export async function deleteLegacyAdminGroupMember(
  input: AdminBoardGroupMemberDeleteInput
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_group_legacy_member_delete", {
    input,
  });
}
