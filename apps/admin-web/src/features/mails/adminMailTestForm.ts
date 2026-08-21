import type { AdminMailTestRequest, AdminSystemMailTestRequest } from "../../api/fleet";

export interface AdminMailTestDraft { templateId: string; to: string; subject: string; content: string; }
export const emptyAdminMailTest: AdminMailTestDraft = { templateId: "", to: "", subject: "", content: "" };

export function buildAdminMailTest(draft: AdminMailTestDraft): AdminMailTestRequest | null {
  const to = draft.to.trim();
  const ma_id = optionalId(draft.templateId);
  const subject = draft.subject.trim();
  const content = draft.content.trim();
  if (!validEmail(to) || ma_id === null || (ma_id === undefined && (!subject || !content))) return null;
  return ma_id === undefined ? { to, subject, content } : { to, ma_id };
}

export function buildAdminSystemMailTest(draft: AdminMailTestDraft): AdminSystemMailTestRequest | null {
  const to = draft.to.trim();
  const subject = draft.subject.trim();
  const content = draft.content.trim();
  return validEmail(to) && subject && subject.length <= 255 && content ? { to, subject, content } : null;
}

function optionalId(value: string): number | undefined | null {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
function validEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
