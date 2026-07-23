import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildContextMenuItems,
  cloneActiveSelectionRange,
  createCollapsedRange,
  getHasEditableSelection,
  getSelectedText,
  getTextControlSelection,
  replaceTextControlSelection,
  resolveEditableTarget,
  restoreContentEditableSelection,
  type ContextMenuState,
} from "./app-shell-context-menu";

describe("app-shell-context-menu", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.getSelection()?.removeAllRanges();
  });

  it("builds only reload action for plain surfaces", () => {
    const items = buildContextMenuItems(createContextMenuState());

    expect(items.map((item) => ("action" in item ? item.label : "separator"))).toEqual([
      "새로고침",
    ]);
  });

  it("builds editable text-control actions without capture actions", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = "abcdef";
    input.setSelectionRange(1, 4);

    const items = buildContextMenuItems(
      createContextMenuState({
        editableTarget: {
          element: input,
          kind: "text-control",
        },
        hasEditableSelection: true,
      }),
    );

    expect(items.map((item) => ("action" in item ? item.label : "separator"))).toEqual([
      "잘라내기",
      "복사",
      "붙여넣기",
      "전체 선택",
      "separator",
      "새로고침",
    ]);
  });

  it("builds a copy-only menu when plain text is selected outside editable fields", () => {
    const items = buildContextMenuItems(
      createContextMenuState({
        selectedText: "선택 텍스트",
      }),
    );

    expect(items.map((item) => ("action" in item ? item.label : "separator"))).toEqual([
      "복사",
      "separator",
      "새로고침",
    ]);
  });

  it("resolves text, textarea, and contenteditable targets while rejecting unsupported inputs", () => {
    document.body.innerHTML = `
      <div>
        <input id="text" type="text" />
        <input id="checkbox" type="checkbox" />
        <textarea id="textarea"></textarea>
        <div id="editable" contenteditable="true"><span id="editable-child">edit</span></div>
      </div>
    `;

    const textInput = document.getElementById("text");
    const checkbox = document.getElementById("checkbox");
    const textarea = document.getElementById("textarea");
    const editableChild = document.getElementById("editable-child");
    const editable = document.getElementById("editable");

    if (editable instanceof HTMLElement) {
      Object.defineProperty(editable, "isContentEditable", {
        configurable: true,
        value: true,
      });
    }

    expect(resolveEditableTarget(textInput)?.kind).toBe("text-control");
    expect(resolveEditableTarget(textarea)?.kind).toBe("text-control");
    expect(resolveEditableTarget(editableChild)?.kind).toBe("contenteditable");
    expect(resolveEditableTarget(checkbox)).toBeNull();
    expect(resolveEditableTarget(editable)).not.toBeNull();
    expect(resolveEditableTarget(null)).toBeNull();
  });

  it("returns null for unresolved contenteditable candidates and absent selections", () => {
    const inertEditable = document.createElement("div");
    inertEditable.setAttribute("contenteditable", "true");
    document.body.append(inertEditable);

    expect(resolveEditableTarget(inertEditable)).toBeNull();
    expect(cloneActiveSelectionRange()).toBeNull();
  });

  it("detects editable selections for text controls and contenteditable regions", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.value = "abcdef";
    input.setSelectionRange(2, 5);

    expect(
      getHasEditableSelection({
        element: input,
        kind: "text-control",
      }),
    ).toBe(true);

    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    editable.textContent = "editable text";
    document.body.append(editable);

    const range = document.createRange();
    range.selectNodeContents(editable.firstChild ?? editable);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(
      getHasEditableSelection({
        element: editable,
        kind: "contenteditable",
      }),
    ).toBe(true);
    expect(getSelectedText()).toBe("editable text");
    expect(cloneActiveSelectionRange()?.toString()).toBe("editable text");
  });

  it("extracts and replaces text-control selections while dispatching input events", () => {
    const textarea = document.createElement("textarea");
    textarea.value = "hello world";
    textarea.setSelectionRange(6, 11);
    const inputSpy = vi.fn();
    textarea.addEventListener("input", inputSpy);

    expect(getTextControlSelection(textarea)).toEqual({
      end: 11,
      start: 6,
      text: "world",
    });

    replaceTextControlSelection(textarea, "admin");

    expect(textarea.value).toBe("hello admin");
    expect(inputSpy).toHaveBeenCalledTimes(1);
    textarea.setSelectionRange(2, 2);
    expect(getTextControlSelection(textarea)).toBeNull();
  });

  it("restores selections and creates collapsed ranges at the end of contenteditable elements", () => {
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    editable.textContent = "admin";
    document.body.append(editable);

    const collapsedRange = createCollapsedRange(editable);
    restoreContentEditableSelection(collapsedRange, editable);

    expect(window.getSelection()?.rangeCount).toBe(1);
    expect(window.getSelection()?.getRangeAt(0).collapsed).toBe(true);
    expect(window.getSelection()?.getRangeAt(0).endContainer).toBe(editable);
    expect(window.getSelection()?.getRangeAt(0).endOffset).toBe(editable.childNodes.length);
  });
});

function createContextMenuState(
  overrides: Partial<ContextMenuState> = {},
): ContextMenuState {
  return {
    editableTarget: null,
    hasEditableSelection: false,
    left: 0,
    routeKey: "/overview",
    selectedText: "",
    selectionRange: null,
    top: 0,
    ...overrides,
  };
}
