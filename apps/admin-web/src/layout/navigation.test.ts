import { describe, expect, it } from "vitest";

import { shellContextActions } from "./appShellContextMenu";
import {
  adminRoutes,
  deliveryLabel,
  resolveRouteMeta,
} from "./navigation";

describe("navigation", () => {
  it("exposes every route once with an honest delivery label", () => {
    expect(new Set(adminRoutes.map((route) => route.path)).size).toBe(
      adminRoutes.length,
    );
    expect(resolveRouteMeta("/admin/boards")?.legacySource).toContain("Boards");
    expect(deliveryLabel("planned")).toBe("배치 대기");
  });

  it("keeps safe shell context actions free of native APIs", () => {
    expect(shellContextActions()).toEqual([
      { id: "refresh", label: "현재 화면 새로고침" },
      { id: "copy-path", label: "화면 경로 복사" },
    ]);
  });
});
