import type {
  AdminSmsContactBatch,
  AdminSmsContactBatchAction,
  AdminSmsContactCreate,
  AdminSmsContactImportItem,
} from "../../api/fleet";

export interface SmsContactDraft {
  bg_no: string;
  bk_name: string;
  bk_hp: string;
  bk_receipt: boolean;
  bk_memo: string;
}

export const emptySmsContactDraft: SmsContactDraft = {
  bg_no: "",
  bk_name: "",
  bk_hp: "",
  bk_receipt: true,
  bk_memo: "",
};

export function normalizePhoneDigits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function validateSmsContactDraft(draft: SmsContactDraft): string | null {
  if (!/^\d+$/.test(draft.bg_no) || Number(draft.bg_no) < 1) return "그룹을 선택해 주십시오.";
  if (!draft.bk_name.trim()) return "이름을 입력해 주십시오.";
  if (!/^(01[016789])\d{7,8}$/.test(normalizePhoneDigits(draft.bk_hp))) return "휴대폰번호를 정확히 입력해 주십시오.";
  return null;
}

export function buildSmsContactInput(draft: SmsContactDraft): AdminSmsContactCreate {
  return {
    bg_no: Number(draft.bg_no),
    bk_name: draft.bk_name.trim(),
    bk_hp: normalizePhoneDigits(draft.bk_hp),
    bk_receipt: draft.bk_receipt ? 1 : 0,
    bk_memo: draft.bk_memo.trim(),
  };
}

export function buildSmsContactBatch(action: AdminSmsContactBatchAction, contactIds: number[], targetBgNo?: number): AdminSmsContactBatch {
  const input: AdminSmsContactBatch = {
    action,
    contact_ids: [...new Set(contactIds.filter((value) => Number.isInteger(value) && value > 0))].sort((left, right) => left - right),
  };
  if (action === "move" || action === "copy") input.target_bg_no = targetBgNo;
  return input;
}

export function parseSmsContactImport(text: string): AdminSmsContactImportItem[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name = "", ...phoneParts] = line.split(/\t|,/).map((part) => part.trim());
    if (phoneParts.length === 0) return { phone: normalizePhoneDigits(name) };
    return { name, phone: normalizePhoneDigits(phoneParts.join("")) };
  });
}

export function smsContactsCsv(items: Array<{ bk_name: string; bk_hp: string; bg_no: number; mb_id: string | null; bk_receipt: number }>): string {
  const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return ["이름,전화번호,그룹,회원ID,수신", ...items.map((item) => [item.bk_name, item.bk_hp, item.bg_no, item.mb_id, item.bk_receipt].map(escape).join(","))].join("\n");
}
