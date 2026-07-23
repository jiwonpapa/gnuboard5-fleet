import type { RefObject } from "react";
import type { ContextMenuItem, ContextMenuState } from "./app-shell-context-menu";

export function AppShellContextMenuOverlay(props: {
  contextMenu: ContextMenuState | null;
  contextMenuItems: ContextMenuItem[];
  contextMenuRef: RefObject<HTMLDivElement | null>;
  onAction: (action: Extract<ContextMenuItem, { kind: "action" }>["action"]) => void;
}) {
  const { contextMenu, contextMenuItems, contextMenuRef, onAction } = props;

  if (!contextMenu || contextMenuItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={contextMenuRef}
      className="fixed z-50 min-w-[15rem] overflow-hidden rounded-sm border border-border bg-card p-1.5"
      style={{ left: contextMenu.left, top: contextMenu.top }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <div className="flex flex-col gap-1">
        {contextMenuItems.map((item, index) =>
          item.kind === "separator" ? (
            <div
              key={`separator-${index}`}
              className="my-1 h-px bg-border/80"
              aria-hidden="true"
            />
          ) : (
            <button
              key={item.action}
              type="button"
              className="flex min-h-10 w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => {
                onAction(item.action);
              }}
              disabled={item.disabled}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="break-words">{item.label}</span>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
