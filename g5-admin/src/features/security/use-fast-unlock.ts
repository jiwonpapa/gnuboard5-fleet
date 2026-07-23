import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  disableFastUnlock,
  enableFastUnlock,
  getFastUnlockStatus,
  type CommandError,
} from "../../api/client";
import type { FastUnlockStatus } from "../../types/FastUnlockStatus";
import type { SecurityStepUpAuthInput } from "../../types/SecurityStepUpAuthInput";
import { masterLockKey } from "../master/use-master-lock";
import { securitySettingsKey } from "./use-security-settings";

export const fastUnlockStatusKey = ["security", "fast-unlock"] as const;

export function useFastUnlock(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<FastUnlockStatus, CommandError>({
    queryKey: fastUnlockStatusKey,
    queryFn: getFastUnlockStatus,
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });

  const enableMutation = useMutation<FastUnlockStatus, CommandError, SecurityStepUpAuthInput>({
    mutationFn: enableFastUnlock,
    onSuccess: (status) => {
      queryClient.setQueryData(fastUnlockStatusKey, status);
      queryClient.invalidateQueries({ queryKey: masterLockKey });
      queryClient.invalidateQueries({ queryKey: securitySettingsKey });
    },
  });

  const disableMutation = useMutation<FastUnlockStatus, CommandError, SecurityStepUpAuthInput>({
    mutationFn: disableFastUnlock,
    onSuccess: (status) => {
      queryClient.setQueryData(fastUnlockStatusKey, status);
      queryClient.invalidateQueries({ queryKey: masterLockKey });
      queryClient.invalidateQueries({ queryKey: securitySettingsKey });
    },
  });

  return {
    disable: disableMutation.mutateAsync,
    disableError: disableMutation.error,
    disablePending: disableMutation.isPending,
    enable: enableMutation.mutateAsync,
    enableError: enableMutation.error,
    enablePending: enableMutation.isPending,
    isLoading: statusQuery.isLoading,
    refetchStatus: statusQuery.refetch,
    status: statusQuery.data,
    statusError: statusQuery.error,
  };
}
