export function resolveSiteSftpEditorLanguage(path: string) {
  const lowerPath = path.trim().toLowerCase();
  const segments = lowerPath.split("/");
  const fileName = segments[segments.length - 1] || lowerPath;

  if (fileName === "dockerfile") return "dockerfile";
  if (fileName.endsWith(".blade.php")) return "php";
  if (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) return "typescript";
  if (
    fileName.endsWith(".js")
    || fileName.endsWith(".jsx")
    || fileName.endsWith(".mjs")
  ) return "javascript";
  if (fileName.endsWith(".json")) return "json";
  if (
    fileName.endsWith(".php")
    || fileName.endsWith(".phtml")
    || fileName.endsWith(".inc")
  ) return "php";
  if (fileName.endsWith(".html") || fileName.endsWith(".htm")) return "html";
  if (fileName.endsWith(".css")) return "css";
  if (fileName.endsWith(".scss") || fileName.endsWith(".sass")) return "scss";
  if (fileName.endsWith(".md")) return "markdown";
  if (fileName.endsWith(".xml")) return "xml";
  if (fileName.endsWith(".sql")) return "sql";
  if (fileName.endsWith(".yaml") || fileName.endsWith(".yml")) return "yaml";
  if (
    fileName.endsWith(".sh")
    || fileName.endsWith(".bash")
    || fileName.endsWith(".zsh")
    || fileName === ".env"
  ) return "shell";
  return "plaintext";
}

export function formatEditableContent(path: string, source: string) {
  if (resolveSiteSftpEditorLanguage(path) !== "json") return null;
  try {
    return `${JSON.stringify(JSON.parse(source), null, 2)}\n`;
  } catch {
    return null;
  }
}
