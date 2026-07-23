import { createElement } from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMocks = vi.hoisted(() => ({
  openDebugDevtools: vi.fn().mockResolvedValue("opened"),
}));

vi.mock("../api/client", () => ({
  openDebugDevtools: apiClientMocks.openDebugDevtools,
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => true),
}));

import {
  isDesktopDevtoolsShortcut,
  useDesktopDevtoolsHotkey,
} from "./devtools";

describe("isDesktopDevtoolsShortcut", () => {
  beforeEach(() => {
    apiClientMocks.openDebugDevtools.mockClear();
  });

  it("matches browser-style desktop devtools shortcuts", () => {
    expect(
      isDesktopDevtoolsShortcut({
        altKey: false,
        ctrlKey: false,
        key: "F11",
        metaKey: false,
        repeat: false,
        shiftKey: false,
      }),
    ).toBe(true);

    expect(
      isDesktopDevtoolsShortcut({
        altKey: false,
        ctrlKey: true,
        key: "I",
        metaKey: false,
        repeat: false,
        shiftKey: true,
      }),
    ).toBe(true);

    expect(
      isDesktopDevtoolsShortcut({
        altKey: true,
        ctrlKey: false,
        key: "i",
        metaKey: true,
        repeat: false,
        shiftKey: false,
      }),
    ).toBe(true);
  });

  it("ignores repeated or unrelated keys", () => {
    expect(
      isDesktopDevtoolsShortcut({
        altKey: false,
        ctrlKey: false,
        key: "F11",
        metaKey: false,
        repeat: true,
        shiftKey: false,
      }),
    ).toBe(false);

    expect(
      isDesktopDevtoolsShortcut({
        altKey: false,
        ctrlKey: true,
        key: "K",
        metaKey: false,
        repeat: false,
        shiftKey: true,
      }),
    ).toBe(false);
  });

  it("opens desktop devtools on F12 when the hotkey hook is enabled", async () => {
    function Harness() {
      useDesktopDevtoolsHotkey(true);
      return null;
    }

    render(createElement(Harness));
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        key: "F12",
      }),
    );

    await Promise.resolve();

    expect(apiClientMocks.openDebugDevtools).toHaveBeenCalledTimes(1);
  });

  it("does not open desktop devtools when the hotkey hook is disabled", async () => {
    function Harness() {
      useDesktopDevtoolsHotkey(false);
      return null;
    }

    render(createElement(Harness));
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        key: "F12",
      }),
    );

    await Promise.resolve();

    expect(apiClientMocks.openDebugDevtools).not.toHaveBeenCalled();
  });
});
