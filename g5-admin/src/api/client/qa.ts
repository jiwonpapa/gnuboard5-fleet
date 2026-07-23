import type { AdminQaBulkDeleteInput } from "../../types/AdminQaBulkDeleteInput";
import type { AdminQaBulkDeleteResponse } from "../../types/AdminQaBulkDeleteResponse";
import { invokeCommand } from "./core";

export async function bulkDeleteAdminQa(
  input: AdminQaBulkDeleteInput,
): Promise<AdminQaBulkDeleteResponse> {
  return invokeCommand<AdminQaBulkDeleteResponse>("cmd_admin_qa_bulk_delete", {
    input,
  });
}
