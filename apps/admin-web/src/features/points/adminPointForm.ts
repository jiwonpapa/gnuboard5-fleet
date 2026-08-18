import type { AdminPointChange, AdminPointExpire } from "../../api/fleet";

export interface AdminPointFormDraft {
  mb_id: string;
  point: string;
  po_content: string;
}

export const emptyAdminPointForm: AdminPointFormDraft = {
  mb_id: "",
  point: "",
  po_content: "",
};

export function buildAdminPointChange(draft: AdminPointFormDraft): AdminPointChange | null {
  const mbId = draft.mb_id.trim();
  const point = Number(draft.point);
  const content = draft.po_content.trim();
  if (!mbId || mbId.length > 255 || !Number.isSafeInteger(point) || point <= 0) return null;
  if (content.length > 255) return null;
  return {
    mb_id: mbId,
    point,
    ...(content ? { po_content: content } : {}),
  };
}

export function buildAdminPointExpire(baseDate: string): AdminPointExpire | null {
  const value = baseDate.trim();
  if (!value) return {};
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? { base_date: value } : null;
}
