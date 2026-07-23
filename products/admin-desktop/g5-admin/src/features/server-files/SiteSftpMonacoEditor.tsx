import Editor from "@monaco-editor/react";
import "./site-sftp-monaco-runtime";

export default function SiteSftpMonacoEditor(props: {
  height?: string;
  language: string;
  onChange: (value: string) => void;
  onSaveShortcut?: () => void;
  theme: "vs" | "vs-dark";
  value: string;
}) {
  return (
    <Editor
      height={props.height ?? "28rem"}
      defaultLanguage={props.language}
      language={props.language}
      theme={props.theme}
      value={props.value}
      onChange={(value) => props.onChange(value ?? "")}
      onMount={(editor, monaco) => {
        if (!props.onSaveShortcut) {
          return;
        }

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          props.onSaveShortcut?.();
        });
      }}
      options={{
        automaticLayout: true,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 13,
        lineNumbersMinChars: 3,
        minimap: { enabled: false },
        padding: { top: 12, bottom: 12 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        tabSize: 2,
        wordWrap: "on",
      }}
    />
  );
}
