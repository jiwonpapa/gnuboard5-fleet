import { isTauri } from "@tauri-apps/api/core";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  cloneActiveSelectionRange,
  createCollapsedRange,
  getTextControlSelection,
  replaceTextControlSelection,
  restoreContentEditableSelection,
  type ContextMenuAction,
  type ContextMenuState,
} from "./app-shell-context-menu";
import { requestAppShellRefresh } from "./app-shell-refresh";

export async function executeContextMenuAction(args: {
  action: ContextMenuAction;
  contextMenu: ContextMenuState | null;
}) {
  const { action, contextMenu } = args;

  switch (action) {
    case "cut":
      await handleCut(contextMenu);
      return;
    case "copy":
      await handleCopy(contextMenu);
      return;
    case "paste":
      await handlePaste(contextMenu);
      return;
    case "select-all":
      handleSelectAll(contextMenu);
      return;
    case "reload":
      requestAppShellRefresh();
      return;
  }
}

export function getContextActionErrorLabel(action: ContextMenuAction) {
  switch (action) {
    case "cut":
      return "잘라내기 실패";
    case "copy":
      return "복사 실패";
    case "paste":
      return "붙여넣기 실패";
    case "select-all":
      return "전체 선택 실패";
    case "reload":
      return "새로고침 실패";
  }
}

async function handleCut(contextMenu: ContextMenuState | null) {
  if (!contextMenu?.editableTarget) {
    return;
  }

  if (contextMenu.editableTarget.kind === "text-control") {
    const selection = getTextControlSelection(contextMenu.editableTarget.element);
    if (!selection) {
      return;
    }

    await copyText(selection.text);
    replaceTextControlSelection(contextMenu.editableTarget.element, "");
    return;
  }

  if (!contextMenu.selectionRange) {
    return;
  }

  restoreContentEditableSelection(contextMenu.selectionRange, contextMenu.editableTarget.element);
  await document.execCommand("cut");
}

async function handleCopy(contextMenu: ContextMenuState | null) {
  if (!contextMenu) {
    return;
  }

  if (contextMenu.editableTarget?.kind === "text-control") {
    const selection = getTextControlSelection(contextMenu.editableTarget.element);
    if (!selection) {
      return;
    }

    await copyText(selection.text);
    return;
  }

  if (
    contextMenu.editableTarget?.kind === "contenteditable" &&
    contextMenu.selectionRange
  ) {
    restoreContentEditableSelection(
      contextMenu.selectionRange,
      contextMenu.editableTarget.element,
    );
    await document.execCommand("copy");
    return;
  }

  if (contextMenu.selectedText.length > 0) {
    await copyText(contextMenu.selectedText);
  }
}

async function handlePaste(contextMenu: ContextMenuState | null) {
  if (!contextMenu?.editableTarget) {
    return;
  }

  const clipboardText = await readClipboardText();

  if (contextMenu.editableTarget.kind === "text-control") {
    replaceTextControlSelection(contextMenu.editableTarget.element, clipboardText);
    return;
  }

  const range =
    contextMenu.selectionRange ??
    cloneActiveSelectionRange() ??
    createCollapsedRange(contextMenu.editableTarget.element);
  if (!range) {
    return;
  }

  restoreContentEditableSelection(range, contextMenu.editableTarget.element);
  range.deleteContents();
  range.insertNode(document.createTextNode(clipboardText));
  contextMenu.editableTarget.element.dispatchEvent(
    new Event("input", { bubbles: true }),
  );
}

function handleSelectAll(contextMenu: ContextMenuState | null) {
  if (!contextMenu?.editableTarget) {
    return;
  }

  if (contextMenu.editableTarget.kind === "text-control") {
    const element = contextMenu.editableTarget.element;
    element.focus();
    element.setSelectionRange(0, element.value.length);
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(contextMenu.editableTarget.element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  contextMenu.editableTarget.element.focus();
}

async function copyText(text: string) {
  if (isTauri()) {
    await writeText(text);
    return;
  }

  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    throw new Error("클립보드 텍스트 쓰기 API를 지원하지 않습니다.");
  }

  await navigator.clipboard.writeText(text);
}

async function readClipboardText() {
  if (isTauri()) {
    return await readText();
  }

  if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
    throw new Error("클립보드 텍스트 읽기 API를 지원하지 않습니다.");
  }

  return await navigator.clipboard.readText();
}
