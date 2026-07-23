import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminContentCreateInput } from "../../types/AdminContentCreateInput";
import type { AdminContentDeleteInput } from "../../types/AdminContentDeleteInput";
import type { AdminContentDetailResponse } from "../../types/AdminContentDetailResponse";
import type { AdminContentListQuery } from "../../types/AdminContentListQuery";
import type { AdminContentListResponse } from "../../types/AdminContentListResponse";
import type { AdminContentUpdateInput } from "../../types/AdminContentUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminContentList(
  query: AdminContentListQuery,
): Promise<AdminContentListResponse> {
  return invokeCommand<AdminContentListResponse>("cmd_admin_content_get_list", {
    query,
  });
}

export async function getAdminContent(
  coId: string,
): Promise<AdminContentDetailResponse> {
  return invokeCommand<AdminContentDetailResponse>("cmd_admin_content_get", {
    co_id: coId,
  });
}

export async function createAdminContent(
  input: AdminContentCreateInput,
): Promise<AdminContentDetailResponse> {
  return invokeCommand<AdminContentDetailResponse>("cmd_admin_content_create", {
    input,
  });
}

export async function updateAdminContent(
  input: AdminContentUpdateInput,
): Promise<AdminContentDetailResponse> {
  return invokeCommand<AdminContentDetailResponse>("cmd_admin_content_update", {
    input,
  });
}

export async function deleteAdminContent(
  input: AdminContentDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_content_delete", {
    input,
  });
}
