const EDITABLE_SFTP_EXTENSIONS = new Set([
  "conf",
  "css",
  "csv",
  "env",
  "gitignore",
  "html",
  "htaccess",
  "ini",
  "java",
  "js",
  "json",
  "jsx",
  "log",
  "md",
  "mjs",
  "php",
  "properties",
  "py",
  "rs",
  "scss",
  "sh",
  "sql",
  "svg",
  "toml",
  "ts",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
]);

export function isSftpEditableTextPath(path: string) {
  const trimmed = path.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const segments = trimmed.split("/").filter(Boolean);
  const fileName = segments[segments.length - 1] ?? trimmed;
  if (!fileName.includes(".")) {
    return false;
  }

  const extensionSegments = fileName.split(".");
  const extension =
    extensionSegments[extensionSegments.length - 1]?.toLowerCase() ?? "";
  return EDITABLE_SFTP_EXTENSIONS.has(extension);
}
