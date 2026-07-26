export interface ShellContextAction {
  id: "copy-path" | "refresh";
  label: string;
}

export function shellContextActions(): readonly ShellContextAction[] {
  return [
    { id: "refresh", label: "현재 화면 새로고침" },
    { id: "copy-path", label: "화면 경로 복사" },
  ];
}
