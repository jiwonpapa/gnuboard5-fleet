import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "../../components/ui/input-group";
import { cn } from "../../lib/utils";
import type { NavigationGroup } from "./navigation";
import { getNavigationDeliveryLabel } from "./navigation";
import { rankNavigationItems } from "./navigation-search";
import { toSiteRoute, useCurrentSiteId } from "../sites/site-routing";
import { shellControlSurfaceClass, shellIconClass } from "./shell";

export function AppShellHeaderSearch(props: {
  activeGroup: NavigationGroup | undefined;
  devMode: boolean;
  onPrimaryNav: () => void;
}) {
  const currentSiteId = useCurrentSiteId();
  const location = useLocation();
  const navigate = useNavigate();
  const searchPanelId = useId();
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const [searchState, setSearchState] = useState({
    activeIndex: 0,
    open: false,
    pathname: location.pathname,
    query: "",
  });
  const isSearchStateCurrent = searchState.pathname === location.pathname;
  const searchQuery = isSearchStateCurrent ? searchState.query : "";
  const searchOpen = isSearchStateCurrent ? searchState.open : false;
  const activeSearchIndex = isSearchStateCurrent ? searchState.activeIndex : 0;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchResults = rankNavigationItems(normalizedSearchQuery, props.activeGroup?.id).slice(
    0,
    7,
  );
  const highlightedSearchIndex =
    searchResults.length === 0 ? -1 : Math.min(activeSearchIndex, searchResults.length - 1);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        searchPanelRef.current &&
        event.target instanceof Node &&
        !searchPanelRef.current.contains(event.target)
      ) {
        setSearchState((currentState) => ({
          ...currentState,
          open: false,
          pathname: location.pathname,
        }));
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [location.pathname]);

  function moveToNavigationItem(targetPath: string) {
    const resolvedTargetPath = toSiteRoute(currentSiteId, targetPath);
    props.onPrimaryNav();
    setSearchState({
      activeIndex: 0,
      open: false,
      pathname: resolvedTargetPath,
      query: "",
    });

    if (
      location.pathname === resolvedTargetPath ||
      location.pathname.startsWith(`${resolvedTargetPath}/`)
    ) {
      return;
    }

    void navigate(resolvedTargetPath);
  }

  function submitSearch() {
    if (normalizedSearchQuery.length === 0) {
      toast.message("이동할 메뉴명을 입력해 주십시오.");
      return;
    }

    const target =
      (highlightedSearchIndex >= 0 ? searchResults[highlightedSearchIndex] : null) ??
      searchResults[0];
    if (!target) {
      toast.error("일치하는 메뉴를 찾지 못했습니다.");
      return;
    }

    moveToNavigationItem(target.to);
  }

  return (
    <div
      ref={searchPanelRef}
      className={cn(
        shellControlSurfaceClass,
        "app-shell-header-search relative hidden min-w-0 lg:block lg:w-[15rem] xl:w-[18rem]",
      )}
    >
      <form
        className="app-shell-header-search-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <InputGroup className="app-shell-header-search-group h-full rounded-md border-0 bg-transparent">
          <InputGroupAddon className={cn(shellIconClass, "h-10 pl-3 pr-1")}>
            <InputGroupText className="h-10 items-center">
              <Search className="h-4 w-4 text-muted-foreground" />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            aria-autocomplete="list"
            aria-controls={searchPanelId}
            aria-expanded={searchOpen}
            className="app-shell-header-search-input h-10 rounded-sm px-3 py-0 text-[0.82rem] leading-[2.5rem] shadow-none"
            placeholder="메뉴 검색 또는 바로 이동"
            role="combobox"
            value={searchQuery}
            onChange={(event) => {
              setSearchState({
                activeIndex: 0,
                open: true,
                pathname: location.pathname,
                query: event.currentTarget.value,
              });
            }}
            onFocus={() => {
              setSearchState((currentState) => ({
                ...currentState,
                open: true,
                pathname: location.pathname,
              }));
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                if (searchResults.length === 0) {
                  return;
                }

                event.preventDefault();
                setSearchState((currentState) => ({
                  ...currentState,
                  activeIndex:
                    highlightedSearchIndex >= searchResults.length - 1
                      ? 0
                      : highlightedSearchIndex + 1,
                  open: true,
                  pathname: location.pathname,
                }));
              }

              if (event.key === "ArrowUp") {
                if (searchResults.length === 0) {
                  return;
                }

                event.preventDefault();
                setSearchState((currentState) => ({
                  ...currentState,
                  activeIndex:
                    highlightedSearchIndex <= 0
                      ? searchResults.length - 1
                      : highlightedSearchIndex - 1,
                  open: true,
                  pathname: location.pathname,
                }));
              }

              if (event.key === "Escape") {
                setSearchState((currentState) => ({
                  ...currentState,
                  activeIndex: 0,
                  open: false,
                  pathname: location.pathname,
                }));
              }
            }}
          />
        </InputGroup>
      </form>

      {searchOpen ? (
        <div
          id={searchPanelId}
          className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 overflow-hidden rounded-sm border border-border bg-background/98 p-1.5 backdrop-blur"
        >
          <div className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {normalizedSearchQuery.length > 0
              ? `검색 결과 ${searchResults.length}건`
              : "빠른 이동"}
          </div>

          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((item, index) => {
                const ItemIcon = item.icon;

                return (
                  <button
                    key={item.to}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 rounded-sm px-3 py-2.5 text-left transition-colors",
                      index === highlightedSearchIndex
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onMouseEnter={() => {
                      setSearchState((currentState) => ({
                        ...currentState,
                        activeIndex: index,
                        pathname: location.pathname,
                      }));
                    }}
                    onClick={() => {
                      moveToNavigationItem(item.to);
                    }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-secondary text-secondary-foreground">
                      <ItemIcon className={shellIconClass} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-[0.84rem] font-semibold text-foreground">
                          {item.label}
                        </strong>
                        <Badge variant="outline" className="shrink-0">
                          {item.groupLabel}
                        </Badge>
                        {props.devMode ? (
                          <Badge
                            variant={
                              item.delivery === "implemented" ? "secondary" : "outline"
                            }
                            className={
                              item.delivery === "implemented"
                                ? "bg-emerald-100 text-emerald-900"
                                : item.delivery === "api_ready"
                                  ? "border-amber-300 bg-amber-50 text-amber-900"
                                  : "border-slate-300 bg-slate-50 text-slate-700"
                            }
                          >
                            {getNavigationDeliveryLabel(item.delivery)}
                          </Badge>
                        ) : null}
                      </div>

                      {props.devMode ? (
                        <>
                          <p className="mt-1 text-xs leading-5 break-words text-muted-foreground">
                            {item.description}
                          </p>
                          <p className="mt-1 text-[11px] leading-4 break-all text-muted-foreground/85">
                            {item.to}
                          </p>
                        </>
                      ) : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-md px-3 py-4 text-sm text-muted-foreground">
                일치하는 메뉴가 없습니다.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
