export const SITE_SFTP_EDITOR_PATH_PARAM = "path";

export function buildSiteSftpEditorSearch(path: string) {
  const params = new URLSearchParams();
  params.set(SITE_SFTP_EDITOR_PATH_PARAM, path);
  return `?${params.toString()}`;
}

export function normalizeSiteSftpEditorPath(rawPath: string | null) {
  const trimmed = rawPath?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
