import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class LocalStorageMock {
  private store = new Map<string, string>();

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key) ?? null : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  get length() {
    return this.store.size;
  }
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ResizeObserverMock,
  });
}

if (typeof globalThis !== "undefined" && !("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ResizeObserverMock,
  });
}

const localStorageMock = new LocalStorageMock();

function installLocalStorageMock(target: object) {
  Object.defineProperty(target, "localStorage", {
    configurable: true,
    writable: true,
    value: localStorageMock,
  });
}

if (typeof window !== "undefined") {
  installLocalStorageMock(window);
}

if (typeof globalThis !== "undefined") {
  installLocalStorageMock(globalThis);
}

afterEach(() => {
  cleanup();
});
