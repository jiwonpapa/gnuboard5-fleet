import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminBoardCopyInput } from "../../types/AdminBoardCopyInput";
import type { AdminBoardCreateInput } from "../../types/AdminBoardCreateInput";
import type { AdminBoardDeleteInput } from "../../types/AdminBoardDeleteInput";
import type { AdminBoardDetailResponse } from "../../types/AdminBoardDetailResponse";
import type { AdminBoardListQuery } from "../../types/AdminBoardListQuery";
import type { AdminBoardListResponse } from "../../types/AdminBoardListResponse";
import type { AdminBoardNewPostDeleteInput } from "../../types/AdminBoardNewPostDeleteInput";
import type { AdminBoardNewPostDeleteResponse } from "../../types/AdminBoardNewPostDeleteResponse";
import type { AdminBoardUpdateInput } from "../../types/AdminBoardUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminBoardList(
  query?: Partial<AdminBoardListQuery>,
): Promise<AdminBoardListResponse> {
  return invokeCommand<AdminBoardListResponse>("cmd_admin_board_get_list", {
    query: {
      gr_id: query?.gr_id ?? null,
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
      search: query?.search ?? null,
    },
  });
}

export async function getAdminBoard(
  boTable: string,
): Promise<AdminBoardDetailResponse> {
  return invokeCommand<AdminBoardDetailResponse>("cmd_admin_board_get", {
    boTable,
  });
}

export async function createAdminBoard(
  input: AdminBoardCreateInput,
): Promise<AdminBoardDetailResponse> {
  return invokeCommand<AdminBoardDetailResponse>("cmd_admin_board_create", {
    input,
  });
}

export async function updateAdminBoard(
  input: AdminBoardUpdateInput,
): Promise<AdminBoardDetailResponse> {
  return invokeCommand<AdminBoardDetailResponse>("cmd_admin_board_update", {
    input,
  });
}

export async function deleteAdminBoard(
  input: AdminBoardDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_board_delete", { input });
}

export async function copyAdminBoard(
  input: AdminBoardCopyInput,
): Promise<AdminBoardDetailResponse> {
  return invokeCommand<AdminBoardDetailResponse>("cmd_admin_board_copy", { input });
}

export async function deleteAdminBoardNewPosts(
  input: AdminBoardNewPostDeleteInput,
): Promise<AdminBoardNewPostDeleteResponse> {
  return invokeCommand<AdminBoardNewPostDeleteResponse>("cmd_admin_board_new_posts_delete", {
    input,
  });
}
