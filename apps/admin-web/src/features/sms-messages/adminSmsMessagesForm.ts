import type {
  AdminSmsManualTarget,
  AdminSmsMessageCreateRequest,
} from "../../api/fleet";

export interface SmsMessageDraft {
  template_id: string;
  message: string;
  group_ids: string;
  contact_ids: string;
  member_levels: string;
  manual_targets: string;
  booking_at: string;
  reply: string;
}

export const emptySmsMessageDraft: SmsMessageDraft = {
  template_id: "",
  message: "",
  group_ids: "",
  contact_ids: "",
  member_levels: "",
  manual_targets: "",
  booking_at: "",
  reply: "",
};

export function parsePositiveIds(value: string): number[] {
  return [...new Set(value.split(/[\s,]+/).map(Number).filter((item) => Number.isInteger(item) && item > 0))]
    .sort((left, right) => left - right);
}

export function parseManualTargets(value: string): AdminSmsManualTarget[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t|,/).map((part) => part.trim());
      const phone = (parts.length > 1 ? parts.slice(1).join("") : parts[0] ?? "").replace(/\D/g, "");
      const name = parts.length > 1 ? parts[0] : "";
      return { ...(name ? { name } : {}), phone };
    })
    .filter((target) => target.phone.length >= 3);
}

export function validateSmsMessageDraft(draft: SmsMessageDraft): string | null {
  const templateId = Number(draft.template_id);
  if (!draft.message.trim() && !(Number.isInteger(templateId) && templateId > 0)) {
    return "메시지 또는 템플릿을 지정해 주십시오.";
  }
  const targetCount = parsePositiveIds(draft.group_ids).length
    + parsePositiveIds(draft.contact_ids).length
    + parsePositiveIds(draft.member_levels).length
    + parseManualTargets(draft.manual_targets).length;
  if (!targetCount) return "최소 한 개 이상의 발송 대상을 지정해 주십시오.";
  return null;
}

export function buildSmsMessageRequest(draft: SmsMessageDraft): AdminSmsMessageCreateRequest {
  const templateId = Number(draft.template_id);
  const reply = draft.reply.replace(/\D/g, "");
  return {
    ...(draft.message.trim() ? { message: draft.message.trim() } : {}),
    ...(Number.isInteger(templateId) && templateId > 0 ? { template_id: templateId } : {}),
    ...(reply ? { reply } : {}),
    ...(draft.booking_at.trim() ? { booking_at: draft.booking_at.trim() } : {}),
    group_ids: parsePositiveIds(draft.group_ids),
    contact_ids: parsePositiveIds(draft.contact_ids),
    member_levels: parsePositiveIds(draft.member_levels),
    manual_targets: parseManualTargets(draft.manual_targets),
  };
}
