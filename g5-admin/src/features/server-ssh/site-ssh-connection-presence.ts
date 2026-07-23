import { useSyncExternalStore } from "react";

const SSH_CONNECTION_PRESENCE_EVENT = "g5-admin:ssh-connection-presence";
const presenceListeners = new Set<VoidFunction>();

export function useSiteSshConnectionPresence(siteId: string | null) {
  return useSyncExternalStore(
    subscribeSshConnectionPresence,
    () => getSshConnectionPresence(siteId),
    () => false,
  );
}

export function publishSshConnectionPresence(siteId: string | null, connected: boolean) {
  if (!siteId || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(siteId), connected ? "true" : "false");
  emitPresenceChange();
}

function subscribeSshConnectionPresence(listener: VoidFunction) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key?.startsWith("g5-admin:ssh-connection-presence:")) {
      return;
    }
    listener();
  };
  const handlePresenceEvent = () => listener();

  presenceListeners.add(listener);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(SSH_CONNECTION_PRESENCE_EVENT, handlePresenceEvent);

  return () => {
    presenceListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SSH_CONNECTION_PRESENCE_EVENT, handlePresenceEvent);
  };
}

function emitPresenceChange() {
  presenceListeners.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SSH_CONNECTION_PRESENCE_EVENT));
  }
}

function getSshConnectionPresence(siteId: string | null) {
  if (!siteId || typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(storageKey(siteId)) === "true";
}

function storageKey(siteId: string) {
  return `g5-admin:ssh-connection-presence:${siteId}`;
}
