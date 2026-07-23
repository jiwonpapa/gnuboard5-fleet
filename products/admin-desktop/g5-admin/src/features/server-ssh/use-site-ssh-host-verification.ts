import { useMutation } from "@tanstack/react-query";
import {
  getSshHostVerificationStatus,
  trustSshHostVerification,
  type CommandError,
} from "../../api/client";
import type { SshHostTrustInput } from "../../types/SshHostTrustInput";
import type { SshHostVerificationInput } from "../../types/SshHostVerificationInput";
import type { SshHostVerificationResponse } from "../../types/SshHostVerificationResponse";

export function useSiteSshHostVerification() {
  const inspectMutation = useMutation<
    SshHostVerificationResponse,
    CommandError,
    SshHostVerificationInput
  >({
    mutationFn: getSshHostVerificationStatus,
  });
  const trustMutation = useMutation<
    SshHostVerificationResponse,
    CommandError,
    SshHostTrustInput
  >({
    mutationFn: trustSshHostVerification,
  });

  return {
    error: trustMutation.error ?? inspectMutation.error,
    inspect: inspectMutation.mutateAsync,
    inspectPending: inspectMutation.isPending,
    reset: () => {
      inspectMutation.reset();
      trustMutation.reset();
    },
    response: trustMutation.data ?? inspectMutation.data,
    trust: trustMutation.mutateAsync,
    trustPending: trustMutation.isPending,
  };
}
