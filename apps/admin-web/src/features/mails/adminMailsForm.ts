import type {
  AdminMailRecipientQuery,
  AdminMailSendRequest,
  AdminMailTargetType,
  AdminMailTemplateWrite,
} from "../../api/fleet";

export interface AdminMailTemplateDraft { subject: string; content: string; }
export interface AdminMailRecipientDraft {
  search: string;
  levelMin: string;
  levelMax: string;
  groupId: string;
  memberIdFrom: string;
  memberIdTo: string;
  emailContains: string;
  maillingOnly: boolean;
}
export interface AdminMailSendDraft {
  templateId: string;
  subject: string;
  content: string;
  targetType: AdminMailTargetType;
  levelMin: string;
  levelMax: string;
  groupId: string;
  memberIds: string;
  maillingOnly: boolean;
  dryRun: boolean;
}

export const emptyAdminMailTemplate: AdminMailTemplateDraft = { subject: "", content: "" };
export const emptyAdminMailRecipient: AdminMailRecipientDraft = {
  search: "", levelMin: "", levelMax: "", groupId: "", memberIdFrom: "", memberIdTo: "", emailContains: "", maillingOnly: true,
};
export const emptyAdminMailSend: AdminMailSendDraft = {
  templateId: "", subject: "", content: "", targetType: "member", levelMin: "", levelMax: "", groupId: "", memberIds: "", maillingOnly: true, dryRun: true,
};

export function buildAdminMailTemplate(draft: AdminMailTemplateDraft): AdminMailTemplateWrite | null {
  const ma_subject = draft.subject.trim();
  const ma_content = draft.content.trim();
  return ma_subject && ma_subject.length <= 255 && ma_content ? { ma_subject, ma_content } : null;
}

export function buildAdminMailRecipientQuery(draft: AdminMailRecipientDraft): AdminMailRecipientQuery | null {
  const level_min = optionalLevel(draft.levelMin);
  const level_max = optionalLevel(draft.levelMax);
  if (level_min === null || level_max === null || (level_min !== undefined && level_max !== undefined && level_min > level_max)) return null;
  const identifiers = [draft.groupId, draft.memberIdFrom, draft.memberIdTo].map((value) => value.trim());
  if (identifiers.some((value) => value && !identifier(value))) return null;
  return compact({
    page: 1,
    per_page: 50,
    search: draft.search.trim(),
    level_min,
    level_max,
    gr_id: identifiers[0],
    member_id_from: identifiers[1],
    member_id_to: identifiers[2],
    email_contains: draft.emailContains.trim(),
    mailling_only: draft.maillingOnly,
  });
}

export function buildAdminMailSend(draft: AdminMailSendDraft): AdminMailSendRequest | null {
  const ma_id = positiveInteger(draft.templateId);
  if (ma_id === null) return null;
  const subject = draft.subject.trim();
  const content = draft.content.trim();
  if (ma_id === undefined && (!subject || subject.length > 255 || !content)) return null;
  const level_min = optionalLevel(draft.levelMin);
  const level_max = optionalLevel(draft.levelMax);
  if (level_min === null || level_max === null || (level_min !== undefined && level_max !== undefined && level_min > level_max)) return null;
  const gr_id = draft.groupId.trim();
  if (gr_id && !identifier(gr_id)) return null;
  const mb_ids = uniqueMemberIds(draft.memberIds);
  if (mb_ids === null || (draft.targetType === "member" && !mb_ids.length) || (draft.targetType === "group" && !gr_id)) return null;
  return compact({
    ma_id,
    subject: ma_id === undefined ? subject : undefined,
    content: ma_id === undefined ? content : undefined,
    target_type: draft.targetType,
    level_min,
    level_max,
    gr_id,
    mb_ids,
    mailling_only: draft.maillingOnly,
    dry_run: draft.dryRun,
  });
}

export function uniqueMemberIds(value: string): string[] | null {
  const items = value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean);
  if (items.some((item) => !identifier(item))) return null;
  return [...new Set(items)];
}

function positiveInteger(value: string): number | undefined | null {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function optionalLevel(value: string): number | undefined | null {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;
}

function identifier(value: string): boolean { return /^[A-Za-z0-9_]+$/.test(value); }
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== "" && item !== undefined)) as T;
}
