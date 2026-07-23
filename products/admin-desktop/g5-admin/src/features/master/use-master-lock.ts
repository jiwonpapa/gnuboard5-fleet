import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMasterLockStatus,
  lockMasterLock,
  setupMasterLock,
  type CommandError,
  unlockFastMasterLock,
  unlockMasterLock,
  verifyMasterLockTotp,
} from "../../api/client";
import type { MasterLockSetupInput } from "../../types/MasterLockSetupInput";
import type { MasterLockStatus } from "../../types/MasterLockStatus";
import type { MasterLockTotpInput } from "../../types/MasterLockTotpInput";
import type { MasterLockUnlockInput } from "../../types/MasterLockUnlockInput";

export const masterLockKey = ["master", "lock"] as const;

export function useMasterLock() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<MasterLockStatus, CommandError>({
    queryKey: masterLockKey,
    queryFn: getMasterLockStatus,
    staleTime: 30_000,
  });

  const setupMutation = useMutation<
    MasterLockStatus,
    CommandError,
    MasterLockSetupInput
  >({
    mutationFn: setupMasterLock,
    onSuccess: (status) => {
      queryClient.setQueryData(masterLockKey, status);
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const unlockMutation = useMutation<
    MasterLockStatus,
    CommandError,
    MasterLockUnlockInput
  >({
    mutationFn: unlockMasterLock,
    onSuccess: (status) => {
      queryClient.setQueryData(masterLockKey, status);
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: masterLockKey });
    },
  });

  const unlockFastMutation = useMutation<MasterLockStatus, CommandError>({
    mutationFn: unlockFastMasterLock,
    onSuccess: (status) => {
      queryClient.setQueryData(masterLockKey, status);
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: masterLockKey });
    },
  });

  const lockMutation = useMutation<MasterLockStatus, CommandError>({
    mutationFn: lockMasterLock,
    onSuccess: (status) => {
      queryClient.setQueryData(masterLockKey, status);
      queryClient.removeQueries({ queryKey: ["security"] });
      queryClient.removeQueries({ queryKey: ["auth"] });
      queryClient.removeQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const verifyTotpMutation = useMutation<
    MasterLockStatus,
    CommandError,
    MasterLockTotpInput
  >({
    mutationFn: verifyMasterLockTotp,
    onSuccess: (status) => {
      queryClient.setQueryData(masterLockKey, status);
      queryClient.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  return {
    isLoading: statusQuery.isLoading,
    lock: lockMutation.mutateAsync,
    lockError: lockMutation.error,
    lockPending: lockMutation.isPending,
    refetchStatus: statusQuery.refetch,
    setup: setupMutation.mutateAsync,
    setupError: setupMutation.error,
    setupPending: setupMutation.isPending,
    status: statusQuery.data,
    statusError: statusQuery.error,
    unlock: unlockMutation.mutateAsync,
    unlockFast: unlockFastMutation.mutateAsync,
    unlockFastError: unlockFastMutation.error,
    unlockFastPending: unlockFastMutation.isPending,
    unlockError: unlockMutation.error,
    unlockPending: unlockMutation.isPending,
    verifyTotp: verifyTotpMutation.mutateAsync,
    verifyTotpError: verifyTotpMutation.error,
    verifyTotpPending: verifyTotpMutation.isPending,
  };
}
