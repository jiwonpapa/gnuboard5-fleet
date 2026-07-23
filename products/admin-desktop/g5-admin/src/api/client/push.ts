import type { AdminPushMessageInput } from "../../types/AdminPushMessageInput";
import type { AdminPushMessageResponse } from "../../types/AdminPushMessageResponse";
import { invokeCommand } from "./core";

export async function createAdminPushMessage(
  input: AdminPushMessageInput,
): Promise<AdminPushMessageResponse> {
  return invokeCommand<AdminPushMessageResponse>("cmd_admin_push_message_create", {
    input,
  });
}

export async function sendAdminPushMessage(
  input: AdminPushMessageInput,
): Promise<AdminPushMessageResponse> {
  return invokeCommand<AdminPushMessageResponse>("cmd_admin_push_send", {
    input,
  });
}
