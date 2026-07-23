import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { toast } from "sonner";
import {
  buildContextMenuItems,
  cloneActiveSelectionRange,
  getHasEditableSelection,
  getSelectedText,
  resolveEditableTarget,
  type ContextMenuAction,
  type ContextMenuState,
} from "./app-shell-context-menu";
import {
  executeContextMenuAction,
  getContextActionErrorLabel,
} from "./app-shell-context-menu-actions";

export function useAppShellContextMenu(options: {
  routeKey: string;
}) {
  const { routeKey } = options;
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const activeContextMenu =
    contextMenu?.routeKey === routeKey ? contextMenu : null;

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextAction = useCallback(
    async (action: ContextMenuAction) => {
      const currentMenu = activeContextMenu;
      closeContextMenu();

      try {
        await executeContextMenuAction({
          action,
          contextMenu: currentMenu,
        });
      } catch (error) {
        toast.error(`${getContextActionErrorLabel(action)}: ${String(error)}`);
      }
    },
    [activeContextMenu, closeContextMenu],
  );

  const contextMenuItems = useMemo(
    () => buildContextMenuItems(activeContextMenu),
    [activeContextMenu],
  );

  useEffect(() => {
    const handleContextMenuClose = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        event.target instanceof Node &&
        contextMenuRef.current.contains(event.target)
      ) {
        return;
      }

      closeContextMenu();
    };

    const handleContextMenuKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    window.addEventListener("mousedown", handleContextMenuClose);
    window.addEventListener("keydown", handleContextMenuKeydown);

    return () => {
      window.removeEventListener("mousedown", handleContextMenuClose);
      window.removeEventListener("keydown", handleContextMenuKeydown);
    };
  }, [closeContextMenu]);

  const handleContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();

    const editableTarget = resolveEditableTarget(event.target);
    const selectedText = getSelectedText();
    const selectionRange =
      editableTarget?.kind === "contenteditable"
        ? cloneActiveSelectionRange()
        : null;
    const hasEditableSelection = getHasEditableSelection(editableTarget);
    const menuWidth = 260;
    const menuHeight = 240;
    const margin = 12;
    const left = Math.min(event.clientX, window.innerWidth - menuWidth - margin);
    const top = Math.min(event.clientY, window.innerHeight - menuHeight - margin);

    setContextMenu({
      editableTarget,
      hasEditableSelection,
      left: Math.max(margin, left),
      routeKey,
      selectedText,
      selectionRange,
      top: Math.max(margin, top),
    });
  }, [routeKey]);

  return {
    closeContextMenu,
    contextMenu: activeContextMenu,
    contextMenuItems,
    contextMenuRef,
    handleContextAction,
    handleContextMenu,
  };
}
