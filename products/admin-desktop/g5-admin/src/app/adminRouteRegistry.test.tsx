import { describe, expect, it } from "vitest";
import {
  flatNavigationItems,
  MEMBER_MANAGE_ROUTE,
} from "../features/layout/navigation";
import {
  canonicalAdminChildRoutes,
  canonicalAdminTopLevelRedirects,
  memberDetailChildRoute,
  memberDetailRedirect,
  memberDetailTopLevelRedirect,
  scopedLegacyAdminRedirects,
  toChildPath,
  topLevelLegacyAdminRedirects,
} from "./adminRouteRegistry";

describe("adminRouteRegistry", () => {
  it("derives canonical child routes and top-level redirects from navigation metadata", () => {
    expect(canonicalAdminChildRoutes).toHaveLength(flatNavigationItems.length);
    expect(canonicalAdminTopLevelRedirects).toHaveLength(flatNavigationItems.length);
    expect(canonicalAdminTopLevelRedirects.map((route) => route.path)).toEqual(
      flatNavigationItems.map((item) => toChildPath(item.to)),
    );
  });

  it("derives legacy redirects from navigation aliases and keeps the member detail redirect explicit", () => {
    const aliasPaths = flatNavigationItems.flatMap((item) =>
      (item.aliases ?? []).map((alias) => toChildPath(alias)),
    );

    expect(scopedLegacyAdminRedirects).toHaveLength(aliasPaths.length + 1);
    expect(topLevelLegacyAdminRedirects).toHaveLength(aliasPaths.length + 1);
    expect(scopedLegacyAdminRedirects.map((route) => route.path)).toContain(
      memberDetailRedirect.path,
    );
    expect(memberDetailChildRoute.path).toBe(
      `${toChildPath(MEMBER_MANAGE_ROUTE)}/:mbId`,
    );
    expect(memberDetailTopLevelRedirect.path).toBe(memberDetailChildRoute.path);

    expect(typeof memberDetailRedirect.to).toBe("function");
    if (typeof memberDetailRedirect.to === "function") {
      expect(memberDetailRedirect.to({ mbId: "neojins" })).toBe(
        `${MEMBER_MANAGE_ROUTE}/neojins`,
      );
    }
  });
});
