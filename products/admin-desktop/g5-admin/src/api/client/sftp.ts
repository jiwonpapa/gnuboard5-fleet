import type { SftpChmodInput } from "../../types/SftpChmodInput";
import type { SftpChmodResponse } from "../../types/SftpChmodResponse";
import type { SftpCopyInput } from "../../types/SftpCopyInput";
import type { SftpCopyResponse } from "../../types/SftpCopyResponse";
import type { SftpDeleteInput } from "../../types/SftpDeleteInput";
import type { SftpDeleteResponse } from "../../types/SftpDeleteResponse";
import type { SftpDirectoryListResponse } from "../../types/SftpDirectoryListResponse";
import type { SftpDownloadInput } from "../../types/SftpDownloadInput";
import type { SftpDownloadResponse } from "../../types/SftpDownloadResponse";
import type { SftpListDirInput } from "../../types/SftpListDirInput";
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
import { invokeCommand } from "./core";

export async function listSftpDirectory(
  input: SftpListDirInput,
): Promise<SftpDirectoryListResponse> {
  return invokeCommand<SftpDirectoryListResponse>("cmd_sftp_list_dir", { input });
}

export async function statSftpPath(
  input: SftpStatInput,
): Promise<SftpStatResponse> {
  return invokeCommand<SftpStatResponse>("cmd_sftp_stat", { input });
}

export async function readSftpFile(
  input: SftpReadFileInput,
): Promise<SftpReadFileResponse> {
  return invokeCommand<SftpReadFileResponse>("cmd_sftp_read_file", { input });
}

export async function downloadSftpFile(
  input: SftpDownloadInput,
): Promise<SftpDownloadResponse> {
  return invokeCommand<SftpDownloadResponse>("cmd_sftp_download", { input });
}

export async function uploadSftpFile(
  input: SftpUploadInput,
): Promise<SftpUploadResponse> {
  return invokeCommand<SftpUploadResponse>("cmd_sftp_upload", { input });
}

export async function copySftpPath(
  input: SftpCopyInput,
): Promise<SftpCopyResponse> {
  return invokeCommand<SftpCopyResponse>("cmd_sftp_copy", { input });
}

export async function moveSftpPath(
  input: SftpMoveInput,
): Promise<SftpMoveResponse> {
  return invokeCommand<SftpMoveResponse>("cmd_sftp_move", { input });
}

export async function chmodSftpPath(
  input: SftpChmodInput,
): Promise<SftpChmodResponse> {
  return invokeCommand<SftpChmodResponse>("cmd_sftp_chmod", { input });
}

export async function deleteSftpPath(
  input: SftpDeleteInput,
): Promise<SftpDeleteResponse> {
  return invokeCommand<SftpDeleteResponse>("cmd_sftp_delete", { input });
}

export async function mkdirSftpDirectory(
  input: SftpMkdirInput,
): Promise<SftpMkdirResponse> {
  return invokeCommand<SftpMkdirResponse>("cmd_sftp_mkdir", { input });
}

export async function writeSftpFile(
  input: SftpWriteFileInput,
): Promise<SftpWriteFileResponse> {
  return invokeCommand<SftpWriteFileResponse>("cmd_sftp_write_file", { input });
}
