import type { SshAuthType } from "../../types/SshAuthType";
import type { SshProfile } from "../../types/SshProfile";

export type SiteSshProfileJsonEntry = {
  auth_type: SshAuthType;
  host: string;
  id?: string;
  key_path: string | null;
  name: string;
  port: number;
  username: string;
};

export type SiteSshProfileJsonDocument = {
  exported_at: string;
  profile_count: number;
  profiles: SiteSshProfileJsonEntry[];
  secrets_included: false;
  version: 1;
};

export function serializeSshProfilesToJson(profiles: SshProfile[]) {
  const document: SiteSshProfileJsonDocument = {
    exported_at: new Date().toISOString(),
    profile_count: profiles.length,
    profiles: profiles.map((profile) => ({
      auth_type: profile.auth_type,
      host: profile.host,
      id: profile.id,
      key_path: profile.key_path,
      name: profile.name,
      port: profile.port,
      username: profile.username,
    })),
    secrets_included: false,
    version: 1,
  };

  return JSON.stringify(document, null, 2);
}

export function parseSshProfilesJson(source: string): SiteSshProfileJsonEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("SSH 프로필 JSON 형식을 읽지 못했습니다.");
  }

  const profiles = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.profiles)
      ? parsed.profiles
      : null;
  if (profiles === null) {
    throw new Error("SSH 프로필 JSON에는 profiles 배열이 필요합니다.");
  }

  return profiles.map((profile, index) => normalizeProfileEntry(profile, index));
}

export function buildSshProfileJsonFilename(siteName: string) {
  const slug = siteName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = new Date().toISOString().slice(0, 10);
  return `${slug || "site"}-ssh-profiles-${suffix}.json`;
}

function normalizeProfileEntry(profile: unknown, index: number): SiteSshProfileJsonEntry {
  if (!isRecord(profile)) {
    throw new Error(`profiles[${index}] 항목이 객체가 아닙니다.`);
  }

  const name = normalizeRequiredString(profile.name, `profiles[${index}].name`);
  const host = normalizeRequiredString(profile.host, `profiles[${index}].host`);
  const username = normalizeRequiredString(profile.username, `profiles[${index}].username`);
  const auth_type = normalizeAuthType(profile.auth_type, `profiles[${index}].auth_type`);
  const port = normalizePort(profile.port, `profiles[${index}].port`);
  const key_path = normalizeOptionalString(profile.key_path);
  const id = normalizeOptionalString(profile.id);

  return {
    auth_type,
    host,
    id: id ?? undefined,
    key_path,
    name,
    port,
    username,
  };
}

function normalizeRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} 값이 비어 있습니다.`);
  }

  return value.trim();
}

function normalizeOptionalString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("문자열 또는 null 값만 허용됩니다.");
  }

  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

function normalizeAuthType(value: unknown, field: string): SshAuthType {
  if (value === "password" || value === "key" || value === "agent") {
    return value;
  }

  throw new Error(`${field} 값이 유효하지 않습니다.`);
}

function normalizePort(value: unknown, field: string) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 65_535) {
    throw new Error(`${field} 값이 유효한 포트가 아닙니다.`);
  }

  return numeric;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
