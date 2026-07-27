import type { SftpEntry } from "../../api/fleet";

const EDITABLE_EXTENSIONS = new Set([
  "conf",
  "css",
  "csv",
  "env",
  "gitignore",
  "html",
  "htaccess",
  "ini",
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

export function inferFileName(path: string) {
  const trimmed = path.trim().replace(/[\\/]+$/, "");
  if (trimmed.length === 0) return "download.bin";
  const segments = trimmed.split(/[\\/]+/).filter(Boolean);
  return segments.at(-1) || "download.bin";
}

export function buildSftpChildPath(parentPath: string, name: string) {
  const fileName = inferFileName(name);
  return parentPath === "/"
    ? `/${fileName}`
    : `${parentPath.replace(/\/+$/, "")}/${fileName}`;
}

export function getSftpParentPath(path: string) {
  const trimmed = path.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "/";
  const segments = trimmed.split("/").filter(Boolean);
  return segments.length <= 1 ? "/" : `/${segments.slice(0, -1).join("/")}`;
}

export function buildSuggestedSftpCopyPath(path: string) {
  const parentPath = getSftpParentPath(path);
  const fileName = inferFileName(path);
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0) return buildSftpChildPath(parentPath, `${fileName}-copy`);
  return buildSftpChildPath(
    parentPath,
    `${fileName.slice(0, lastDot)}-copy${fileName.slice(lastDot)}`,
  );
}

export function buildPathAncestors(path: string) {
  const segments = path.split("/").filter(Boolean);
  return [
    { label: "/", path: "/" },
    ...segments.map((segment, index) => ({
      label: segment,
      path: `/${segments.slice(0, index + 1).join("/")}`,
    })),
  ];
}

export function isEditableSftpEntry(entry: SftpEntry) {
  if (entry.kind !== "file" || (entry.size ?? Number.MAX_SAFE_INTEGER) > 1024 * 1024) {
    return false;
  }
  const fileName = inferFileName(entry.path).toLowerCase();
  const extension = fileName.split(".").at(-1) ?? "";
  return fileName.includes(".") && EDITABLE_EXTENSIONS.has(extension);
}

export function sortSftpEntries(entries: SftpEntry[]) {
  return [...entries].sort((left, right) => {
    const leftDirectory = left.kind === "directory" ? 0 : 1;
    const rightDirectory = right.kind === "directory" ? 0 : 1;
    return leftDirectory - rightDirectory
      || left.name.localeCompare(right.name, undefined, { numeric: true });
  });
}

export function formatSftpBytes(value: number | null) {
  if (value === null) return "—";
  if (value < 1024) return `${value} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let size = value / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
}
