import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AdminMenuStatusPage } from "./AdminMenuStatusPage";

describe("AdminMenuStatusPage", () => {
  it("requires explicit site selection for a completed domain workflow", () => {
    render(
      <MemoryRouter initialEntries={["/admin/members"]}>
        <AdminMenuStatusPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "회원 사이트 선택" }),
    ).toBeVisible();
    expect(screen.getByText("members/AdminMembersPage.tsx")).toBeVisible();
    expect(screen.getByRole("link", { name: "사이트 목록으로 이동" })).toHaveAttribute(
      "href",
      "/sites",
    );
  });
});
