import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";

export async function selectSshPrivateKeyPath() {
  if (!isTauri()) {
    toast.error("SSH 키 파일 선택은 데스크톱 앱에서만 지원합니다.");
    return null;
  }

  const selected = await open({
    directory: false,
    multiple: false,
    title: "SSH 개인키 선택",
  });

  if (selected === null || Array.isArray(selected)) {
    return null;
  }

  return selected;
}
