import type { AdminSmsSendInput } from "../../types/AdminSmsSendInput";
import type { AdminSmsSendResponse } from "../../types/AdminSmsSendResponse";
import { invokeCommand } from "./core";

export async function sendAdminSmsMessage(
  input: AdminSmsSendInput,
): Promise<AdminSmsSendResponse> {
  return invokeCommand<AdminSmsSendResponse>("cmd_admin_sms_message_send", {
    input,
  });
}
