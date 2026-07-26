import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AdminMenuStatusPage } from "./AdminMenuStatusPage";

describe("AdminMenuStatusPage", () => {
  it("shows the legacy source and refuses to present a generic console as done", () => {
    render(
      <MemoryRouter initialEntries={["/admin/members"]}>
        <AdminMenuStatusPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "회원 작업면 준비 상태" }),
    ).toBeVisible();
    expect(screen.getByText("members/AdminMembersPage.tsx")).toBeVisible();
    expect(screen.getByText(/범용 JSON console을 완료 화면으로/)).toBeVisible();
  });
});
