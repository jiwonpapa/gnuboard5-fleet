import type {
  AdminFaqCreate,
  AdminFaqItem,
  AdminFaqMasterCreate,
  AdminFaqMasterDetail,
  AdminFaqMasterUpdate,
  AdminFaqUpdate,
} from "../../api/fleet";

export interface AdminFaqMasterDraft {
  fm_subject: string;
  fm_order: string;
  fm_head_html: string;
  fm_tail_html: string;
  fm_mobile_head_html: string;
  fm_mobile_tail_html: string;
}

export interface AdminFaqDraft {
  fm_id: string;
  fa_subject: string;
  fa_content: string;
  fa_order: string;
}

export const emptyAdminFaqMasterDraft: AdminFaqMasterDraft = {
  fm_subject: "",
  fm_order: "0",
  fm_head_html: "",
  fm_tail_html: "",
  fm_mobile_head_html: "",
  fm_mobile_tail_html: "",
};

export const emptyAdminFaqDraft: AdminFaqDraft = {
  fm_id: "",
  fa_subject: "",
  fa_content: "",
  fa_order: "0",
};

export function faqMasterToDraft(master: AdminFaqMasterDetail): AdminFaqMasterDraft {
  return {
    fm_subject: master.fm_subject,
    fm_order: String(master.fm_order),
    fm_head_html: master.fm_head_html,
    fm_tail_html: master.fm_tail_html,
    fm_mobile_head_html: master.fm_mobile_head_html,
    fm_mobile_tail_html: master.fm_mobile_tail_html,
  };
}

export function faqToDraft(faq: AdminFaqItem): AdminFaqDraft {
  return {
    fm_id: String(faq.fm_id),
    fa_subject: faq.fa_subject,
    fa_content: faq.fa_content,
    fa_order: String(faq.fa_order),
  };
}

export function validateAdminFaqMasterDraft(draft: AdminFaqMasterDraft): string[] {
  const errors: string[] = [];
  if (!draft.fm_subject.trim()) errors.push("FAQ 분류 제목을 입력하십시오.");
  if (!isInteger(draft.fm_order)) errors.push("FAQ 분류 정렬 순서는 정수여야 합니다.");
  return errors;
}

export function validateAdminFaqDraft(draft: AdminFaqDraft): string[] {
  const errors: string[] = [];
  if (!isPositiveInteger(draft.fm_id)) errors.push("FAQ 분류를 선택하십시오.");
  if (!draft.fa_subject.trim()) errors.push("질문 제목을 입력하십시오.");
  if (!draft.fa_content.trim()) errors.push("답변 내용을 입력하십시오.");
  if (!isInteger(draft.fa_order)) errors.push("FAQ 정렬 순서는 정수여야 합니다.");
  return errors;
}

export function buildAdminFaqMasterCreate(
  draft: AdminFaqMasterDraft,
): AdminFaqMasterCreate {
  return {
    fm_subject: draft.fm_subject.trim(),
    fm_order: Number.parseInt(draft.fm_order, 10),
    fm_head_html: draft.fm_head_html,
    fm_tail_html: draft.fm_tail_html,
    fm_mobile_head_html: draft.fm_mobile_head_html,
    fm_mobile_tail_html: draft.fm_mobile_tail_html,
  };
}

export function buildAdminFaqMasterUpdate(
  original: AdminFaqMasterDetail,
  draft: AdminFaqMasterDraft,
): AdminFaqMasterUpdate {
  const create = buildAdminFaqMasterCreate(draft);
  return changedFields(create, {
    fm_subject: original.fm_subject,
    fm_order: original.fm_order,
    fm_head_html: original.fm_head_html,
    fm_tail_html: original.fm_tail_html,
    fm_mobile_head_html: original.fm_mobile_head_html,
    fm_mobile_tail_html: original.fm_mobile_tail_html,
  });
}

export function buildAdminFaqCreate(draft: AdminFaqDraft): AdminFaqCreate {
  return {
    fm_id: Number.parseInt(draft.fm_id, 10),
    fa_subject: draft.fa_subject.trim(),
    fa_content: draft.fa_content,
    fa_order: Number.parseInt(draft.fa_order, 10),
  };
}

export function buildAdminFaqUpdate(
  original: AdminFaqItem,
  draft: AdminFaqDraft,
): AdminFaqUpdate {
  const create = buildAdminFaqCreate(draft);
  return changedFields(create, {
    fm_id: original.fm_id,
    fa_subject: original.fa_subject,
    fa_content: original.fa_content,
    fa_order: original.fa_order,
  });
}

function changedFields<T extends object>(next: T, current: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) => value !== (current as Record<string, unknown>)[key],
    ),
  ) as Partial<T>;
}

function isInteger(value: string): boolean {
  return /^-?\d+$/.test(value.trim());
}

function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value.trim()) && Number.parseInt(value, 10) > 0;
}
