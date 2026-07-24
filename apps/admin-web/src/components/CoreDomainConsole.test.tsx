import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { coreRegistry } from "../generated/coreOperations";
import { CoreDomainConsole } from "./CoreDomainConsole";

describe("CoreDomainConsole", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify(coreRegistry.operations), { status: 200 })
      ),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps the canonical 189/17/0 boundary and every schema field set", () => {
    expect(coreRegistry.counts).toMatchObject({
      active: 189,
      admin_non_shop: 184,
      bootstrap: 5,
      shop: 0,
      schema_domains: 17,
    });
    expect(
      new Set(coreRegistry.operations.map((item) => item.operation_id)).size,
    ).toBe(189);
    expect(
      coreRegistry.schema_domains.every((domain) =>
        domain.field_count === domain.fields.length &&
        domain.field_count > 0
      ),
    ).toBe(true);
  });

  it("renders generated operations and blocks routine external delivery", async () => {
    render(<CoreDomainConsole siteId="site-a" csrfToken="csrf-memory" />);
    expect(
      await screen.findByText("서버 registry 189/189 일치"),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("도메인"), {
      target: { value: "push" },
    });
    fireEvent.change(screen.getByLabelText("operationId"), {
      target: { value: "adminSendPush" },
    });
    expect(
      screen.getByText(/외부 발송 작업은 routine Core에서 차단/),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "site-bound 실행" }),
    ).toBeDisabled();
  });
});
