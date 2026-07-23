import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeMasterPassword,
  disableTotp,
  enableTotp,
  getSecuritySettings,
  startTotpEnrollment,
  type CommandError,
  updateSecurityIdleTimeout,
} from "../../api/client";
import type { MasterPasswordChangeInput } from "../../types/MasterPasswordChangeInput";
import type { SecurityIdleTimeoutUpdateInput } from "../../types/SecurityIdleTimeoutUpdateInput";
import type { SecuritySettings } from "../../types/SecuritySettings";
import type { TotpDisableInput } from "../../types/TotpDisableInput";
import type { TotpEnrollmentChallenge } from "../../types/TotpEnrollmentChallenge";
import type { TotpSetupStartInput } from "../../types/TotpSetupStartInput";
import type { TotpVerifyEnableInput } from "../../types/TotpVerifyEnableInput";
import { masterLockKey } from "../master/use-master-lock";

export const securitySettingsKey = ["security", "settings"] as const;

export function useSecuritySettings(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<SecuritySettings, CommandError>({
    queryKey: securitySettingsKey,
    queryFn: getSecuritySettings,
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });

  const changePasswordMutation = useMutation<
    SecuritySettings,
    CommandError,
    MasterPasswordChangeInput
  >({
    mutationFn: changeMasterPassword,
    onSuccess: (settings) => {
      queryClient.setQueryData(securitySettingsKey, settings);
    },
  });

  const updateIdleTimeoutMutation = useMutation<
    SecuritySettings,
    CommandError,
    SecurityIdleTimeoutUpdateInput
  >({
    mutationFn: updateSecurityIdleTimeout,
    onSuccess: (settings) => {
      queryClient.setQueryData(securitySettingsKey, settings);
    },
  });

  const startTotpMutation = useMutation<
    TotpEnrollmentChallenge,
    CommandError,
    TotpSetupStartInput
  >({
    mutationFn: startTotpEnrollment,
  });

  const enableTotpMutation = useMutation<
    SecuritySettings,
    CommandError,
    TotpVerifyEnableInput
  >({
    mutationFn: enableTotp,
    onSuccess: (settings) => {
      queryClient.setQueryData(securitySettingsKey, settings);
      queryClient.invalidateQueries({ queryKey: masterLockKey });
    },
  });

  const disableTotpMutation = useMutation<
    SecuritySettings,
    CommandError,
    TotpDisableInput
  >({
    mutationFn: disableTotp,
    onSuccess: (settings) => {
      queryClient.setQueryData(securitySettingsKey, settings);
      queryClient.invalidateQueries({ queryKey: masterLockKey });
    },
  });

  return {
    changePassword: changePasswordMutation.mutateAsync,
    changePasswordError: changePasswordMutation.error,
    changePasswordPending: changePasswordMutation.isPending,
    disableTotp: disableTotpMutation.mutateAsync,
    disableTotpError: disableTotpMutation.error,
    disableTotpPending: disableTotpMutation.isPending,
    enableTotp: enableTotpMutation.mutateAsync,
    enableTotpError: enableTotpMutation.error,
    enableTotpPending: enableTotpMutation.isPending,
    isLoading: settingsQuery.isLoading,
    refetchSettings: settingsQuery.refetch,
    settings: settingsQuery.data,
    settingsError: settingsQuery.error,
    startTotpEnrollment: startTotpMutation.mutateAsync,
    startTotpEnrollmentError: startTotpMutation.error,
    startTotpEnrollmentPending: startTotpMutation.isPending,
    totpChallenge: startTotpMutation.data,
    clearTotpChallenge: startTotpMutation.reset,
    updateIdleTimeout: updateIdleTimeoutMutation.mutateAsync,
    updateIdleTimeoutError: updateIdleTimeoutMutation.error,
    updateIdleTimeoutPending: updateIdleTimeoutMutation.isPending,
  };
}
