import { z } from "zod";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import type { AdminSmsConfig } from "../../types/AdminSmsConfig";
import type { AdminSmsConfigUpdateInput } from "../../types/AdminSmsConfigUpdateInput";
import {
  buildAdminSmsConfigUpdateInput,
  emptyAdminSmsConfigFormValues,
  toAdminSmsConfigFormValues,
  validateAdminSmsConfigUpdateInput,
  type AdminSmsConfigFormValues,
} from "./admin-sms-config-form";

export const smsConfigKey = ["admin", "sms", "config"] as const;

export const smsConfigSchema = z.object({
  cf_sms_use: z.enum(["", "icode"]),
  cf_sms_type: z.enum(["", "LMS"]),
  cf_icode_id: z.string().trim(),
  cf_icode_pw: z.string().trim(),
  cf_icode_server_ip: z.string().trim(),
  cf_icode_server_port: z.string().trim(),
  cf_icode_token_key: z.string().trim(),
  cf_phone: z.string().trim(),
});

export function resolveAdminSmsConfigFormValues(
  watchedValues: Partial<AdminSmsConfigFormValues> | undefined,
): AdminSmsConfigFormValues {
  return {
    ...emptyAdminSmsConfigFormValues,
    ...watchedValues,
  };
}

export function resetAdminSmsConfigForm(
  form: UseFormReturn<AdminSmsConfigFormValues>,
  baseline: AdminSmsConfig | null,
) {
  form.reset(
    baseline ? toAdminSmsConfigFormValues(baseline) : emptyAdminSmsConfigFormValues,
  );
}

export function prepareAdminSmsConfigSubmitPayload(params: {
  baseline: AdminSmsConfig | null;
  form: UseFormReturn<AdminSmsConfigFormValues>;
  showValidationToast?: boolean;
  submittedValues: AdminSmsConfigFormValues;
}): Partial<AdminSmsConfigUpdateInput> | null {
  if (!params.baseline) {
    return null;
  }

  params.form.clearErrors(["cf_icode_server_port", "cf_phone"]);
  const payload = buildAdminSmsConfigUpdateInput(
    params.submittedValues,
    params.baseline,
  );

  if (Object.keys(payload).length === 0) {
    if (params.showValidationToast !== false) {
      toast("변경된 SMS 설정이 없습니다.");
    }
    return null;
  }

  const validationErrors = validateAdminSmsConfigUpdateInput(payload);
  if (validationErrors.cf_icode_server_port) {
    params.form.setError("cf_icode_server_port", {
      type: "validate",
      message: validationErrors.cf_icode_server_port,
    });
  }
  if (validationErrors.cf_phone) {
    params.form.setError("cf_phone", {
      type: "validate",
      message: validationErrors.cf_phone,
    });
  }

  if (Object.keys(validationErrors).length > 0) {
    return null;
  }

  return payload;
}
