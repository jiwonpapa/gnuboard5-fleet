import type { CommandMessage } from "../../types/CommandMessage";
import type { AdminFaqCreateInput } from "../../types/AdminFaqCreateInput";
import type { AdminFaqDeleteInput } from "../../types/AdminFaqDeleteInput";
import type { AdminFaqDetailResponse } from "../../types/AdminFaqDetailResponse";
import type { AdminFaqImageResponse } from "../../types/AdminFaqImageResponse";
import type { AdminFaqImageUploadInput } from "../../types/AdminFaqImageUploadInput";
import type { AdminFaqListQuery } from "../../types/AdminFaqListQuery";
import type { AdminFaqListResponse } from "../../types/AdminFaqListResponse";
import type { AdminFaqMasterCreateInput } from "../../types/AdminFaqMasterCreateInput";
import type { AdminFaqMasterDeleteInput } from "../../types/AdminFaqMasterDeleteInput";
import type { AdminFaqMasterDetailResponse } from "../../types/AdminFaqMasterDetailResponse";
import type { AdminFaqMasterListQuery } from "../../types/AdminFaqMasterListQuery";
import type { AdminFaqMasterListResponse } from "../../types/AdminFaqMasterListResponse";
import type { AdminFaqMasterUpdateInput } from "../../types/AdminFaqMasterUpdateInput";
import type { AdminFaqUpdateInput } from "../../types/AdminFaqUpdateInput";
import { invokeCommand } from "./core";

export async function getAdminFaqMasterList(
  query: AdminFaqMasterListQuery,
): Promise<AdminFaqMasterListResponse> {
  return invokeCommand<AdminFaqMasterListResponse>(
    "cmd_admin_faq_master_get_list",
    { query },
  );
}

export async function getAdminFaqMaster(
  fmId: number,
): Promise<AdminFaqMasterDetailResponse> {
  return invokeCommand<AdminFaqMasterDetailResponse>("cmd_admin_faq_master_get", {
    fm_id: fmId,
  });
}

export async function createAdminFaqMaster(
  input: AdminFaqMasterCreateInput,
): Promise<AdminFaqMasterDetailResponse> {
  return invokeCommand<AdminFaqMasterDetailResponse>(
    "cmd_admin_faq_master_create",
    { input },
  );
}

export async function updateAdminFaqMaster(
  input: AdminFaqMasterUpdateInput,
): Promise<AdminFaqMasterDetailResponse> {
  return invokeCommand<AdminFaqMasterDetailResponse>(
    "cmd_admin_faq_master_update",
    { input },
  );
}

export async function deleteAdminFaqMaster(
  input: AdminFaqMasterDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_faq_master_delete", {
    input,
  });
}

export async function uploadAdminFaqMasterHeaderImage(
  input: AdminFaqImageUploadInput,
): Promise<AdminFaqImageResponse> {
  return invokeCommand<AdminFaqImageResponse>(
    "cmd_admin_faq_master_header_image_upload",
    { input },
  );
}

export async function deleteAdminFaqMasterHeaderImage(
  fmId: number,
): Promise<AdminFaqImageResponse> {
  return invokeCommand<AdminFaqImageResponse>(
    "cmd_admin_faq_master_header_image_delete",
    { fm_id: fmId },
  );
}

export async function uploadAdminFaqMasterFooterImage(
  input: AdminFaqImageUploadInput,
): Promise<AdminFaqImageResponse> {
  return invokeCommand<AdminFaqImageResponse>(
    "cmd_admin_faq_master_footer_image_upload",
    { input },
  );
}

export async function deleteAdminFaqMasterFooterImage(
  fmId: number,
): Promise<AdminFaqImageResponse> {
  return invokeCommand<AdminFaqImageResponse>(
    "cmd_admin_faq_master_footer_image_delete",
    { fm_id: fmId },
  );
}

export async function getAdminFaqList(
  query: AdminFaqListQuery,
): Promise<AdminFaqListResponse> {
  return invokeCommand<AdminFaqListResponse>("cmd_admin_faq_get_list", {
    query,
  });
}

export async function getAdminFaq(faId: number): Promise<AdminFaqDetailResponse> {
  return invokeCommand<AdminFaqDetailResponse>("cmd_admin_faq_get", {
    fa_id: faId,
  });
}

export async function createAdminFaq(
  input: AdminFaqCreateInput,
): Promise<AdminFaqDetailResponse> {
  return invokeCommand<AdminFaqDetailResponse>("cmd_admin_faq_create", {
    input,
  });
}

export async function updateAdminFaq(
  input: AdminFaqUpdateInput,
): Promise<AdminFaqDetailResponse> {
  return invokeCommand<AdminFaqDetailResponse>("cmd_admin_faq_update", {
    input,
  });
}

export async function deleteAdminFaq(
  input: AdminFaqDeleteInput,
): Promise<CommandMessage> {
  return invokeCommand<CommandMessage>("cmd_admin_faq_delete", {
    input,
  });
}
