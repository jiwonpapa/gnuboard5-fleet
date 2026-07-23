import {
  ClipboardPaste,
  Copy,
  Files,
  RefreshCcw,
  Scissors,
  type LucideIcon,
} from "lucide-react";

export type EditableTarget =
  | {
      element: HTMLInputElement | HTMLTextAreaElement;
      kind: "text-control";
    }
  | {
      element: HTMLElement;
      kind: "contenteditable";
    };

export type ContextMenuState = {
  editableTarget: EditableTarget | null;
  hasEditableSelection: boolean;
  left: number;
  routeKey: string;
  selectedText: string;
  selectionRange: Range | null;
  top: number;
};

export type ContextMenuAction =
  | "copy"
  | "cut"
  | "paste"
  | "reload"
  | "select-all";

export type ContextMenuItem =
  | {
      action: ContextMenuAction;
      disabled?: boolean;
      icon: LucideIcon;
      kind: "action";
      label: string;
    }
  | {
      kind: "separator";
    };

const TEXT_INPUT_TYPES = new Set([
  "",
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

export function buildContextMenuItems(
  contextMenu: ContextMenuState | null,
): ContextMenuItem[] {
  if (!contextMenu) {
    return [];
  }

  const items: ContextMenuItem[] = [];

  if (contextMenu.editableTarget) {
    items.push({
      action: "cut",
      disabled: !contextMenu.hasEditableSelection,
      icon: Scissors,
      kind: "action",
      label: "잘라내기",
    });
    items.push({
      action: "copy",
      disabled: !contextMenu.hasEditableSelection,
      icon: Copy,
      kind: "action",
      label: "복사",
    });
    items.push({
      action: "paste",
      icon: ClipboardPaste,
      kind: "action",
      label: "붙여넣기",
    });
    items.push({
      action: "select-all",
      icon: Files,
      kind: "action",
      label: "전체 선택",
    });
  } else if (contextMenu.selectedText.length > 0) {
    items.push({
      action: "copy",
      icon: Copy,
      kind: "action",
      label: "복사",
    });
  }

  if (items.length > 0) {
    items.push({ kind: "separator" });
  }

  items.push({
    action: "reload",
    icon: RefreshCcw,
    kind: "action",
    label: "새로고침",
  });

  return items;
}

export function resolveEditableTarget(target: EventTarget | null): EditableTarget | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const candidate = target.closest(
    "input, textarea, [contenteditable='true'], [contenteditable='plaintext-only']",
  );

  if (!candidate) {
    return null;
  }

  if (candidate instanceof HTMLTextAreaElement) {
    return {
      element: candidate,
      kind: "text-control",
    };
  }

  if (candidate instanceof HTMLInputElement) {
    const normalizedType = candidate.type.toLowerCase();
    if (!TEXT_INPUT_TYPES.has(normalizedType)) {
      return null;
    }

    return {
      element: candidate,
      kind: "text-control",
    };
  }

  if (candidate instanceof HTMLElement && candidate.isContentEditable) {
    return {
      element: candidate,
      kind: "contenteditable",
    };
  }

  return null;
}

export function getSelectedText() {
  return window.getSelection()?.toString().trim() ?? "";
}

export function cloneActiveSelectionRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  return selection.getRangeAt(0).cloneRange();
}

export function getHasEditableSelection(editableTarget: EditableTarget | null) {
  if (!editableTarget) {
    return false;
  }

  if (editableTarget.kind === "text-control") {
    const { selectionEnd, selectionStart } = editableTarget.element;
    return (
      selectionStart !== null &&
      selectionEnd !== null &&
      selectionEnd > selectionStart
    );
  }

  const selection = window.getSelection();
  return Boolean(selection && selection.toString().trim().length > 0);
}

export function getTextControlSelection(
  element: HTMLInputElement | HTMLTextAreaElement,
): { end: number; start: number; text: string } | null {
  const start = element.selectionStart;
  const end = element.selectionEnd;
  if (start === null || end === null || end <= start) {
    return null;
  }

  return {
    end,
    start,
    text: element.value.slice(start, end),
  };
}

export function replaceTextControlSelection(
  element: HTMLInputElement | HTMLTextAreaElement,
  nextText: string,
) {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? element.value.length;

  element.focus();
  element.setRangeText(nextText, start, end, "end");
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

export function restoreContentEditableSelection(range: Range, element: HTMLElement) {
  element.focus();
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function createCollapsedRange(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  return range;
}
