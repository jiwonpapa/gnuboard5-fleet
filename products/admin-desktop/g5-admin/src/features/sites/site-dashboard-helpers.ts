import { isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import type { CommandError } from "../../api/client";
import type { SiteCatalogEntry } from "../../types/SiteCatalogEntry";

export type SensitiveAction =
  | { kind: "delete"; entry: SiteCatalogEntry }
  | { kind: "export"; path: string }
  | { kind: "import"; format: "legacy-db" | "portable"; path: string };

export function formatBytes(value: bigint | number) {
  const normalizedValue = Number(value);
  if (normalizedValue < 1024) {
    return `${normalizedValue} B`;
  }

  const kib = normalizedValue / 1024;
  if (kib < 1024) {
    return `${kib.toFixed(1)} KiB`;
  }

  return `${(kib / 1024).toFixed(1)} MiB`;
}

export function findSiteName(sites: SiteCatalogEntry[], siteId: string) {
  return sites.find((entry) => entry.site.id === siteId)?.site.name ?? siteId;
}

export function buildSensitiveActionTitle(action: SensitiveAction | null) {
  if (!action) {
    return "";
  }

  switch (action.kind) {
    case "delete":
      return `${action.entry.site.name} 사이트를 삭제하시겠습니까?`;
    case "export":
      return "휴대용 암호화 백업을 내보내시겠습니까?";
    case "import":
      return action.format === "portable"
        ? "휴대용 암호화 백업을 가져오시겠습니까?"
        : "레거시 로컬 스냅샷을 가져오시겠습니까?";
  }
}

export function buildSensitiveActionDescription(action: SensitiveAction | null) {
  if (!action) {
    return "";
  }

  switch (action.kind) {
    case "delete":
      return "사이트를 삭제하면 관련 세션과 현재 연결된 로컬 활동 기록이 함께 만료될 수 있습니다. 현재 마스터 비밀번호로 다시 확인해 주십시오.";
    case "export":
      return "sites와 site_settings만 포함한 휴대용 암호화 백업 파일을 생성합니다. 세션, 빠른 잠금 해제 상태, 장치 결합 보안 비밀은 포함하지 않습니다. 현재 마스터 비밀번호와 백업 암호로 다시 확인해 주십시오.";
    case "import":
      return action.format === "portable"
        ? "선택한 휴대용 암호화 백업에서 sites와 site_settings를 현재 장치로 복원합니다. 현재 마스터 비밀번호와 백업 암호를 다시 확인해 주십시오."
        : "선택한 레거시 로컬 SQLCipher 스냅샷(.db)에서 sites와 site_settings를 현재 DB에 병합합니다. 이 경로는 동일 장치/동일 로컬 키 호환용입니다.";
  }
}

export function buildSensitiveActionConfirmLabel(action: SensitiveAction | null) {
  if (!action) {
    return "확인";
  }

  switch (action.kind) {
    case "delete":
      return "삭제";
    case "export":
      return "백업 생성";
    case "import":
      return "백업 가져오기";
  }
}

export function buildBackupPasswordLabel(action: SensitiveAction | null) {
  if (!action) {
    return undefined;
  }

  switch (action.kind) {
    case "export":
      return "새 백업 암호";
    case "import":
      return action.format === "portable" ? "백업 암호" : undefined;
    default:
      return undefined;
  }
}

export function buildBackupPasswordDescription(action: SensitiveAction | null) {
  if (!action) {
    return undefined;
  }

  switch (action.kind) {
    case "export":
      return "이 암호는 휴대용 백업 파일을 새 장치에서 복원할 때 다시 필요합니다. 마스터 비밀번호와 별개로 관리하십시오.";
    case "import":
      return action.format === "portable"
        ? "휴대용 암호화 백업을 만들 때 지정한 암호를 입력하십시오."
        : undefined;
    default:
      return undefined;
  }
}

export function requiresBackupPassword(action: SensitiveAction | null) {
  if (!action) {
    return false;
  }

  return (
    action.kind === "export" ||
    (action.kind === "import" && action.format === "portable")
  );
}

export function detectBackupImportFormat(path: string): "legacy-db" | "portable" {
  return path.toLowerCase().endsWith(".db") ? "legacy-db" : "portable";
}

export async function selectBackupExportPath() {
  if (!isTauri()) {
    toast.error("휴대용 백업은 데스크톱 앱에서만 지원합니다.");
    return null;
  }

  return save({
    defaultPath: `g5-admin-backup-${new Date().toISOString().slice(0, 10)}.g5bak`,
    filters: [
      {
        name: "Portable Encrypted Backup",
        extensions: ["g5bak"],
      },
    ],
    title: "휴대용 암호화 백업 저장",
  });
}

export async function selectBackupImportPath() {
  if (!isTauri()) {
    toast.error("백업 가져오기는 데스크톱 앱에서만 지원합니다.");
    return null;
  }

  const selected = await open({
    directory: false,
    filters: [
      {
        name: "Portable Encrypted Backup",
        extensions: ["g5bak"],
      },
      {
        name: "Legacy SQLite Snapshot",
        extensions: ["db"],
      },
    ],
    multiple: false,
    title: "백업 가져오기",
  });

  return Array.isArray(selected) ? selected[0] : selected;
}

export function toCommandError(error: unknown): CommandError | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "request_id" in error
  ) {
    return error as CommandError;
  }

  return null;
}

export function toOptionalString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
