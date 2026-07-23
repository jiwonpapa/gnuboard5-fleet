import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminPollCreateInput } from "../../types/AdminPollCreateInput";
import type { AdminPollDeleteInput } from "../../types/AdminPollDeleteInput";
import type { AdminPollDetailResponse } from "../../types/AdminPollDetailResponse";
import type { AdminPollListQuery } from "../../types/AdminPollListQuery";
import type { AdminPollListResponse } from "../../types/AdminPollListResponse";
import type { AdminPollUpdateInput } from "../../types/AdminPollUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminPollList(
  query?: Partial<AdminPollListQuery>
): Promise<AdminPollListResponse> {
  return invokeCommand<AdminPollListResponse>("cmd_admin_poll_get_list", {
    query: {
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
    },
  });
}

export async function getAdminPoll(
  poId: number
): Promise<AdminPollDetailResponse> {
  return invokeCommand<AdminPollDetailResponse>("cmd_admin_poll_get", { poId });
}

export async function createAdminPoll(
  input: AdminPollCreateInput
): Promise<AdminPollDetailResponse> {
  return invokeCommand<AdminPollDetailResponse>("cmd_admin_poll_create", {
    input,
  });
}

export async function updateAdminPoll(
  input: AdminPollUpdateInput
): Promise<AdminPollDetailResponse> {
  return invokeCommand<AdminPollDetailResponse>("cmd_admin_poll_update", {
    input,
  });
}

export async function deleteAdminPoll(
  input: AdminPollDeleteInput
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_poll_delete", { input });
}

export async function getLegacyAdminPollList(
  query?: Partial<AdminPollListQuery>
): Promise<AdminPollListResponse> {
  return invokeCommand<AdminPollListResponse>(
    "cmd_admin_poll_legacy_get_list",
    {
      query: {
        page: query?.page ?? 1,
        per_page: query?.per_page ?? 20,
      },
    }
  );
}

export async function getLegacyAdminPoll(
  poId: number
): Promise<AdminPollDetailResponse> {
  return invokeCommand<AdminPollDetailResponse>("cmd_admin_poll_legacy_get", {
    poId,
  });
}

export async function createLegacyAdminPoll(
  input: AdminPollCreateInput
): Promise<AdminPollDetailResponse> {
  return invokeCommand<AdminPollDetailResponse>(
    "cmd_admin_poll_legacy_create",
    { input }
  );
}

export async function updateLegacyAdminPoll(
  input: AdminPollUpdateInput
): Promise<AdminPollDetailResponse> {
  return invokeCommand<AdminPollDetailResponse>(
    "cmd_admin_poll_legacy_update",
    { input }
  );
}

export async function deleteLegacyAdminPoll(
  input: AdminPollDeleteInput
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_poll_legacy_delete", {
    input,
  });
}
