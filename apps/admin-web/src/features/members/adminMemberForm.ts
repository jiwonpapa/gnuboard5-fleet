import type {
  AdminMember,
  AdminMemberMediaUpload,
  AdminMemberUpdate,
} from "../../api/fleet";

export interface AdminMemberDraft {
  mb_name: string;
  mb_nick: string;
  mb_email: string;
  mb_hp: string;
  mb_tel: string;
  mb_homepage: string;
  mb_zip: string;
  mb_addr1: string;
  mb_addr2: string;
  mb_addr3: string;
  mb_addr_jibeon: string;
  mb_memo: string;
  mb_profile: string;
  mb_signature: string;
  mb_certify: string;
  mb_leave_date: string;
  mb_intercept_date: string;
  mb_password: string;
  mb_mailling: boolean;
  mb_sms: boolean;
  mb_marketing_agree: boolean;
  mb_thirdparty_agree: boolean;
  mb_adult: boolean;
  mb_open: boolean;
  extras: string[];
}

const TEXT_FIELDS = [
  "mb_name",
  "mb_nick",
  "mb_email",
  "mb_hp",
  "mb_tel",
  "mb_homepage",
  "mb_zip",
  "mb_addr1",
  "mb_addr2",
  "mb_addr3",
  "mb_addr_jibeon",
  "mb_memo",
  "mb_profile",
  "mb_signature",
  "mb_certify",
  "mb_leave_date",
  "mb_intercept_date",
] as const;

const FLAG_FIELDS = [
  "mb_mailling",
  "mb_sms",
  "mb_marketing_agree",
  "mb_thirdparty_agree",
  "mb_adult",
  "mb_open",
] as const;

export function memberToDraft(member: AdminMember): AdminMemberDraft {
  const draft = {
    mb_password: "",
    extras: Array.from({ length: 10 }, (_, index) =>
      String(member[`mb_${index + 1}` as keyof AdminMember] ?? "")
    ),
  } as AdminMemberDraft;
  for (const field of TEXT_FIELDS) draft[field] = String(member[field] ?? "");
  for (const field of FLAG_FIELDS) draft[field] = member[field] === 1;
  return draft;
}

export function buildAdminMemberUpdate(
  member: AdminMember,
  draft: AdminMemberDraft,
): AdminMemberUpdate | null {
  const update: AdminMemberUpdate = {};
  for (const field of TEXT_FIELDS) {
    const next = draft[field].trim();
    if (next !== String(member[field] ?? "").trim()) update[field] = next;
  }
  for (const field of FLAG_FIELDS) {
    const next = draft[field] ? 1 : 0;
    if (next !== (member[field] ?? 0)) update[field] = next;
  }
  draft.extras.forEach((value, index) => {
    const field = `mb_${index + 1}` as keyof AdminMemberUpdate;
    const next = value.trim();
    if (next !== String(member[field as keyof AdminMember] ?? "").trim()) {
      Object.assign(update, { [field]: next });
    }
  });
  if (draft.mb_password) update.mb_password = draft.mb_password;
  return Object.keys(update).length ? update : null;
}

export function validateAdminMemberDraft(draft: AdminMemberDraft): string[] {
  const errors: string[] = [];
  if (!draft.mb_name.trim()) errors.push("이름을 입력하십시오.");
  if (!draft.mb_nick.trim()) errors.push("닉네임을 입력하십시오.");
  if (draft.mb_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.mb_email)) {
    errors.push("이메일 형식이 올바르지 않습니다.");
  }
  for (const [label, value] of [
    ["탈퇴일", draft.mb_leave_date],
    ["차단일", draft.mb_intercept_date],
  ] as const) {
    if (value && !/^\d{8}$/.test(value)) errors.push(`${label}은 YYYYMMDD 형식이어야 합니다.`);
  }
  return errors;
}

export async function fileToMemberUpload(file: File): Promise<AdminMemberMediaUpload> {
  if (file.size > 16 * 1024 * 1024) throw new Error("회원 미디어는 16MiB 이하여야 합니다.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return {
    file_name: file.name,
    mime_type: file.type || null,
    bytes_base64: btoa(binary),
  };
}

export function membersToCsv(members: AdminMember[]): string {
  const header = ["mb_id", "mb_name", "mb_nick", "mb_email", "mb_level", "mb_point", "mb_datetime"];
  const rows = members.map((member) =>
    header.map((field) => csvCell(member[field as keyof AdminMember])).join(",")
  );
  return `\uFEFF${header.join(",")}\n${rows.join("\n")}\n`;
}

function csvCell(value: unknown): string {
  const normalized = String(value ?? "");
  return `"${normalized.replaceAll('"', '""')}"`;
}
