import { lazy, Suspense } from "react";
import { Textarea } from "../../components/ui/textarea";
import { useTheme } from "../layout/theme";
import { resolveSiteSftpEditorLanguage } from "./site-sftp-editor-language";

const MonacoEditor =
  import.meta.env.MODE === "test"
    ? null
    : lazy(() => import("./SiteSftpMonacoEditor"));

export function SiteSftpCodeEditor(props: {
  height?: string;
  onChange: (value: string) => void;
  onSaveShortcut?: () => void;
  path: string;
  value: string;
}) {
  const { resolvedTheme } = useTheme();
  const language = resolveSiteSftpEditorLanguage(props.path);
  const fallback = (
    <Textarea
      rows={24}
      style={{ minHeight: props.height ?? "28rem" }}
      value={props.value}
      onChange={(event) => props.onChange(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (
          props.onSaveShortcut &&
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "s"
        ) {
          event.preventDefault();
          props.onSaveShortcut();
        }
      }}
      className="min-h-[28rem] font-mono text-xs leading-6"
    />
  );

  if (MonacoEditor === null) {
    return fallback;
  }

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background">
      <Suspense fallback={fallback}>
        <MonacoEditor
          height={props.height}
          language={language}
          onSaveShortcut={props.onSaveShortcut}
          theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
          value={props.value}
          onChange={props.onChange}
        />
      </Suspense>
    </div>
  );
}
