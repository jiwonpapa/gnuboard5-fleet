import { useMutation, useQuery } from "@tanstack/react-query";
import {
  readSftpFile,
  writeSftpFile,
  type CommandError,
} from "../../api/client";
import type { SftpReadFileResponse } from "../../types/SftpReadFileResponse";
import type { SftpWriteFileInput } from "../../types/SftpWriteFileInput";
import type { SftpWriteFileResponse } from "../../types/SftpWriteFileResponse";

export function siteSftpEditorQueryKey(siteId: string | null, path: string | null) {
  return ["sites", "sftp", "editor", siteId, path] as const;
}

export function useSiteSftpEditor(
  siteId: string | null,
  path: string | null,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const fileQuery = useQuery<SftpReadFileResponse, CommandError>({
    queryKey: siteSftpEditorQueryKey(siteId, path),
    queryFn: () =>
      readSftpFile({
        path: path ?? "",
        site_id: siteId ?? "",
      }),
    enabled: siteId !== null && path !== null && enabled,
    staleTime: 10_000,
  });

  const writeMutation = useMutation<
    SftpWriteFileResponse,
    CommandError,
    SftpWriteFileInput
  >({
    mutationFn: writeSftpFile,
  });

  return {
    file: fileQuery.data ?? null,
    fileError: fileQuery.error,
    fileLoading: fileQuery.isLoading,
    fileRefreshing: fileQuery.isFetching,
    refetchFile: fileQuery.refetch,
    writeFile: writeMutation.mutateAsync,
    writeFileError: writeMutation.error,
    writeFilePending: writeMutation.isPending,
    writeFileResponse: writeMutation.data,
  };
}
