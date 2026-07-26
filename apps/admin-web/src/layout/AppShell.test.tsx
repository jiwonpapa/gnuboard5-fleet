import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import {
  AppShell,
  AppShellHeader,
  AppShellSidebar,
} from "./AppShell";
import { DisplayToolbar } from "./DisplayToolbar";
import { PageIntro } from "./PageIntro";
import { ProtectedLayout } from "./ProtectedLayout";

describe("legacy AppShell reuse", () => {
  it("renders grouped navigation, server state and responsive menu controls", () => {
    render(
      <MemoryRouter>
        <AppShell serverState="online" serverVersion="1.0.0">
          <p>작업면</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
    expect(screen.getByText("서버 정상")).toBeVisible();
    expect(screen.getAllByText("회원")).toHaveLength(2);
    expect(screen.getByText("1.0.0")).toBeVisible();
  });

  it("keeps header and sidebar interaction independently testable", () => {
    const toggle = vi.fn();
    const navigate = vi.fn();
    render(
      <MemoryRouter>
        <AppShellHeader navigationOpen={false} onToggleNavigation={toggle} />
        <AppShellSidebar
          navigationOpen
          onNavigate={navigate}
          serverState="checking"
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "메뉴" }));
    fireEvent.click(screen.getByRole("link", { name: /개요/ }));
    expect(toggle).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it("reuses page intro, display toolbar and protected route behavior", () => {
    const onCompactChange = vi.fn();
    render(
      <MemoryRouter initialEntries={["/private"]}>
        <PageIntro
          description="설명"
          kicker="Domain"
          metrics={[{ label: "상태", value: "대기" }]}
          title="작업면"
        />
        <DisplayToolbar compact={false} onCompactChange={onCompactChange} />
        <Routes>
          <Route path="/" element={<p>홈</p>} />
          <Route
            path="/private"
            element={
              <ProtectedLayout authorization="denied">
                <p>비밀</p>
              </ProtectedLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "작업면" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "압축" }));
    expect(onCompactChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("홈")).toBeVisible();
  });
});
