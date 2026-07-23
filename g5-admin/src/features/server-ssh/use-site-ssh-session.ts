import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  connectSsh,
  disconnectSsh,
  getSshStatus,
  type CommandError,
} from "../../api/client";
import type { SshConnectInput } from "../../types/SshConnectInput";
import type { SshDisconnectInput } from "../../types/SshDisconnectInput";
import type { SshSessionStatusResponse } from "../../types/SshSessionStatusResponse";
import { publishSshConnectionPresence } from "./site-ssh-connection-presence";

export function sshSessionStatusKey(siteId: string | null) {
  return ["sites", "ssh-session", siteId] as const;
}

export function useSiteSshSession(siteId: string | null, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;
  const statusQuery = useQuery<SshSessionStatusResponse, CommandError>({
    queryKey: sshSessionStatusKey(siteId),
    queryFn: () => getSshStatus(siteId ?? ""),
    enabled: siteId !== null && enabled,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 10_000,
  });

  const sync = (response: SshSessionStatusResponse) => {
    queryClient.setQueryData(sshSessionStatusKey(response.site_id), response);
  };

  const connectMutation = useMutation<
    SshSessionStatusResponse,
    CommandError,
    SshConnectInput
  >({
    mutationFn: connectSsh,
    onSuccess: sync,
  });
  const disconnectMutation = useMutation<
    SshSessionStatusResponse,
    CommandError,
    SshDisconnectInput
  >({
    mutationFn: disconnectSsh,
    onSuccess: sync,
  });

  useEffect(() => {
    publishSshConnectionPresence(siteId, statusQuery.data?.connected ?? false);
  }, [siteId, statusQuery.data?.connected]);

  return {
    connect: connectMutation.mutateAsync,
    connectError: connectMutation.error,
    connectPending: connectMutation.isPending,
    resetConnectError: connectMutation.reset,
    disconnect: disconnectMutation.mutateAsync,
    disconnectError: disconnectMutation.error,
    disconnectPending: disconnectMutation.isPending,
    isLoading: statusQuery.isLoading,
    refetchStatus: statusQuery.refetch,
    response: statusQuery.data,
    responseError: statusQuery.error,
  };
}
