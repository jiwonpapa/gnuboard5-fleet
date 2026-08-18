import type { AdminThemeConfig, AdminThemeUpdate } from "../../api/fleet";

export interface AdminThemeDraft {
  cf_theme: string;
  cf_mobile_theme: string;
}

export function themeConfigToDraft(config: AdminThemeConfig): AdminThemeDraft {
  return {
    cf_theme: config.cf_theme,
    cf_mobile_theme: config.cf_mobile_theme,
  };
}

export function buildAdminThemeUpdate(
  baseline: AdminThemeConfig,
  draft: AdminThemeDraft,
): AdminThemeUpdate | null {
  const desktop = draft.cf_theme.trim();
  const mobile = draft.cf_mobile_theme.trim();
  if (!validThemeIdOrEmpty(desktop) || !validThemeIdOrEmpty(mobile)) return null;
  const update: AdminThemeUpdate = {};
  if (desktop !== baseline.cf_theme.trim()) update.cf_theme = desktop;
  if (mobile !== baseline.cf_mobile_theme.trim()) update.cf_mobile_theme = mobile;
  return Object.keys(update).length > 0 ? update : null;
}

export function validThemeIdOrEmpty(value: string): boolean {
  return value === "" || (value.length <= 255 && /^[A-Za-z0-9_-]+$/.test(value));
}
