import { isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import type { SftpDirectoryEntry } from "../../types/SftpDirectoryEntry";

export async function selectSftpDownloadPath(defaultFileName: string) {
  if (!isTauri()) {
    toast.error("SFTP 다운로드는 데스크톱 앱에서만 지원합니다.");
    return null;
  }

  return save({
    defaultPath: defaultFileName,
    title: "SFTP 파일 저장",
  });
}

export async function selectSftpDownloadDirectoryPath() {
  if (!isTauri()) {
    toast.error("SFTP 디렉터리 다운로드는 데스크톱 앱에서만 지원합니다.");
    return null;
  }

  const selected = await open({
    directory: true,
    multiple: false,
    title: "SFTP 디렉터리 저장 위치 선택",
  });

  if (selected === null || Array.isArray(selected)) {
    return null;
  }

  return selected;
}

export async function selectSftpDownloadDestination(entry: SftpDirectoryEntry) {
  if (entry.metadata.kind === "directory") {
    return selectSftpDownloadDirectoryPath();
  }

  return selectSftpDownloadPath(inferFileName(entry.path));
}

export async function selectSftpUploadSourcePaths() {
  if (!isTauri()) {
    toast.error("SFTP 업로드는 데스크톱 앱에서만 지원합니다.");
    return null;
  }

  const selected = await open({
    directory: false,
    multiple: true,
    title: "업로드할 로컬 파일 선택",
  });

  if (selected === null) {
    return null;
  }

  return Array.isArray(selected) ? selected : [selected];
}

export function inferFileName(path: string) {
  const trimmed = path.trim().replace(/[\\/]+$/, "");
  if (trimmed.length === 0) {
    return "download.bin";
  }

  const segments = trimmed.split(/[\\/]+/).filter(Boolean);
  const candidate = segments[segments.length - 1];
  return candidate && candidate.length > 0 ? candidate : "download.bin";
}

export function buildSftpChildPath(parentPath: string, name: string) {
  const fileName = inferFileName(name);
  if (parentPath === "/") {
    return `/${fileName}`;
  }

  return `${parentPath.replace(/\/+$/, "")}/${fileName}`;
}

export function buildLocalChildPath(parentPath: string, name: string) {
  const fileName = inferFileName(name);
  const normalizedParent = parentPath.trim().replace(/[\\/]+$/, "");

  if (normalizedParent.length === 0) {
    return fileName;
  }

  return `${normalizedParent}/${fileName}`;
}

export function getSftpParentPath(path: string) {
  const trimmed = path.trim().replace(/\/+$/, "");
  if (trimmed.length === 0 || trimmed === "/") {
    return "/";
  }

  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return "/";
  }

  return `/${segments.slice(0, -1).join("/")}`;
}

export function buildSuggestedSftpCopyPath(path: string) {
  const parentPath = getSftpParentPath(path);
  const fileName = inferFileName(path);
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex <= 0) {
    return buildSftpChildPath(parentPath, `${fileName}-copy`);
  }

  const name = fileName.slice(0, lastDotIndex);
  const extension = fileName.slice(lastDotIndex);
  return buildSftpChildPath(parentPath, `${name}-copy${extension}`);
}
