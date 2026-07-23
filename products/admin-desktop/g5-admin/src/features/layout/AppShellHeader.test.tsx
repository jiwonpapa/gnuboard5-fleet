import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberProfile } from "../../types/MemberProfile";
import { ThemeProvider, devModeStorageKey } from "./theme";
import { AppShellHeader } from "./AppShellHeader";
import { resolveRouteGroup } from "./navigation";

const refreshMock = vi.hoisted(() => ({
  requestAppShellRefresh: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  message: vi.fn(),
}));

const siteCatalogFixture = vi.hoisted(() => ({
  catalog: {
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
        status: "authenticated" as const,
      },
      {
        site: {
          api_base_url: "https://beta.example.com/api/v1",
          created_at: "2026-03-10T00:00:00Z",
          id: "site-beta",
          is_default: false,
          name: "베타커뮤니티",
          updated_at: "2026-03-10T00:00:00Z",
        },
        status: "signed_out" as const,
      },
      {
        site: {
          api_base_url: "https://gamma.example.com/api/v1",
          created_at: "2026-03-10T00:00:00Z",
          id: "site-gamma",
          is_default: false,
          name: "감마스토어",
          updated_at: "2026-03-10T00:00:00Z",
        },
        status: "signed_out" as const,
      },
      {
        site: {
          api_base_url: "https://delta.example.com/api/v1",
          created_at: "2026-03-10T00:00:00Z",
          id: "site-delta",
          is_default: false,
          name: "델타포럼",
          updated_at: "2026-03-10T00:00:00Z",
        },
        status: "signed_out" as const,
      },
      {
        site: {
          api_base_url: "https://epsilon.example.com/api/v1",
          created_at: "2026-03-10T00:00:00Z",
          id: "site-epsilon",
          is_default: false,
          name: "엡실론허브",
          updated_at: "2026-03-10T00:00:00Z",
        },
        status: "signed_out" as const,
      },
    ],
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastMock.error,
    message: toastMock.message,
  },
}));

vi.mock("../sites/use-site-catalog", () => ({
  useSiteCatalog: () => siteCatalogFixture,
}));

vi.mock("./app-shell-refresh", () => ({
  requestAppShellRefresh: refreshMock.requestAppShellRefresh,
}));

const memberProfile: MemberProfile = {
  mb_email: "neo@example.com",
  mb_id: "neojins",
  mb_level: 10,
  mb_name: "Neo",
  mb_nick: "neo",
  mb_point: 1200,
};

function HeaderHarness(props: { onPrimaryNav?: () => void }) {
  const location = useLocation();
  const activeGroup = resolveRouteGroup(location.pathname);

  return (
    <>
      <AppShellHeader
        activeGroup={activeGroup}
        currentMember={memberProfile}
        headerElevated={false}
        headerVisible
        isBusy={false}
        onLogout={async () => undefined}
        onPrimaryNav={props.onPrimaryNav ?? (() => undefined)}
      />
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
    </>
  );
}

function renderHeader(options?: {
  currentMember?: MemberProfile | null;
  initialEntries?: string[];
  isBusy?: boolean;
  onLogout?: () => Promise<unknown>;
  onPrimaryNav?: () => void;
}) {
  function CustomHeaderHarness() {
    const location = useLocation();
    const activeGroup = resolveRouteGroup(location.pathname);

    return (
      <>
        <AppShellHeader
          activeGroup={activeGroup}
          currentMember={
            options && "currentMember" in options
              ? (options.currentMember ?? null)
              : memberProfile
          }
          headerElevated={false}
          headerVisible
          isBusy={options?.isBusy ?? false}
          onLogout={options?.onLogout ?? (async () => undefined)}
          onPrimaryNav={options?.onPrimaryNav ?? (() => undefined)}
        />
        <div data-testid="location">{`${location.pathname}${location.search}`}</div>
      </>
    );
  }

  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={options?.initialEntries ?? ["/overview"]}>
        <CustomHeaderHarness />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("AppShellHeader", () => {
  beforeEach(() => {
    window.localStorage.clear();
    toastMock.message.mockReset();
    toastMock.error.mockReset();
    refreshMock.requestAppShellRefresh.mockReset();
    siteCatalogFixture.catalog.active_site_id = "site-alpha";
  });

  it("navigates through the search box and calls the top-scroll handler first", async () => {
    const user = userEvent.setup();
    const onPrimaryNav = vi.fn();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <HeaderHarness onPrimaryNav={onPrimaryNav} />
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.type(screen.getByRole("combobox"), "회원관리파일");
    await user.click(
      screen.getAllByRole("button", { name: /회원관리파일/ })[0],
    );

    expect(onPrimaryNav).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/members/files");
  });

  it("keeps the fixed workspace tabs wired to the canonical landing routes", async () => {
    const user = userEvent.setup();
    const onPrimaryNav = vi.fn();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <HeaderHarness onPrimaryNav={onPrimaryNav} />
        </MemoryRouter>
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("link", { name: "사이트관리" }));

    expect(onPrimaryNav).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/app/sites");
  });

  it("keeps the right-side header controls on a shared height and vertically centers the search input", () => {
    renderHeader();

    expect(screen.getByRole("combobox")).toHaveClass("app-shell-header-search-input");
    expect(screen.getByRole("combobox")).toHaveClass("leading-[2.5rem]");
    expect(screen.getByRole("button", { name: "앱 잠금" })).toHaveClass("h-10");
    expect(screen.getByRole("button", { name: "로그아웃" })).toHaveClass("h-10");
  });

  it("moves to the overview route when the brand is clicked", async () => {
    const user = userEvent.setup();
    const onPrimaryNav = vi.fn();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/members/manage"]}>
          <HeaderHarness onPrimaryNav={onPrimaryNav} />
        </MemoryRouter>
      </ThemeProvider>,
    );

    const brandButton = screen.getByRole("button", {
      name: /그누5어드민 첫 화면으로 이동/,
    });

    expect(brandButton).toHaveClass("cursor-pointer");

    await user.click(brandButton);

    expect(onPrimaryNav).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/overview");
  });

  it("renders fixed top tabs and visible site tabs together", () => {
    renderHeader({
      initialEntries: ["/sites/site-alpha/overview"],
    });

    expect(
      screen.getByRole("navigation", { name: "상단 작업 탭" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "사이트관리" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "앱설정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "알파몰" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "베타커뮤니티" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /더보기/ })).toBeInTheDocument();
  });

  it("moves to overflowed site tabs through the more menu", async () => {
    const user = userEvent.setup();

    renderHeader({
      initialEntries: ["/sites/site-alpha/overview"],
    });

    await user.click(screen.getByRole("button", { name: /더보기/ }));
    await user.click(screen.getByRole("menuitem", { name: "엡실론허브" }));

    expect(screen.getByTestId("location").textContent).toContain(
      "/sites/site-epsilon/activate",
    );
  });

  it("returns to the site overview when a site tab is clicked from a fixed workspace tab", async () => {
    const user = userEvent.setup();

    renderHeader({
      initialEntries: ["/sites/site-alpha/app/security"],
    });

    await user.click(screen.getByRole("button", { name: "알파몰" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/sites/site-alpha/overview",
    );
  });

  it("returns to the site overview after moving through the app settings tab", async () => {
    const user = userEvent.setup();

    renderHeader({
      initialEntries: ["/sites/site-alpha/overview"],
    });

    await user.click(screen.getByRole("link", { name: "앱설정" }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/sites/site-alpha/app/security",
    );

    await user.click(screen.getByRole("button", { name: "알파몰" }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/sites/site-alpha/overview",
    );
  });

  it("returns to the site overview after moving through the site management tab", async () => {
    const user = userEvent.setup();

    renderHeader({
      initialEntries: ["/sites/site-alpha/overview"],
    });

    await user.click(screen.getByRole("link", { name: "사이트관리" }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/sites/site-alpha/app/sites",
    );

    await user.click(screen.getByRole("button", { name: "알파몰" }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/sites/site-alpha/overview",
    );
  });

  it("returns to the active site overview from the global site management workspace", async () => {
    const user = userEvent.setup();

    renderHeader({
      initialEntries: ["/app/sites"],
    });

    await user.click(screen.getByRole("button", { name: "알파몰" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/sites/site-alpha/overview",
    );
  });

  it("moves to another site activation route from a fixed workspace tab", async () => {
    const user = userEvent.setup();

    renderHeader({
      initialEntries: ["/sites/site-alpha/app/sites"],
    });

    await user.click(screen.getByRole("button", { name: "베타커뮤니티" }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/sites/site-beta/activate?next=%2Foverview",
    );
  });

  it("finds menus by group description and route fragments when labels do not match directly", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/members/manage"]}>
          <HeaderHarness />
        </MemoryRouter>
      </ThemeProvider>,
    );

    const searchInput = screen.getByRole("combobox");

    await user.type(searchInput, "menu200");
    expect(
      screen.getAllByRole("button", { name: /회원관리/ }).length,
    ).toBeGreaterThan(0);

    await user.clear(searchInput);
    await user.type(searchInput, "/members/files");
    expect(
      screen.getAllByRole("button", { name: /회원관리파일/ }).length,
    ).toBeGreaterThan(0);
  });

  it("shows a guidance toast when search is submitted without a menu name", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <HeaderHarness />
        </MemoryRouter>
      </ThemeProvider>,
    );

    const searchInput = screen.getByRole("combobox");
    await user.click(searchInput);
    await user.keyboard("{Enter}");

    expect(toastMock.message).toHaveBeenCalledWith(
      "이동할 메뉴명을 입력해 주십시오.",
    );
  });

  it("shows an error toast when no matching menu exists", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <HeaderHarness />
        </MemoryRouter>
      </ThemeProvider>,
    );

    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "없는메뉴");

    expect(screen.getByText("일치하는 메뉴가 없습니다.")).toBeInTheDocument();

    await user.keyboard("{Enter}");

    expect(toastMock.error).toHaveBeenCalledWith(
      "일치하는 메뉴를 찾지 못했습니다.",
    );
  });

  it("keeps the empty-result panel stable when arrow navigation is pressed without matches", async () => {
    const user = userEvent.setup();

    renderHeader();

    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "없는메뉴");

    expect(screen.getByText("일치하는 메뉴가 없습니다.")).toBeInTheDocument();

    await user.keyboard("{ArrowDown}{ArrowUp}");

    expect(screen.getByText("일치하는 메뉴가 없습니다.")).toBeInTheDocument();
    expect(searchInput).toHaveAttribute("aria-expanded", "true");
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("closes the search panel on escape and outside click", async () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/overview"]}>
          <HeaderHarness />
        </MemoryRouter>
      </ThemeProvider>,
    );

    const searchInput = screen.getByRole("combobox");

    fireEvent.focus(searchInput);
    expect(screen.getByText("빠른 이동")).toBeInTheDocument();

    fireEvent.keyDown(searchInput, { key: "Escape" });
    expect(screen.queryByText("빠른 이동")).not.toBeInTheDocument();

    fireEvent.focus(searchInput);
    expect(screen.getByText("빠른 이동")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("빠른 이동")).not.toBeInTheDocument();
  });

  it("hides development-only descriptions when dev mode is off", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(devModeStorageKey, "disabled");

    renderHeader({
      initialEntries: ["/environment/menus"],
    });

    expect(
      screen.queryByText(
        "상단 작업 탭과 좌측 서브메뉴 기준으로 관리자 작업면을 분리합니다.",
      ),
    ).not.toBeInTheDocument();

    const searchInput = screen.getByRole("combobox");
    fireEvent.focus(searchInput);
    await user.type(searchInput, "메뉴설정");

    expect(
      screen.getAllByRole("button", { name: /메뉴설정/ }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText("사이트 메뉴 트리 조회, 수정, 재정렬을 다룹니다."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("구현완료")).not.toBeInTheDocument();
  });

  it("cycles keyboard search results and clears the query after route navigation", async () => {
    const user = userEvent.setup();
    const onPrimaryNav = vi.fn();

    renderHeader({
      initialEntries: ["/overview"],
      onPrimaryNav,
    });

    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "회원관리");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onPrimaryNav).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/members/files");
    expect(searchInput).toHaveValue("");
    expect(screen.queryByText("검색 결과 2건")).not.toBeInTheDocument();
  });

  it("resets the search panel without changing the route when the selected route is already active", async () => {
    const user = userEvent.setup();
    const onPrimaryNav = vi.fn();

    renderHeader({
      initialEntries: ["/members/manage"],
      onPrimaryNav,
    });

    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "회원관리");
    await user.keyboard("{Enter}");

    expect(onPrimaryNav).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location")).toHaveTextContent("/members/manage");
    expect(searchInput).toHaveValue("");
    expect(screen.queryByText("검색 결과 2건")).not.toBeInTheDocument();
  });

  it("calls logout when enabled and falls back to the default brand description on unknown routes", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn(async () => undefined);

    renderHeader({
      initialEntries: ["/unknown"],
      onLogout,
    });

    expect(
      screen.getByText(
        "상단 작업 탭과 좌측 서브메뉴 기준으로 관리자 작업면을 분리합니다.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("shows fallback identity values and keeps logout disabled while busy", async () => {
    const onLogout = vi.fn(async () => undefined);

    renderHeader({
      currentMember: null,
      isBusy: true,
      onLogout,
    });

    expect(screen.getByText("관리자")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeDisabled();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("refreshes the current page queries when the refresh toolbar button is pressed", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: "새로고침" }));

    expect(refreshMock.requestAppShellRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows an SSH connected indicator for the current site when presence is published", () => {
    window.localStorage.setItem("g5-admin:ssh-connection-presence:site-alpha", "true");

    renderHeader({
      initialEntries: ["/sites/site-alpha/overview"],
    });

    expect(screen.getByLabelText("현재 사이트 SSH 연결 중")).toBeInTheDocument();
  });
});
