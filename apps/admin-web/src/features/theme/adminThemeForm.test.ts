import { describe, expect, it } from "vitest";

import type { AdminThemeConfig } from "../../api/fleet";
import {
  buildAdminThemeUpdate,
  themeConfigToDraft,
  validThemeIdOrEmpty,
} from "./adminThemeForm";

const baseline: AdminThemeConfig = {
  cf_theme: "basic",
  cf_mobile_theme: "mobile",
  cf_theme_installed: true,
  cf_mobile_theme_installed: true,
  installed_count: 2,
};

describe("adminThemeForm", () => {
  it("hydrates current theme config", () => {
    expect(themeConfigToDraft(baseline)).toEqual({
      cf_theme: "basic",
      cf_mobile_theme: "mobile",
    });
  });

  it("builds a diff-only theme update", () => {
    expect(buildAdminThemeUpdate(baseline, {
      cf_theme: "modern",
      cf_mobile_theme: "mobile",
    })).toEqual({ cf_theme: "modern" });
  });

  it("returns null for unchanged or invalid values", () => {
    expect(buildAdminThemeUpdate(baseline, themeConfigToDraft(baseline))).toBeNull();
    expect(buildAdminThemeUpdate(baseline, {
      cf_theme: "../escape",
      cf_mobile_theme: "mobile",
    })).toBeNull();
  });

  it("allows explicit theme disable while rejecting paths", () => {
    expect(validThemeIdOrEmpty("")).toBe(true);
    expect(validThemeIdOrEmpty("theme-basic_2")).toBe(true);
    expect(validThemeIdOrEmpty("theme/basic")).toBe(false);
  });
});
