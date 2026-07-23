import type { AdminSmsBatchResendInput } from "../../types/AdminSmsBatchResendInput";
import type { AdminSmsDeliveryListQuery } from "../../types/AdminSmsDeliveryListQuery";
import type { AdminSmsDeliveryListResponse } from "../../types/AdminSmsDeliveryListResponse";
import type { AdminSmsMessageBatchDetailQuery } from "../../types/AdminSmsMessageBatchDetailQuery";
import type { AdminSmsMessageBatchDetailResponse } from "../../types/AdminSmsMessageBatchDetailResponse";
import type { AdminSmsMessageBatchListQuery } from "../../types/AdminSmsMessageBatchListQuery";
import type { AdminSmsMessageBatchListResponse } from "../../types/AdminSmsMessageBatchListResponse";
import type { AdminSmsSendResponse } from "../../types/AdminSmsSendResponse";
import { invokeCommand } from "./core";

export async function getAdminSmsMessageBatchList(
  query: AdminSmsMessageBatchListQuery,
): Promise<AdminSmsMessageBatchListResponse> {
  return invokeCommand<AdminSmsMessageBatchListResponse>(
    "cmd_admin_sms_message_batch_get_list",
    { query },
  );
}

export async function getAdminSmsMessageBatch(
  query: AdminSmsMessageBatchDetailQuery,
): Promise<AdminSmsMessageBatchDetailResponse> {
  return invokeCommand<AdminSmsMessageBatchDetailResponse>(
    "cmd_admin_sms_message_batch_get",
    { query },
  );
}

export async function getAdminSmsDeliveryList(
  query: AdminSmsDeliveryListQuery,
): Promise<AdminSmsDeliveryListResponse> {
  return invokeCommand<AdminSmsDeliveryListResponse>(
    "cmd_admin_sms_delivery_get_list",
    { query },
  );
}

export async function resendAdminSmsBatchFailures(
  input: AdminSmsBatchResendInput,
): Promise<AdminSmsSendResponse> {
  return invokeCommand<AdminSmsSendResponse>(
    "cmd_admin_sms_message_batch_resend_failures",
    { input },
  );
}

export async function resendAdminSmsBatchAll(
  input: AdminSmsBatchResendInput,
): Promise<AdminSmsSendResponse> {
  return invokeCommand<AdminSmsSendResponse>(
    "cmd_admin_sms_message_batch_resend_all",
    { input },
  );
}
