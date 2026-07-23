import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyDebugDevBootstrap,
  getDebugDevBootstrapStatus,
  type CommandError,
} from "../../api/client";
import { masterLockKey } from "../master/use-master-lock";
import { siteCatalogKey } from "../sites/use-site-catalog";
import type { DebugDevBootstrapResult } from "../../types/DebugDevBootstrapResult";
import type { DebugDevBootstrapStatus } from "../../types/DebugDevBootstrapStatus";

export const devBootstrapStatusKey = ["debug", "dev-bootstrap", "status"] as const;

export function useDevBootstrap(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();
  const statusQuery = useQuery<DebugDevBootstrapStatus, CommandError>({
    queryKey: devBootstrapStatusKey,
    queryFn: getDebugDevBootstrapStatus,
    enabled,
    staleTime: 30_000,
  });

  const applyMutation = useMutation<DebugDevBootstrapResult, CommandError>({
    mutationFn: applyDebugDevBootstrap,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: masterLockKey }),
        queryClient.invalidateQueries({ queryKey: siteCatalogKey }),
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "auth",
        }),
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "sites",
        }),
        queryClient.invalidateQueries({ queryKey: devBootstrapStatusKey }),
      ]);
    },
  });

  return {
    apply: applyMutation.mutateAsync,
    applyError: applyMutation.error,
    applyPending: applyMutation.isPending,
    isAvailable: statusQuery.data?.available === true,
    status: statusQuery.data,
    statusError: statusQuery.error,
    statusLoading: statusQuery.isLoading,
  };
}
