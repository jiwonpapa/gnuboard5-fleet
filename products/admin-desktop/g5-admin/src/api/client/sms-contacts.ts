import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminSmsContactBatchInput } from "../../types/AdminSmsContactBatchInput";
import type { AdminSmsContactBatchResponse } from "../../types/AdminSmsContactBatchResponse";
import type { AdminSmsContactCreateInput } from "../../types/AdminSmsContactCreateInput";
import type { AdminSmsContactDeleteInput } from "../../types/AdminSmsContactDeleteInput";
import type { AdminSmsContactDetailResponse } from "../../types/AdminSmsContactDetailResponse";
import type { AdminSmsContactExportQuery } from "../../types/AdminSmsContactExportQuery";
import type { AdminSmsContactExportResponse } from "../../types/AdminSmsContactExportResponse";
import type { AdminSmsContactGroupClearResponse } from "../../types/AdminSmsContactGroupClearResponse";
import type { AdminSmsContactGroupCreateInput } from "../../types/AdminSmsContactGroupCreateInput";
import type { AdminSmsContactGroupDeleteInput } from "../../types/AdminSmsContactGroupDeleteInput";
import type { AdminSmsContactGroupDetailResponse } from "../../types/AdminSmsContactGroupDetailResponse";
import type { AdminSmsContactGroupListResponse } from "../../types/AdminSmsContactGroupListResponse";
import type { AdminSmsContactGroupMoveInput } from "../../types/AdminSmsContactGroupMoveInput";
import type { AdminSmsContactGroupMoveResponse } from "../../types/AdminSmsContactGroupMoveResponse";
import type { AdminSmsContactGroupUpdateInput } from "../../types/AdminSmsContactGroupUpdateInput";
import type { AdminSmsContactImportInput } from "../../types/AdminSmsContactImportInput";
import type { AdminSmsContactImportResponse } from "../../types/AdminSmsContactImportResponse";
import type { AdminSmsContactListQuery } from "../../types/AdminSmsContactListQuery";
import type { AdminSmsContactListResponse } from "../../types/AdminSmsContactListResponse";
import type { AdminSmsContactUpdateInput } from "../../types/AdminSmsContactUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminSmsContactGroupList(): Promise<AdminSmsContactGroupListResponse> {
  return invokeCommand<AdminSmsContactGroupListResponse>(
    "cmd_admin_sms_contact_group_get_list",
  );
}

export async function getAdminSmsContactGroup(
  bgNo: number,
): Promise<AdminSmsContactGroupDetailResponse> {
  return invokeCommand<AdminSmsContactGroupDetailResponse>(
    "cmd_admin_sms_contact_group_get",
    { bg_no: bgNo },
  );
}

export async function createAdminSmsContactGroup(
  input: AdminSmsContactGroupCreateInput,
): Promise<AdminSmsContactGroupDetailResponse> {
  return invokeCommand<AdminSmsContactGroupDetailResponse>(
    "cmd_admin_sms_contact_group_create",
    { input },
  );
}

export async function updateAdminSmsContactGroup(
  input: AdminSmsContactGroupUpdateInput,
): Promise<AdminSmsContactGroupDetailResponse> {
  return invokeCommand<AdminSmsContactGroupDetailResponse>(
    "cmd_admin_sms_contact_group_update",
    { input },
  );
}

export async function deleteAdminSmsContactGroup(
  input: AdminSmsContactGroupDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_sms_contact_group_delete", {
    input,
  });
}

export async function moveAdminSmsContactGroup(
  input: AdminSmsContactGroupMoveInput,
): Promise<AdminSmsContactGroupMoveResponse> {
  return invokeCommand<AdminSmsContactGroupMoveResponse>(
    "cmd_admin_sms_contact_group_move",
    { input },
  );
}

export async function clearAdminSmsContactGroup(
  bgNo: number,
): Promise<AdminSmsContactGroupClearResponse> {
  return invokeCommand<AdminSmsContactGroupClearResponse>(
    "cmd_admin_sms_contact_group_clear",
    { bg_no: bgNo },
  );
}

export async function getAdminSmsContactList(
  query: AdminSmsContactListQuery,
): Promise<AdminSmsContactListResponse> {
  return invokeCommand<AdminSmsContactListResponse>(
    "cmd_admin_sms_contact_get_list",
    { query },
  );
}

export async function getAdminSmsContact(
  bkNo: number,
): Promise<AdminSmsContactDetailResponse> {
  return invokeCommand<AdminSmsContactDetailResponse>(
    "cmd_admin_sms_contact_get",
    { bk_no: bkNo },
  );
}

export async function createAdminSmsContact(
  input: AdminSmsContactCreateInput,
): Promise<AdminSmsContactDetailResponse> {
  return invokeCommand<AdminSmsContactDetailResponse>(
    "cmd_admin_sms_contact_create",
    { input },
  );
}

export async function updateAdminSmsContact(
  input: AdminSmsContactUpdateInput,
): Promise<AdminSmsContactDetailResponse> {
  return invokeCommand<AdminSmsContactDetailResponse>(
    "cmd_admin_sms_contact_update",
    { input },
  );
}

export async function deleteAdminSmsContact(
  input: AdminSmsContactDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_sms_contact_delete", {
    input,
  });
}

export async function batchAdminSmsContacts(
  input: AdminSmsContactBatchInput,
): Promise<AdminSmsContactBatchResponse> {
  return invokeCommand<AdminSmsContactBatchResponse>(
    "cmd_admin_sms_contact_batch",
    { input },
  );
}

export async function importAdminSmsContacts(
  input: AdminSmsContactImportInput,
): Promise<AdminSmsContactImportResponse> {
  return invokeCommand<AdminSmsContactImportResponse>(
    "cmd_admin_sms_contact_import",
    { input },
  );
}

export async function exportAdminSmsContacts(
  query: AdminSmsContactExportQuery,
): Promise<AdminSmsContactExportResponse> {
  return invokeCommand<AdminSmsContactExportResponse>(
    "cmd_admin_sms_contact_export",
    { query },
  );
}
