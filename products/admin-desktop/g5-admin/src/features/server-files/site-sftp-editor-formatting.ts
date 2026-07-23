type SupportedFormatterParser =
  | "babel"
  | "css"
  | "html"
  | "json-stringify"
  | "markdown"
  | "scss"
  | "typescript"
  | "yaml";

type PrettierModule = typeof import("prettier/standalone");

function resolveFormatterParser(path: string): SupportedFormatterParser | null {
  const normalized = path.trim().toLowerCase();
  const extension = normalized.includes(".")
    ? normalized.slice(normalized.lastIndexOf(".") + 1)
    : "";

  switch (extension) {
    case "css":
      return "css";
    case "html":
    case "svg":
    case "xml":
      return "html";
    case "js":
    case "jsx":
    case "mjs":
      return "babel";
    case "json":
      return "json-stringify";
    case "md":
      return "markdown";
    case "scss":
      return "scss";
    case "ts":
    case "tsx":
      return "typescript";
    case "yaml":
    case "yml":
      return "yaml";
    default:
      return null;
  }
}

async function loadFormatter() {
  const [prettier, babel, estree, html, markdown, postcss, typescript, yaml] =
    await Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
      import("prettier/plugins/html"),
      import("prettier/plugins/markdown"),
      import("prettier/plugins/postcss"),
      import("prettier/plugins/typescript"),
      import("prettier/plugins/yaml"),
    ]);

  return {
    prettier: prettier as PrettierModule,
    plugins: [babel, estree, html, markdown, postcss, typescript, yaml],
  };
}

export function supportsSiteSftpFormatting(path: string) {
  return resolveFormatterParser(path) !== null;
}

export async function formatSiteSftpContent(path: string, source: string) {
  const parser = resolveFormatterParser(path);
  if (!parser) {
    return null;
  }

  const { prettier, plugins } = await loadFormatter();
  return prettier.format(source, {
    parser,
    plugins,
  });
}
