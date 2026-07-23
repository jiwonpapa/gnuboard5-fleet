import { useEffect, useRef, useSyncExternalStore } from "react";

export type PageDiagnosticItem = {
  hint?: string;
  label: string;
  value: string | number | boolean | null | undefined;
};

export type PageDiagnosticCommand = {
  apiTarget?: string;
  command: string;
  label: string;
  note?: string;
};

export type PageDiagnosticsDescriptor = {
  commands?: PageDiagnosticCommand[];
  description?: string;
  items?: PageDiagnosticItem[];
  title: string;
};

type RegisteredPageDiagnostics = {
  descriptor: PageDiagnosticsDescriptor;
  ownerId: string;
};

const listeners = new Set<VoidFunction>();
let currentPageDiagnostics: RegisteredPageDiagnostics | null = null;
let ownerSequence = 0;

export function usePageDiagnostics(descriptor: PageDiagnosticsDescriptor | null) {
  const ownerIdRef = useRef(createOwnerId());

  useEffect(() => {
    const ownerId = ownerIdRef.current;

    if (!descriptor) {
      clearPageDiagnostics(ownerId);
      return;
    }

    publishPageDiagnostics(ownerId, descriptor);
    return () => {
      clearPageDiagnostics(ownerId);
    };
  }, [descriptor]);
}

export function usePageDiagnosticsSnapshot() {
  return useSyncExternalStore(
    subscribePageDiagnostics,
    getPageDiagnosticsSnapshot,
    getPageDiagnosticsSnapshot,
  );
}

export function getPageDiagnosticsSnapshot(): PageDiagnosticsDescriptor | null {
  return currentPageDiagnostics?.descriptor ?? null;
}

export function subscribePageDiagnostics(listener: VoidFunction): VoidFunction {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearPageDiagnostics(ownerId?: string) {
  if (!currentPageDiagnostics) {
    return;
  }

  if (ownerId && currentPageDiagnostics.ownerId !== ownerId) {
    return;
  }

  currentPageDiagnostics = null;
  emitChange();
}

function publishPageDiagnostics(
  ownerId: string,
  descriptor: PageDiagnosticsDescriptor,
) {
  currentPageDiagnostics = {
    descriptor,
    ownerId,
  };
  emitChange();
}

function createOwnerId() {
  ownerSequence += 1;
  return `page-diagnostics-${ownerSequence}`;
}

function emitChange() {
  listeners.forEach((listener) => listener());
}
