import type { AdminMailTestInput } from "../../types/AdminMailTestInput";
import type { AdminMailTestResponse } from "../../types/AdminMailTestResponse";
import { invokeCommand } from "./core";

export async function sendAdminMailTest(
  input: AdminMailTestInput
): Promise<AdminMailTestResponse> {
  return invokeCommand<AdminMailTestResponse>("cmd_admin_mail_test_send", {
    input,
  });
}

export async function sendLegacyAdminMailsTest(
  input: AdminMailTestInput
): Promise<AdminMailTestResponse> {
  return invokeCommand<AdminMailTestResponse>(
    "cmd_admin_mail_test_send_legacy_mails",
    {
      input,
    }
  );
}

export async function sendLegacyAdminMailTests(
  input: AdminMailTestInput
): Promise<AdminMailTestResponse> {
  return invokeCommand<AdminMailTestResponse>(
    "cmd_admin_mail_test_send_legacy_mail_tests",
    { input }
  );
}
