import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const refreshListeners = new Set<VoidFunction>();

export function requestAppShellRefresh() {
  refreshListeners.forEach((listener) => listener());
}

export function subscribeAppShellRefresh(listener: VoidFunction) {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
}

export function useAppShellRefreshBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeAppShellRefresh(() => {
      void queryClient.refetchQueries({
        predicate: (query) => {
          if (!query.isActive()) {
            return false;
          }
          const scope = query.queryKey[0];
          return scope !== "master" && scope !== "sites" && scope !== "auth";
        },
      });
    });
  }, [queryClient]);
}
