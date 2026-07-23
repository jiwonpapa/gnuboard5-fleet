import { describe, expect, it } from "vitest";
import {
  buildSiteRoute,
  DEFAULT_ROUTE,
  SITE_DASHBOARD_ROUTE,
  SITE_ONBOARDING_ROUTE,
} from "../layout/navigation";
import {
  normalizeSiteNextPath,
  resolveEntryPath,
  resolvePostRegistrationPath,
  resolveSiteActivationSuccessPath,
} from "./site-flow";
import type { SiteCatalog } from "../../types/SiteCatalog";
import type { SiteCatalogEntry } from "../../types/SiteCatalogEntry";

function createEntry(
  overrides: Partial<SiteCatalogEntry> & { site?: Partial<SiteCatalogEntry["site"]> } = {},
): SiteCatalogEntry {
  return {
    site: {
      api_base_url: "https://alpha.example.com/api/v1",
      created_at: "2026-03-10T00:00:00Z",
      id: "site-alpha",
      is_default: true,
      name: "알파몰",
      updated_at: "2026-03-10T00:00:00Z",
      ...overrides.site,
    },
    status: "signed_out",
    ...overrides,
  };
}

function createCatalog(overrides: Partial<SiteCatalog> = {}): SiteCatalog {
  return {
    active_site_id: "site-alpha",
    correlation_id: "corr-site",
    needs_onboarding: false,
    request_id: "req-site",
    server_request_id: null,
    sites: [createEntry()],
    ...overrides,
  };
}

describe("site-flow", () => {
  it("sends empty catalogs to onboarding", () => {
    expect(resolveEntryPath(undefined, DEFAULT_ROUTE)).toBe(SITE_ONBOARDING_ROUTE);
    expect(
      resolveEntryPath(createCatalog({ needs_onboarding: true, sites: [] }), DEFAULT_ROUTE),
    ).toBe(SITE_ONBOARDING_ROUTE);
  });

  it("sends multi-site catalogs to the site dashboard", () => {
    const catalog = createCatalog({
      active_site_id: "site-alpha",
      sites: [
        createEntry(),
        createEntry({
          site: {
            api_base_url: "https://beta.example.com/api/v1",
            created_at: "2026-03-10T00:00:00Z",
            id: "site-beta",
            is_default: false,
            name: "베타몰",
            updated_at: "2026-03-10T00:00:00Z",
          },
        }),
      ],
    });

    expect(resolveEntryPath(catalog, DEFAULT_ROUTE)).toBe(SITE_DASHBOARD_ROUTE);
    expect(resolveEntryPath(catalog, "/boards/manage")).toBe(SITE_DASHBOARD_ROUTE);
  });

  it("keeps the active multi-site session in the scoped route when authenticated", () => {
    const catalog = createCatalog({
      active_site_id: "site-beta",
      sites: [
        createEntry(),
        createEntry({
          site: {
            api_base_url: "https://beta.example.com/api/v1",
            created_at: "2026-03-10T00:00:00Z",
            id: "site-beta",
            is_default: false,
            name: "베타몰",
            updated_at: "2026-03-10T00:00:00Z",
          },
          status: "authenticated",
        }),
      ],
    });

    expect(resolveEntryPath(catalog, DEFAULT_ROUTE)).toBe(
      buildSiteRoute("site-beta", DEFAULT_ROUTE),
    );
    expect(resolveEntryPath(catalog, "/boards/manage")).toBe(
      buildSiteRoute("site-beta", "/boards/manage"),
    );
  });

  it("sends a single-site catalog into the scoped route", () => {
    expect(resolveEntryPath(createCatalog(), DEFAULT_ROUTE)).toBe(
      buildSiteRoute("site-alpha", "/login"),
    );
    expect(resolveEntryPath(createCatalog(), "/login")).toBe(
      buildSiteRoute("site-alpha", "/login"),
    );
  });

  it("sends authenticated single-site catalogs into the requested route", () => {
    const catalog = createCatalog({
      sites: [createEntry({ status: "authenticated" })],
    });

    expect(resolveEntryPath(catalog, DEFAULT_ROUTE)).toBe(
      buildSiteRoute("site-alpha", DEFAULT_ROUTE),
    );
    expect(resolveEntryPath(catalog, "/boards/manage")).toBe(
      buildSiteRoute("site-alpha", "/boards/manage"),
    );
  });

  it("normalizes site-prefixed paths before activation redirects", () => {
    expect(normalizeSiteNextPath("/sites/site-alpha/boards/manage")).toBe("/boards/manage");
    expect(normalizeSiteNextPath("/")).toBe(DEFAULT_ROUTE);
  });

  it("resolves post-registration into the activation route", () => {
    expect(resolvePostRegistrationPath(createCatalog())).toBe(
      "/sites/site-alpha/activate?next=%2Foverview",
    );
  });

  it("returns login for signed-out sites and next path for authenticated sites", () => {
    const signedOutEntry = createEntry();
    const authenticatedEntry = createEntry({ status: "authenticated" });

    expect(resolveSiteActivationSuccessPath(signedOutEntry, "/boards/manage")).toBe(
      buildSiteRoute("site-alpha", "/login"),
    );
    expect(resolveSiteActivationSuccessPath(authenticatedEntry, "/boards/manage")).toBe(
      buildSiteRoute("site-alpha", "/boards/manage"),
    );
  });
});
