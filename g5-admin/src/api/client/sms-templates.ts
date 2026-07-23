import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminSmsTemplateBatchInput } from "../../types/AdminSmsTemplateBatchInput";
import type { AdminSmsTemplateBatchResponse } from "../../types/AdminSmsTemplateBatchResponse";
import type { AdminSmsTemplateCreateInput } from "../../types/AdminSmsTemplateCreateInput";
import type { AdminSmsTemplateDeleteInput } from "../../types/AdminSmsTemplateDeleteInput";
import type { AdminSmsTemplateDetailResponse } from "../../types/AdminSmsTemplateDetailResponse";
import type { AdminSmsTemplateGroupClearResponse } from "../../types/AdminSmsTemplateGroupClearResponse";
import type { AdminSmsTemplateGroupCreateInput } from "../../types/AdminSmsTemplateGroupCreateInput";
import type { AdminSmsTemplateGroupDeleteInput } from "../../types/AdminSmsTemplateGroupDeleteInput";
import type { AdminSmsTemplateGroupDetailResponse } from "../../types/AdminSmsTemplateGroupDetailResponse";
import type { AdminSmsTemplateGroupListResponse } from "../../types/AdminSmsTemplateGroupListResponse";
import type { AdminSmsTemplateGroupMoveInput } from "../../types/AdminSmsTemplateGroupMoveInput";
import type { AdminSmsTemplateGroupMoveResponse } from "../../types/AdminSmsTemplateGroupMoveResponse";
import type { AdminSmsTemplateGroupUpdateInput } from "../../types/AdminSmsTemplateGroupUpdateInput";
import type { AdminSmsTemplateListQuery } from "../../types/AdminSmsTemplateListQuery";
import type { AdminSmsTemplateListResponse } from "../../types/AdminSmsTemplateListResponse";
import type { AdminSmsTemplateUpdateInput } from "../../types/AdminSmsTemplateUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminSmsTemplateGroupList(): Promise<AdminSmsTemplateGroupListResponse> {
  return invokeCommand<AdminSmsTemplateGroupListResponse>(
    "cmd_admin_sms_template_group_get_list",
  );
}

export async function getAdminSmsTemplateGroup(
  fgNo: number,
): Promise<AdminSmsTemplateGroupDetailResponse> {
  return invokeCommand<AdminSmsTemplateGroupDetailResponse>(
    "cmd_admin_sms_template_group_get",
    { fg_no: fgNo },
  );
}

export async function createAdminSmsTemplateGroup(
  input: AdminSmsTemplateGroupCreateInput,
): Promise<AdminSmsTemplateGroupDetailResponse> {
  return invokeCommand<AdminSmsTemplateGroupDetailResponse>(
    "cmd_admin_sms_template_group_create",
    { input },
  );
}

export async function updateAdminSmsTemplateGroup(
  input: AdminSmsTemplateGroupUpdateInput,
): Promise<AdminSmsTemplateGroupDetailResponse> {
  return invokeCommand<AdminSmsTemplateGroupDetailResponse>(
    "cmd_admin_sms_template_group_update",
    { input },
  );
}

export async function deleteAdminSmsTemplateGroup(
  input: AdminSmsTemplateGroupDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_sms_template_group_delete", {
    input,
  });
}

export async function moveAdminSmsTemplateGroup(
  input: AdminSmsTemplateGroupMoveInput,
): Promise<AdminSmsTemplateGroupMoveResponse> {
  return invokeCommand<AdminSmsTemplateGroupMoveResponse>(
    "cmd_admin_sms_template_group_move",
    { input },
  );
}

export async function clearAdminSmsTemplateGroup(
  fgNo: number,
): Promise<AdminSmsTemplateGroupClearResponse> {
  return invokeCommand<AdminSmsTemplateGroupClearResponse>(
    "cmd_admin_sms_template_group_clear",
    { fg_no: fgNo },
  );
}

export async function getAdminSmsTemplateList(
  query: AdminSmsTemplateListQuery,
): Promise<AdminSmsTemplateListResponse> {
  return invokeCommand<AdminSmsTemplateListResponse>(
    "cmd_admin_sms_template_get_list",
    { query },
  );
}

export async function getAdminSmsTemplate(
  foNo: number,
): Promise<AdminSmsTemplateDetailResponse> {
  return invokeCommand<AdminSmsTemplateDetailResponse>(
    "cmd_admin_sms_template_get",
    { fo_no: foNo },
  );
}

export async function createAdminSmsTemplate(
  input: AdminSmsTemplateCreateInput,
): Promise<AdminSmsTemplateDetailResponse> {
  return invokeCommand<AdminSmsTemplateDetailResponse>(
    "cmd_admin_sms_template_create",
    { input },
  );
}

export async function updateAdminSmsTemplate(
  input: AdminSmsTemplateUpdateInput,
): Promise<AdminSmsTemplateDetailResponse> {
  return invokeCommand<AdminSmsTemplateDetailResponse>(
    "cmd_admin_sms_template_update",
    { input },
  );
}

export async function deleteAdminSmsTemplate(
  input: AdminSmsTemplateDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_sms_template_delete", {
    input,
  });
}

export async function batchAdminSmsTemplates(
  input: AdminSmsTemplateBatchInput,
): Promise<AdminSmsTemplateBatchResponse> {
  return invokeCommand<AdminSmsTemplateBatchResponse>(
    "cmd_admin_sms_template_batch",
    { input },
  );
}
