import { isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { buildSshProfileJsonFilename } from "./site-ssh-profile-json";

export async function exportSshProfilesJsonFile(args: {
  siteName: string;
  source: string;
}) {
  const defaultPath = buildSshProfileJsonFilename(args.siteName);

  if (isTauri()) {
    const path = await save({
      defaultPath,
      filters: [
        {
          name: "SSH Profiles JSON",
          extensions: ["json"],
        },
      ],
      title: "SSH 프로필 JSON 저장",
    });

    if (!path) {
      return null;
    }

    await writeTextFile(path, args.source);
    return path;
  }

  const blob = new Blob([args.source], {
    type: "application/json;charset=utf-8",
  });
  const href = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = defaultPath;
    anchor.click();
  } finally {
    URL.revokeObjectURL(href);
  }

  return defaultPath;
}

export async function importSshProfilesJsonFile() {
  if (isTauri()) {
    const selected = await open({
      directory: false,
      filters: [
        {
          name: "SSH Profiles JSON",
          extensions: ["json"],
        },
      ],
      multiple: false,
      title: "SSH 프로필 JSON 열기",
    });

    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) {
      return null;
    }

    return await readTextFile(path);
  }

  return await readBrowserTextFile();
}

function readBrowserTextFile() {
  return new Promise<string | null>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : "");
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error("SSH 프로필 파일을 읽지 못했습니다."));
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
