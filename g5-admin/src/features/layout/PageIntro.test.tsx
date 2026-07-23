import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import { beforeEach, describe, expect, it } from "vitest";
import { PageIntro, PageSectionHeading } from "./PageIntro";
import { devModeStorageKey, ThemeProvider } from "./theme";

function renderWithTheme(element: ReactNode) {
  return render(<ThemeProvider>{element}</ThemeProvider>);
}

describe("PageIntro", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders compact headline, actions, and metric pills by default", () => {
    window.localStorage.setItem(devModeStorageKey, "enabled");

    renderWithTheme(
      <PageIntro
        kicker="Admin"
        title="대시보드"
        description="요약 설명"
        icon={Activity}
        actions={<button type="button">새로고침</button>}
        metrics={[
          {
            label: "요청",
            value: "12",
            hint: "최근 요청",
            icon: Activity,
          },
        ]}
      />,
    );

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("대시보드")).toBeInTheDocument();
    expect(screen.getByText("새로고침")).toBeInTheDocument();
    expect(screen.getByText("요청")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("요약 설명")).toBeInTheDocument();
    expect(screen.queryByText("최근 요청")).not.toBeInTheDocument();
  });

  it("renders full hero metrics when explicitly requested", () => {
    window.localStorage.setItem(devModeStorageKey, "enabled");

    renderWithTheme(
      <PageIntro
        kicker="Admin"
        title="대시보드"
        description="요약 설명"
        icon={Activity}
        variant="hero"
        actions={<button type="button">새로고침</button>}
        metrics={[
          {
            label: "요청",
            value: "12",
            hint: "최근 요청",
            icon: Activity,
          },
        ]}
      />,
    );

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("대시보드")).toBeInTheDocument();
    expect(screen.getByText("새로고침")).toBeInTheDocument();
    expect(screen.getByText("요청")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("요약 설명")).toBeInTheDocument();
    expect(screen.getByText("최근 요청")).toBeInTheDocument();
  });

  it("keeps compact metrics visible but hides descriptions and hints when dev mode is off", () => {
    window.localStorage.setItem(devModeStorageKey, "disabled");

    renderWithTheme(
      <PageIntro
        kicker="Admin"
        title="대시보드"
        description="숨겨질 설명"
        metrics={[
          {
            label: "요청",
            value: "12",
            hint: "숨겨질 힌트",
          },
        ]}
      />,
    );

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("대시보드")).toBeInTheDocument();
    expect(screen.getByText("요청")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.queryByText("숨겨질 설명")).not.toBeInTheDocument();
    expect(screen.queryByText("숨겨질 힌트")).not.toBeInTheDocument();
  });

  it("renders hero layout without aside content when actions and metrics are absent", () => {
    window.localStorage.setItem(devModeStorageKey, "enabled");

    renderWithTheme(
      <PageIntro
        kicker="Admin"
        title="단일 히어로"
        description="측면 카드 없이 본문만 표시합니다."
        variant="hero"
      />,
    );

    expect(screen.getByText("단일 히어로")).toBeInTheDocument();
    expect(screen.getByText("측면 카드 없이 본문만 표시합니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "새로고침" })).not.toBeInTheDocument();
    expect(screen.queryByText("최근 요청")).not.toBeInTheDocument();
  });

  it("hides descriptive copy when dev mode is off", () => {
    window.localStorage.setItem(devModeStorageKey, "disabled");

    renderWithTheme(
      <PageSectionHeading
        title="섹션"
        description="상세 설명"
        actions={<button type="button">액션</button>}
      />,
    );

    expect(screen.getByText("섹션")).toBeInTheDocument();
    expect(screen.queryByText("상세 설명")).not.toBeInTheDocument();
    expect(screen.getByText("액션")).toBeInTheDocument();
  });
});
