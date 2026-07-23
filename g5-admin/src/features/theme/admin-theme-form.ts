import { z } from "zod";
import type { AdminThemeConfig } from "../../types/AdminThemeConfig";
import type { AdminThemeConfigUpdateInput } from "../../types/AdminThemeConfigUpdateInput";

export const adminThemeConfigSchema = z.object({
  cf_theme: z.string().trim(),
  cf_mobile_theme: z.string().trim(),
});

export type AdminThemeConfigFormValues = z.infer<typeof adminThemeConfigSchema>;

export const emptyAdminThemeConfigFormValues: AdminThemeConfigFormValues = {
  cf_theme: "",
  cf_mobile_theme: "",
};

export function toAdminThemeConfigFormValues(
  config: AdminThemeConfig | null | undefined,
): AdminThemeConfigFormValues {
  if (!config) {
    return emptyAdminThemeConfigFormValues;
  }

  return {
    cf_theme: config.cf_theme ?? "",
    cf_mobile_theme: config.cf_mobile_theme ?? "",
  };
}

export function buildAdminThemeConfigUpdateInput(
  values: AdminThemeConfigFormValues,
  baseline: AdminThemeConfig,
): Partial<AdminThemeConfigUpdateInput> | null {
  const payload: Partial<AdminThemeConfigUpdateInput> = {};
  const nextTheme = values.cf_theme.trim();
  const nextMobileTheme = values.cf_mobile_theme.trim();

  if (nextTheme !== baseline.cf_theme.trim()) {
    payload.cf_theme = nextTheme;
  }

  if (nextMobileTheme !== baseline.cf_mobile_theme.trim()) {
    payload.cf_mobile_theme = nextMobileTheme;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

export function buildAdminThemeConfigPatch(
  baseline: AdminThemeConfig,
  patch: Partial<AdminThemeConfigFormValues>,
): Partial<AdminThemeConfigUpdateInput> | null {
  const merged: AdminThemeConfigFormValues = {
    ...toAdminThemeConfigFormValues(baseline),
    ...patch,
  };

  return buildAdminThemeConfigUpdateInput(merged, baseline);
}
