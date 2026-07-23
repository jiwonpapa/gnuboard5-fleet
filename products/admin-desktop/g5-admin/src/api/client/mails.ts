import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminMailDetailResponse } from "../../types/AdminMailDetailResponse";
import type { AdminMailListQuery } from "../../types/AdminMailListQuery";
import type { AdminMailListResponse } from "../../types/AdminMailListResponse";
import type { AdminMailRecipientListResponse } from "../../types/AdminMailRecipientListResponse";
import type { AdminMailRecipientQuery } from "../../types/AdminMailRecipientQuery";
import type { AdminMailSendInput } from "../../types/AdminMailSendInput";
import type { AdminMailSendResponse } from "../../types/AdminMailSendResponse";
import type { AdminMailTemplateCreateInput } from "../../types/AdminMailTemplateCreateInput";
import type { AdminMailTemplateDeleteInput } from "../../types/AdminMailTemplateDeleteInput";
import type { AdminMailTemplateUpdateInput } from "../../types/AdminMailTemplateUpdateInput";
import type { AdminSystemMailListQuery } from "../../types/AdminSystemMailListQuery";
import type { AdminSystemMailRecipientListResponse } from "../../types/AdminSystemMailRecipientListResponse";
import type { AdminSystemMailRecipientQuery } from "../../types/AdminSystemMailRecipientQuery";
import type { AdminSystemMailSendRequest } from "../../types/AdminSystemMailSendRequest";
import type { AdminSystemMailSendResponse } from "../../types/AdminSystemMailSendResponse";
import type { AdminSystemMailTemplateListResponse } from "../../types/AdminSystemMailTemplateListResponse";
import { invokeCommand } from "./core";

export async function getAdminSystemMailTemplateList(
  query?: Partial<AdminSystemMailListQuery>,
): Promise<AdminSystemMailTemplateListResponse> {
  return invokeCommand<AdminSystemMailTemplateListResponse>(
    "cmd_admin_system_mail_get_list",
    {
      query: {
        page: query?.page ?? 1,
        per_page: query?.per_page ?? 20,
      },
    },
  );
}

export async function getAdminSystemMailRecipients(
  query?: Partial<AdminSystemMailRecipientQuery>,
): Promise<AdminSystemMailRecipientListResponse> {
  return invokeCommand<AdminSystemMailRecipientListResponse>(
    "cmd_admin_system_mail_recipients_get",
    {
      query: {
        page: query?.page ?? 1,
        per_page: query?.per_page ?? 20,
        search: query?.search ?? null,
      },
    },
  );
}

export async function sendAdminSystemMail(
  input: AdminSystemMailSendRequest,
): Promise<AdminSystemMailSendResponse> {
  return invokeCommand<AdminSystemMailSendResponse>("cmd_admin_system_mail_send", {
    input,
  });
}

export async function getAdminMailTemplateList(
  query?: Partial<AdminMailListQuery>,
): Promise<AdminMailListResponse> {
  return invokeCommand<AdminMailListResponse>("cmd_admin_mail_get_list", {
    query: {
      page: query?.page ?? 1,
      per_page: query?.per_page ?? 20,
    },
  });
}

export async function getAdminMailTemplate(
  maId: number,
): Promise<AdminMailDetailResponse> {
  return invokeCommand<AdminMailDetailResponse>("cmd_admin_mail_get", { maId });
}

export async function createAdminMailTemplate(
  input: AdminMailTemplateCreateInput,
): Promise<AdminMailDetailResponse> {
  return invokeCommand<AdminMailDetailResponse>("cmd_admin_mail_create", { input });
}

export async function updateAdminMailTemplate(
  input: AdminMailTemplateUpdateInput,
): Promise<AdminMailDetailResponse> {
  return invokeCommand<AdminMailDetailResponse>("cmd_admin_mail_update", { input });
}

export async function deleteAdminMailTemplate(
  input: AdminMailTemplateDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_mail_delete", { input });
}

export async function getAdminMailRecipients(
  query?: Partial<AdminMailRecipientQuery>,
): Promise<AdminMailRecipientListResponse> {
  return invokeCommand<AdminMailRecipientListResponse>(
    "cmd_admin_mail_recipients_get",
    {
      query: {
        email_contains: query?.email_contains ?? null,
        gr_id: query?.gr_id ?? null,
        level_max: query?.level_max ?? null,
        level_min: query?.level_min ?? null,
        mailling_only: query?.mailling_only ?? true,
        member_id_from: query?.member_id_from ?? null,
        member_id_to: query?.member_id_to ?? null,
        page: query?.page ?? 1,
        per_page: query?.per_page ?? 20,
        search: query?.search ?? null,
      },
    },
  );
}

export async function sendAdminMail(
  input: AdminMailSendInput,
): Promise<AdminMailSendResponse> {
  return invokeCommand<AdminMailSendResponse>("cmd_admin_mail_send", { input });
}
