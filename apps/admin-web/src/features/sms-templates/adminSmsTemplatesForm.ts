import type {
  AdminSmsTemplateBatch,
  AdminSmsTemplateBatchAction,
  AdminSmsTemplateCreate,
  AdminSmsTemplateGroupCreate,
} from "../../api/fleet";

export interface SmsTemplateGroupDraft {
  fg_name: string;
  fg_member: boolean;
}

export interface SmsTemplateDraft {
  fg_no: string;
  fo_name: string;
  fo_content: string;
}

export const emptySmsTemplateGroupDraft: SmsTemplateGroupDraft = {
  fg_name: "",
  fg_member: false,
};

export const emptySmsTemplateDraft: SmsTemplateDraft = {
  fg_no: "0",
  fo_name: "",
  fo_content: "",
};

export function validateSmsTemplateGroupDraft(draft: SmsTemplateGroupDraft): string | null {
  if (!draft.fg_name.trim()) return "그룹명을 입력해 주십시오.";
  if (draft.fg_name.length > 255) return "그룹명은 255자 이하여야 합니다.";
  return null;
}

export function buildSmsTemplateGroupInput(draft: SmsTemplateGroupDraft): AdminSmsTemplateGroupCreate {
  return { fg_name: draft.fg_name.trim(), fg_member: draft.fg_member ? 1 : 0 };
}

export function validateSmsTemplateDraft(draft: SmsTemplateDraft): string | null {
  if (!/^\d+$/.test(draft.fg_no)) return "그룹을 선택해 주십시오.";
  if (!draft.fo_name.trim()) return "템플릿 이름을 입력해 주십시오.";
  if (!draft.fo_content.trim()) return "템플릿 내용을 입력해 주십시오.";
  return null;
}

export function buildSmsTemplateInput(draft: SmsTemplateDraft): AdminSmsTemplateCreate {
  return {
    fg_no: Number(draft.fg_no),
    fo_name: draft.fo_name.trim(),
    fo_content: draft.fo_content.trim(),
  };
}

export function buildSmsTemplateBatch(
  action: AdminSmsTemplateBatchAction,
  templateIds: number[],
  targetFgNo?: number,
): AdminSmsTemplateBatch {
  const input: AdminSmsTemplateBatch = {
    action,
    template_ids: [...new Set(templateIds.filter((value) => Number.isInteger(value) && value > 0))]
      .sort((left, right) => left - right),
  };
  if (action === "move") input.target_fg_no = targetFgNo;
  return input;
}
