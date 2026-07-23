import { describe, expect, it } from "vitest";
import type { AdminThemeConfig } from "../../types/AdminThemeConfig";
import {
  buildAdminThemeConfigPatch,
  buildAdminThemeConfigUpdateInput,
  toAdminThemeConfigFormValues,
} from "./admin-theme-form";

const baseline: AdminThemeConfig = {
  cf_theme: "theme_basic",
  cf_mobile_theme: "",
  cf_theme_installed: true,
  cf_mobile_theme_installed: false,
  installed_count: 3,
};

describe("admin-theme-form", () => {
  it("hydrates current theme config into form values", () => {
    expect(toAdminThemeConfigFormValues(baseline)).toEqual({
      cf_theme: "theme_basic",
      cf_mobile_theme: "",
    });
  });

  it("builds a diff-only payload for changed theme fields", () => {
    expect(
      buildAdminThemeConfigUpdateInput(
        {
          cf_theme: "theme_portal",
          cf_mobile_theme: "",
        },
        baseline,
      ),
    ).toEqual({
      cf_theme: "theme_portal",
    });
  });

  it("builds a quick patch payload while preserving unchanged fields", () => {
    expect(
      buildAdminThemeConfigPatch(baseline, {
        cf_mobile_theme: "theme_mobile",
      }),
    ).toEqual({
      cf_mobile_theme: "theme_mobile",
    });
  });

  it("returns an empty payload on 빈 변경", () => {
    expect(
      buildAdminThemeConfigUpdateInput(
        {
          cf_theme: "theme_basic",
          cf_mobile_theme: "",
        },
        baseline,
      ),
    ).toBeNull();
  });
});
