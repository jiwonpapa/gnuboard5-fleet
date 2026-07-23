import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  closeSshShell,
  openSshShell,
  readSshShell,
  resizeSshShell,
  writeSshShell,
  type CommandError,
} from "../../api/client";
import type { SshSessionStatusResponse } from "../../types/SshSessionStatusResponse";
import type { SshShellCloseInput } from "../../types/SshShellCloseInput";
import type { SshShellOpenInput } from "../../types/SshShellOpenInput";
import type { SshShellReadInput } from "../../types/SshShellReadInput";
import type { SshShellReadResponse } from "../../types/SshShellReadResponse";
import type { SshShellResizeInput } from "../../types/SshShellResizeInput";
import type { SshShellWriteInput } from "../../types/SshShellWriteInput";
import { sshSessionStatusKey } from "./use-site-ssh-session";

export function useSiteSshShell() {
  const queryClient = useQueryClient();
  const [readShellError, setReadShellError] = useState<CommandError | null>(null);
  const [readShellResponse, setReadShellResponse] =
    useState<SshShellReadResponse | null>(null);
  const [resizeShellError, setResizeShellError] = useState<CommandError | null>(null);
  const [writeShellError, setWriteShellError] = useState<CommandError | null>(null);
  const syncSessionStatus = useCallback(
    (response: SshSessionStatusResponse) => {
      queryClient.setQueryData(sshSessionStatusKey(response.site_id), response);
    },
    [queryClient],
  );
  const openMutation = useMutation<
    SshSessionStatusResponse,
    CommandError,
    SshShellOpenInput
  >({
    mutationFn: openSshShell,
    onSuccess: (response) => {
      syncSessionStatus(response);
      setReadShellError(null);
      setReadShellResponse(null);
      setResizeShellError(null);
      setWriteShellError(null);
    },
  });
  const closeMutation = useMutation<
    SshSessionStatusResponse,
    CommandError,
    SshShellCloseInput
  >({
    mutationFn: closeSshShell,
    onSuccess: (response) => {
      syncSessionStatus(response);
      setReadShellResponse(null);
    },
  });

  const readShell = useCallback(async (input: SshShellReadInput) => {
    try {
      setReadShellError(null);
      const response = await readSshShell(input);
      if (
        response.closed ||
        response.exit_status !== null ||
        response.exit_signal !== null
      ) {
        setReadShellResponse((current) => {
          if (
            current?.closed === response.closed &&
            current?.exit_status === response.exit_status &&
            current?.exit_signal === response.exit_signal
          ) {
            return current;
          }

          return response;
        });
      }
      return response;
    } catch (error) {
      const commandError = error as CommandError;
      setReadShellError(commandError);
      throw commandError;
    }
  }, []);

  const writeShell = useCallback(async (input: SshShellWriteInput) => {
    try {
      setWriteShellError(null);
      return await writeSshShell(input);
    } catch (error) {
      const commandError = error as CommandError;
      setWriteShellError(commandError);
      throw commandError;
    }
  }, []);

  const resizeShell = useCallback(async (input: SshShellResizeInput) => {
    try {
      setResizeShellError(null);
      return await resizeSshShell(input);
    } catch (error) {
      const commandError = error as CommandError;
      setResizeShellError(commandError);
      throw commandError;
    }
  }, []);

  return {
    closeShell: closeMutation.mutateAsync,
    closeShellError: closeMutation.error,
    closeShellPending: closeMutation.isPending,
    openShell: openMutation.mutateAsync,
    openShellError: openMutation.error,
    openShellPending: openMutation.isPending,
    readShell,
    readShellError,
    readShellPending: false,
    readShellResponse,
    resizeShell,
    resizeShellError,
    resizeShellPending: false,
    writeShell,
    writeShellError,
    writeShellPending: false,
  };
}
