import type { ReactNode } from "react";
import { Bug, Moon, RefreshCcw, SunMedium } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { useTheme } from "./theme";

export function DisplayToolbar(props: {
  className?: string;
  onRefresh?: () => void;
}) {
  const {
    canDecreaseFontScale,
    canIncreaseFontScale,
    decreaseFontScale,
    devMode,
    fontScale,
    increaseFontScale,
    resolvedTheme,
    setTheme,
    toggleDevMode,
  } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const currentThemeLabel = resolvedTheme === "dark" ? "다크" : "라이트";
  const nextThemeLabel = nextTheme === "dark" ? "다크" : "라이트";
  const ThemeIcon = resolvedTheme === "dark" ? Moon : SunMedium;

  return (
    <div
      className={cn(
        "flex h-10 items-center gap-1 rounded-sm border border-border/70 bg-background/92 px-1.5",
        props.className,
      )}
    >
      {props.onRefresh ? (
        <>
          <ToolbarButton
            ariaLabel="새로고침"
            onClick={props.onRefresh}
            title="새로고침"
          >
            <RefreshCcw className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarDivider />
        </>
      ) : null}

      <div className="flex h-8 items-center gap-1 rounded-sm bg-muted/45 px-1">
        <ToolbarButton
          ariaLabel="글자 크기 줄이기"
          disabled={!canDecreaseFontScale}
          onClick={decreaseFontScale}
          title="글자 크기 줄이기"
        >
          <span
            className={cn(
              "font-semibold leading-none tracking-tight",
              fontScale === "sm" ? "text-[0.68rem]" : "text-[0.72rem]",
            )}
          >
            T
          </span>
        </ToolbarButton>

        <ToolbarButton
          ariaLabel="글자 크기 키우기"
          disabled={!canIncreaseFontScale}
          onClick={increaseFontScale}
          title="글자 크기 키우기"
        >
          <span
            className={cn(
              "font-semibold leading-none tracking-tight",
              fontScale === "lg" ? "text-[1rem]" : "text-[0.9rem]",
            )}
          >
            T
          </span>
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      <div className="flex h-8 items-center rounded-sm bg-muted/45 px-1">
        <ToolbarButton
          ariaLabel={`테마 전환 (현재 ${currentThemeLabel})`}
          onClick={() => setTheme(nextTheme)}
          title={`현재 ${currentThemeLabel} 테마 · 클릭하여 ${nextThemeLabel}로 전환`}
        >
          <ThemeIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 rounded-sm px-0 text-foreground hover:bg-muted",
          devMode && "bg-primary/10 text-primary hover:bg-primary/15",
        )}
        onClick={toggleDevMode}
        aria-label={devMode ? "개발 모드 끄기" : "개발 모드 켜기"}
        title={devMode ? "개발 모드 끄기" : "개발 모드 켜기"}
      >
        <Bug className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ToolbarDivider() {
  return <div className="h-7 w-px bg-border/80" aria-hidden="true" />;
}

function ToolbarButton(props: {
  ariaLabel: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-sm px-2 text-foreground transition-colors",
        props.disabled
          ? "cursor-not-allowed opacity-35"
          : "hover:bg-background hover:text-foreground",
      )}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      title={props.title}
    >
      {props.children}
    </button>
  );
}
