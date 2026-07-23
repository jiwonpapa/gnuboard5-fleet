import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShellSidebar } from "./AppShellSidebar";
import { APP_OVERVIEW_LABEL } from "./branding";
import { navigationGroups, primaryNavigationGroups } from "./navigation";
import { ThemeProvider, devModeStorageKey } from "./theme";

vi.mock("../sites/use-site-catalog", () => ({
  useSiteCatalog: () => ({
    catalog: {
      active_site_id: "site-alpha",
    },
  }),
}));

describe("AppShellSidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function LocationProbe() {
    const location = useLocation();
    return <p data-testid="location-path">{location.pathname}</p>;
  }

  function renderSidebar(
    initialEntry: string,
    activeGroup = primaryNavigationGroups.find((group) => group.label === "환경설정"),
    activeMeta = activeGroup?.items.find((item) => item.label === "메뉴설정"),
  ) {
    return render(
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <AppShellSidebar activeGroup={activeGroup} activeMeta={activeMeta} />
          <LocationProbe />
        </MemoryRouter>
      </ThemeProvider>,
    );
  }

  it("renders workspace links and expands the active primary admin group", () => {
    window.localStorage.setItem(devModeStorageKey, "enabled");

    const activeGroup = primaryNavigationGroups.find((group) => group.label === "환경설정");
    const activeMeta = activeGroup?.items.find((item) => item.label === "메뉴설정");

    if (!activeGroup || !activeMeta) {
      throw new Error("테스트에 필요한 navigation fixture를 찾지 못했습니다.");
    }

    renderSidebar(`/sites/site-alpha${activeMeta.to}`, activeGroup, activeMeta);

    expect(screen.getByRole("navigation", { name: "작업 탭 메뉴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(APP_OVERVIEW_LABEL) })).toHaveAttribute(
      "href",
      "/sites/site-alpha/overview",
    );
    expect(screen.getByRole("link", { name: /앱설정/ })).toHaveAttribute(
      "href",
      "/sites/site-alpha/app/security",
    );
    expect(screen.getByRole("link", { name: /사이트관리/ })).toHaveAttribute(
      "href",
      "/sites/site-alpha/app/sites",
    );
    expect(screen.getByRole("button", { name: /환경설정/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: /기본환경설정/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /DB업그레이드/ })).toBeInTheDocument();
    expect(screen.queryByText("현재 페이지")).not.toBeInTheDocument();
  });

  it("keeps primary groups collapsed until the user expands them from the overview workspace", async () => {
    window.localStorage.setItem(devModeStorageKey, "disabled");
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/sites/site-alpha/overview"]}>
          <AppShellSidebar activeGroup={undefined} activeMeta={undefined} />
          <LocationProbe />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByRole("button", { name: /환경설정/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("link", { name: /기본환경설정/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /환경설정/ }));

    expect(screen.getByRole("button", { name: /환경설정/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: /기본환경설정/ })).toBeInTheDocument();
  });

  it("opens only one admin group at a time", async () => {
    window.localStorage.setItem(devModeStorageKey, "disabled");
    const user = userEvent.setup();

    const activeGroup = primaryNavigationGroups.find((group) => group.label === "환경설정");
    const activeMeta = activeGroup?.items.find((item) => item.label === "메뉴설정");

    if (!activeGroup || !activeMeta) {
      throw new Error("테스트에 필요한 navigation fixture를 찾지 못했습니다.");
    }

    renderSidebar(`/sites/site-alpha${activeMeta.to}`, activeGroup, activeMeta);

    expect(screen.getByRole("button", { name: /환경설정/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: /기본환경설정/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /회원관리/ }));

    expect(screen.getByRole("button", { name: /환경설정/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: /회원관리/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.queryByRole("link", { name: /기본환경설정/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^회원관리$/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /회원메일발송/ })).toBeInTheDocument();
  });

  it("keeps site-management controls out of the sidebar", () => {
    window.localStorage.setItem(devModeStorageKey, "enabled");
    const activeGroup = primaryNavigationGroups.find((group) => group.label === "환경설정");
    const activeMeta = activeGroup?.items.find((item) => item.label === "메뉴설정");

    if (!activeGroup || !activeMeta) {
      throw new Error("테스트에 필요한 navigation fixture를 찾지 못했습니다.");
    }

    renderSidebar(`/sites/site-alpha${activeMeta.to}`, activeGroup, activeMeta);

    expect(screen.queryByPlaceholderText("사이트 검색")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "사이트 추가" })).not.toBeInTheDocument();
    expect(screen.queryByText(/등록 사이트/)).not.toBeInTheDocument();
  });

  it("shows SSH and SFTP as the active-site secondary menu even from the global site workspace", () => {
    const activeGroup = navigationGroups.find((group) => group.id === "site-management");
    const activeMeta = activeGroup?.items[0];

    if (!activeGroup || !activeMeta) {
      throw new Error("테스트에 필요한 site-management fixture를 찾지 못했습니다.");
    }

    renderSidebar("/app/sites", activeGroup, activeMeta);

    expect(screen.getByRole("navigation", { name: "서버 메뉴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /SSH/ })).toHaveAttribute(
      "href",
      "/sites/site-alpha/server/ssh",
    );
    expect(screen.getByRole("link", { name: /SFTP/ })).toHaveAttribute(
      "href",
      "/sites/site-alpha/server/files",
    );
  });
});
