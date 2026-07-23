import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { readBuiltEntryScript } from "./build-web-guard-lib.mjs";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const G5_ADMIN_DIR = resolve(ROOT, "g5-admin");
const EXPECTED_INTRO_TEXT = "여러 그누보드 사이트를";
const DEFAULT_SMOKE_TIMEOUT_MS = 5_000;
const requireFromG5Admin = createRequire(resolve(G5_ADMIN_DIR, "package.json"));
const { JSDOM } = requireFromG5Admin("jsdom");

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runDistSmokeCheck({ g5AdminDir: G5_ADMIN_DIR }).catch((error) => {
    console.error(
      `[smoke] production bundle smoke failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exit(1);
  });
}

export async function runDistSmokeCheck(options) {
  const g5AdminDir = options.g5AdminDir ?? G5_ADMIN_DIR;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SMOKE_TIMEOUT_MS;
  const distDir = resolve(g5AdminDir, "dist");
  const indexHtmlPath = resolve(distDir, "index.html");
  const entryScriptPath = resolve(
    distDir,
    readBuiltEntryScript(indexHtmlPath).replace(/^\//, ""),
  );

  const dom = new JSDOM(readFileSync(indexHtmlPath, "utf8"), {
    pretendToBeVisual: true,
    runScripts: "outside-only",
    url: "http://127.0.0.1:4173/",
  });
  const { window } = dom;
  const errors = [];
  const cleanupDomGlobals = installDomGlobals(window);

  window.addEventListener("error", (event) => {
    if (event.error) {
      errors.push(event.error);
    }
  });
  window.addEventListener("unhandledrejection", (event) => {
    errors.push(event.reason);
  });

  try {
    await withTimeout(async () => {
      await import(`${pathToFileURL(entryScriptPath).href}?smoke=${Date.now()}`);
      await waitFor(() => {
        if (errors.length > 0) {
          throw errors[0];
        }

        const text = window.document.body.textContent ?? "";
        if (!text.includes(EXPECTED_INTRO_TEXT)) {
          throw new Error(
            `첫 렌더에 기대 텍스트가 없습니다: "${EXPECTED_INTRO_TEXT}"`,
          );
        }
      });
      await settlePendingEffects();
    }, timeoutMs);
    console.log("[smoke] production bundle intro rendered successfully");
  } finally {
    cleanupDomGlobals();
    dom.window.close();
  }
}

function installDomGlobals(window) {
  const previousDescriptors = new Map();
  const timers = new Set();
  const intervals = new Set();
  const messageChannels = new Set();
  const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
  const nativeClearTimeout = globalThis.clearTimeout.bind(globalThis);
  const nativeSetInterval = globalThis.setInterval.bind(globalThis);
  const nativeClearInterval = globalThis.clearInterval.bind(globalThis);
  const NativeMessageChannel = globalThis.MessageChannel;

  const defineTrackedGlobal = (name, value) => {
    if (!previousDescriptors.has(name)) {
      previousDescriptors.set(
        name,
        Object.getOwnPropertyDescriptor(globalThis, name),
      );
    }
    defineGlobal(name, value);
  };

  defineTrackedGlobal("setTimeout", (callback, delay, ...args) => {
    const handle = nativeSetTimeout(() => {
      timers.delete(handle);
      callback(...args);
    }, delay);
    timers.add(handle);
    return handle;
  });
  defineTrackedGlobal("clearTimeout", (handle) => {
    timers.delete(handle);
    return nativeClearTimeout(handle);
  });
  defineTrackedGlobal("setInterval", (callback, delay, ...args) => {
    const handle = nativeSetInterval(callback, delay, ...args);
    intervals.add(handle);
    return handle;
  });
  defineTrackedGlobal("clearInterval", (handle) => {
    intervals.delete(handle);
    return nativeClearInterval(handle);
  });
  if (typeof NativeMessageChannel === "function") {
    class TrackedMessageChannel extends NativeMessageChannel {
      constructor(...args) {
        super(...args);
        messageChannels.add(this);
      }
    }

    defineTrackedGlobal("MessageChannel", TrackedMessageChannel);
    window.MessageChannel = TrackedMessageChannel;
  }

  defineTrackedGlobal("window", window);
  defineTrackedGlobal("document", window.document);
  defineTrackedGlobal("navigator", window.navigator);
  defineTrackedGlobal("location", window.location);
  defineTrackedGlobal("localStorage", window.localStorage);
  defineTrackedGlobal("sessionStorage", window.sessionStorage);
  defineTrackedGlobal("HTMLElement", window.HTMLElement);
  defineTrackedGlobal("Element", window.Element);
  defineTrackedGlobal("Node", window.Node);
  defineTrackedGlobal("Event", window.Event);
  defineTrackedGlobal("CustomEvent", window.CustomEvent);
  defineTrackedGlobal("EventTarget", window.EventTarget);
  defineTrackedGlobal("MutationObserver", window.MutationObserver);
  defineTrackedGlobal("DOMParser", window.DOMParser);
  defineTrackedGlobal("SVGElement", window.SVGElement);
  defineTrackedGlobal("getComputedStyle", window.getComputedStyle.bind(window));
  defineTrackedGlobal("requestAnimationFrame", (callback) =>
    setTimeout(() => callback(Date.now()), 0),
  );
  defineTrackedGlobal("cancelAnimationFrame", (handle) => clearTimeout(handle));
  defineTrackedGlobal("crypto", globalThis.crypto ?? window.crypto);
  defineTrackedGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  defineTrackedGlobal("fetch", async () => new Response("", { status: 200 }));
  window.fetch = globalThis.fetch;

  window.scrollTo = () => undefined;
  window.matchMedia = (query) => ({
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => true,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  });

  class NoopResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  class NoopIntersectionObserver {
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  }

  defineTrackedGlobal("ResizeObserver", NoopResizeObserver);
  defineTrackedGlobal("IntersectionObserver", NoopIntersectionObserver);

  return () => {
    for (const handle of timers) {
      nativeClearTimeout(handle);
    }
    timers.clear();

    for (const handle of intervals) {
      nativeClearInterval(handle);
    }
    intervals.clear();

    for (const channel of messageChannels) {
      channel.port1.close();
      channel.port2.close();
    }
    messageChannels.clear();

    for (const [name, descriptor] of Array.from(previousDescriptors).reverse()) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete globalThis[name];
      }
    }
  };
}

function defineGlobal(name, value) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value,
    writable: true,
  });
}

async function waitFor(assertion, timeoutMs = 3_000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("production bundle smoke timeout");
}

function settlePendingEffects() {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
}

async function withTimeout(operation, timeoutMs) {
  let timeoutHandle;
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new Error(`production bundle smoke timeout after ${timeoutMs}ms`),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}
