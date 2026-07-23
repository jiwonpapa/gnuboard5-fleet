import { describe, expect, it } from "vitest";
import type { MasterLockStatus } from "../../types/MasterLockStatus";
import type { SiteCatalog } from "../../types/SiteCatalog";
import {
  buildMasterSetupRoute,
  buildMasterUnlockRoute,
  buildSiteRoute,
  DEFAULT_ROUTE,
} from "../layout/navigation";
import { resolveAppEntryPath, resolveMasterGatePath, resolvePostMasterAuthPath } from "./master-flow";

function createMasterStatus(
  overrides: Partial<MasterLockStatus> = {},
): MasterLockStatus {
  return {
    correlation_id: "corr-master",
    is_configured: true,
    is_unlocked: false,
    passkey_enabled: false,
    requires_totp: false,
    request_id: "req-master",
    server_request_id: null,
    totp_enabled: false,
    unlock_locked_until_epoch: null,
    unlock_retry_after_seconds: null,
    ...overrides,
  };
}

function createCatalog(): SiteCatalog {
  return {
    active_site_id: "site-alpha",
    correlation_id: "corr-site",
    needs_onboarding: false,
    request_id: "req-site",
    server_request_id: null,
    sites: [
      {
        site: {
          api_base_url: "https://alpha.example.com/api/v1",
          created_at: "2026-03-10T00:00:00Z",
          id: "site-alpha",
          is_default: true,
          name: "알파몰",
          updated_at: "2026-03-10T00:00:00Z",
        },
        status: "authenticated",
      },
    ],
  };
}

describe("master-flow", () => {
  it("routes unconfigured apps into master setup", () => {
    expect(resolveMasterGatePath(createMasterStatus({ is_configured: false }))).toBe(
      buildMasterSetupRoute(),
    );
    expect(
      resolveMasterGatePath(createMasterStatus({ is_configured: false }), "/sites/dashboard"),
    ).toBe(buildMasterSetupRoute("/sites/dashboard"));
  });

  it("routes configured but locked apps into master unlock", () => {
    expect(resolveMasterGatePath(createMasterStatus())).toBe(buildMasterUnlockRoute());
    expect(resolveMasterGatePath(createMasterStatus(), "/boards/manage")).toBe(
      buildMasterUnlockRoute("/boards/manage"),
    );
  });

  it("routes unlocked apps into the site-aware entry path", () => {
    expect(
      resolveAppEntryPath(
        createMasterStatus({ is_unlocked: true }),
        createCatalog(),
        DEFAULT_ROUTE,
      ),
    ).toBe(buildSiteRoute("site-alpha", DEFAULT_ROUTE));
  });

  it("normalizes post-auth targets away from master-only routes", () => {
    expect(resolvePostMasterAuthPath("/master/unlock")).toBe("/");
    expect(resolvePostMasterAuthPath("/boards/manage")).toBe("/boards/manage");
  });
});
