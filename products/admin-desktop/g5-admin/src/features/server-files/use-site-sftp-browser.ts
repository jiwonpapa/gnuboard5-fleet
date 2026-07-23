import { useMutation, useQuery } from "@tanstack/react-query";
import {
  chmodSftpPath,
  copySftpPath,
  deleteSftpPath,
  downloadSftpFile,
  listSftpDirectory,
  mkdirSftpDirectory,
  moveSftpPath,
  readSftpFile,
  statSftpPath,
  uploadSftpFile,
  writeSftpFile,
  type CommandError,
} from "../../api/client";
import type { SftpChmodInput } from "../../types/SftpChmodInput";
import type { SftpChmodResponse } from "../../types/SftpChmodResponse";
import type { SftpCopyInput } from "../../types/SftpCopyInput";
import type { SftpCopyResponse } from "../../types/SftpCopyResponse";
import type { SftpDirectoryListResponse } from "../../types/SftpDirectoryListResponse";
import type { SftpDeleteInput } from "../../types/SftpDeleteInput";
import type { SftpDeleteResponse } from "../../types/SftpDeleteResponse";
import type { SftpDownloadInput } from "../../types/SftpDownloadInput";
import type { SftpDownloadResponse } from "../../types/SftpDownloadResponse";
import type { SftpMkdirInput } from "../../types/SftpMkdirInput";
import type { SftpMkdirResponse } from "../../types/SftpMkdirResponse";
import type { SftpMoveInput } from "../../types/SftpMoveInput";
import type { SftpMoveResponse } from "../../types/SftpMoveResponse";
import type { SftpReadFileInput } from "../../types/SftpReadFileInput";
import type { SftpReadFileResponse } from "../../types/SftpReadFileResponse";
import type { SftpStatInput } from "../../types/SftpStatInput";
import type { SftpStatResponse } from "../../types/SftpStatResponse";
import type { SftpUploadInput } from "../../types/SftpUploadInput";
import type { SftpUploadResponse } from "../../types/SftpUploadResponse";
import type { SftpWriteFileInput } from "../../types/SftpWriteFileInput";
import type { SftpWriteFileResponse } from "../../types/SftpWriteFileResponse";

export function sftpDirectoryKey(siteId: string | null, path: string) {
  return ["sites", "sftp", "dir", siteId, path] as const;
}

export function useSiteSftpBrowser(
  siteId: string | null,
  path: string,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const directoryQuery = useQuery<SftpDirectoryListResponse, CommandError>({
    queryKey: sftpDirectoryKey(siteId, path),
    queryFn: () =>
      listSftpDirectory({
        path,
        site_id: siteId ?? "",
      }),
    enabled: siteId !== null && enabled,
    staleTime: 10_000,
  });

  const statMutation = useMutation<SftpStatResponse, CommandError, SftpStatInput>({
    mutationFn: statSftpPath,
  });

  const readMutation = useMutation<SftpReadFileResponse, CommandError, SftpReadFileInput>({
    mutationFn: readSftpFile,
  });

  const downloadMutation = useMutation<
    SftpDownloadResponse,
    CommandError,
    SftpDownloadInput
  >({
    mutationFn: downloadSftpFile,
  });

  const uploadMutation = useMutation<SftpUploadResponse, CommandError, SftpUploadInput>({
    mutationFn: uploadSftpFile,
  });

  const copyMutation = useMutation<SftpCopyResponse, CommandError, SftpCopyInput>({
    mutationFn: copySftpPath,
  });

  const moveMutation = useMutation<SftpMoveResponse, CommandError, SftpMoveInput>({
    mutationFn: moveSftpPath,
  });

  const chmodMutation = useMutation<SftpChmodResponse, CommandError, SftpChmodInput>({
    mutationFn: chmodSftpPath,
  });

  const deleteMutation = useMutation<SftpDeleteResponse, CommandError, SftpDeleteInput>({
    mutationFn: deleteSftpPath,
  });

  const mkdirMutation = useMutation<SftpMkdirResponse, CommandError, SftpMkdirInput>({
    mutationFn: mkdirSftpDirectory,
  });

  const writeMutation = useMutation<
    SftpWriteFileResponse,
    CommandError,
    SftpWriteFileInput
  >({
    mutationFn: writeSftpFile,
  });

  return {
    directory: directoryQuery.data,
    directoryError: directoryQuery.error,
    directoryLoading: directoryQuery.isLoading,
    directoryRefreshing: directoryQuery.isFetching,
    refetchDirectory: directoryQuery.refetch,
    stat: statMutation.mutateAsync,
    statError: statMutation.error,
    statPending: statMutation.isPending,
    statResponse: statMutation.data,
    readFile: readMutation.mutateAsync,
    readFileError: readMutation.error,
    readFilePending: readMutation.isPending,
    readFileResponse: readMutation.data,
    downloadFile: downloadMutation.mutateAsync,
    downloadFileError: downloadMutation.error,
    downloadFilePending: downloadMutation.isPending,
    downloadFileResponse: downloadMutation.data,
    uploadFile: uploadMutation.mutateAsync,
    uploadFileError: uploadMutation.error,
    uploadFilePending: uploadMutation.isPending,
    uploadFileResponse: uploadMutation.data,
    copyPath: copyMutation.mutateAsync,
    copyPathError: copyMutation.error,
    copyPathPending: copyMutation.isPending,
    copyPathResponse: copyMutation.data,
    movePath: moveMutation.mutateAsync,
    movePathError: moveMutation.error,
    movePathPending: moveMutation.isPending,
    movePathResponse: moveMutation.data,
    chmodPath: chmodMutation.mutateAsync,
    chmodPathError: chmodMutation.error,
    chmodPathPending: chmodMutation.isPending,
    chmodPathResponse: chmodMutation.data,
    deletePath: deleteMutation.mutateAsync,
    deleteError: deleteMutation.error,
    deletePending: deleteMutation.isPending,
    deleteResponse: deleteMutation.data,
    mkdir: mkdirMutation.mutateAsync,
    mkdirError: mkdirMutation.error,
    mkdirPending: mkdirMutation.isPending,
    mkdirResponse: mkdirMutation.data,
    writeFile: writeMutation.mutateAsync,
    writeFileError: writeMutation.error,
    writeFilePending: writeMutation.isPending,
    writeFileResponse: writeMutation.data,
  };
}
