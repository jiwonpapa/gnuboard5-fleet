import { z } from "zod";
import type { AdminMailRecipientQuery } from "../../types/AdminMailRecipientQuery";
import type { AdminMailSendInput } from "../../types/AdminMailSendInput";
import type { AdminMailTemplateCreateInput } from "../../types/AdminMailTemplateCreateInput";
import type { AdminMailTemplateUpdateInput } from "../../types/AdminMailTemplateUpdateInput";

const integerTextField = z
  .string()
  .trim()
  .refine((value) => value === "" || /^-?\d+$/.test(value), {
    message: "정수를 입력해 주십시오.",
  });

export const adminMailTemplateFormSchema = z.object({
  ma_subject: z.string().trim().min(1, "메일 제목을 입력해 주십시오."),
  ma_content: z.string().trim().min(1, "메일 본문을 입력해 주십시오."),
});

export type AdminMailTemplateFormValues = z.infer<typeof adminMailTemplateFormSchema>;

export const emptyAdminMailTemplateFormValues: AdminMailTemplateFormValues = {
  ma_subject: "",
  ma_content: "",
};

export const adminMailComposeFormSchema = z
  .object({
    target_type: z.enum(["all", "level", "group", "member"]),
    use_selected_template: z.boolean(),
    subject: z.string().trim(),
    content: z.string().trim(),
    level_min: integerTextField,
    level_max: integerTextField,
    gr_id: z.string().trim(),
    member_id_from: z.string().trim(),
    member_id_to: z.string().trim(),
    email_contains: z.string().trim(),
    search: z.string().trim(),
    mailling_only: z.boolean(),
    dry_run: z.boolean(),
  })
  .superRefine((values, context) => {
    if (!values.use_selected_template && values.subject === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "직접 발송 시 메일 제목이 필요합니다.",
        path: ["subject"],
      });
    }
    if (!values.use_selected_template && values.content === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "직접 발송 시 메일 본문이 필요합니다.",
        path: ["content"],
      });
    }
    if (values.target_type === "group" && values.gr_id === "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "그룹 발송에는 그룹 ID가 필요합니다.",
        path: ["gr_id"],
      });
    }
  });

export type AdminMailComposeFormValues = z.infer<typeof adminMailComposeFormSchema>;

export const emptyAdminMailComposeFormValues: AdminMailComposeFormValues = {
  target_type: "member",
  use_selected_template: true,
  subject: "",
  content: "",
  level_min: "",
  level_max: "",
  gr_id: "",
  member_id_from: "",
  member_id_to: "",
  email_contains: "",
  search: "",
  mailling_only: true,
  dry_run: true,
};

export function buildAdminMailTemplateCreateInput(
  values: AdminMailTemplateFormValues,
): AdminMailTemplateCreateInput | null {
  const maSubject = normalizeText(values.ma_subject);
  const maContent = normalizeText(values.ma_content);

  if (maSubject === null || maContent === null) {
    return null;
  }

  return {
    ma_subject: maSubject,
    ma_content: maContent,
  };
}

export function buildAdminMailTemplateUpdateInput(
  maId: number,
  values: AdminMailTemplateFormValues,
): AdminMailTemplateUpdateInput | null {
  const payload = buildAdminMailTemplateCreateInput(values);
  if (payload === null) {
    return null;
  }

  return {
    ma_id: maId,
    ...payload,
  };
}

export function buildAdminMailRecipientQuery(
  values: AdminMailComposeFormValues,
  page: number,
  perPage: number,
): AdminMailRecipientQuery {
  return {
    email_contains: normalizeText(values.email_contains),
    gr_id: values.target_type === "group" ? normalizeText(values.gr_id) : null,
    level_max:
      values.target_type === "level" ? normalizeInteger(values.level_max) : null,
    level_min:
      values.target_type === "level" ? normalizeInteger(values.level_min) : null,
    mailling_only: values.mailling_only,
    member_id_from: normalizeText(values.member_id_from),
    member_id_to: normalizeText(values.member_id_to),
    page,
    per_page: perPage,
    search:
      values.target_type === "member" ? normalizeText(values.search) : null,
  };
}

export function buildAdminMailSendInput(
  values: AdminMailComposeFormValues,
  options: {
    selectedMemberIds: string[];
    selectedTemplateId: number | null;
  },
): AdminMailSendInput | null {
  const subject = normalizeText(values.subject);
  const content = normalizeText(values.content);
  const templateId = values.use_selected_template ? options.selectedTemplateId : null;

  if (templateId === null && (subject === null || content === null)) {
    return null;
  }

  if (values.target_type === "group" && normalizeText(values.gr_id) === null) {
    return null;
  }

  if (values.target_type === "member" && options.selectedMemberIds.length === 0) {
    return null;
  }

  return {
    ma_id: templateId,
    subject,
    content,
    target_type: values.target_type,
    level_min:
      values.target_type === "level" ? normalizeInteger(values.level_min) : null,
    level_max:
      values.target_type === "level" ? normalizeInteger(values.level_max) : null,
    gr_id: values.target_type === "group" ? normalizeText(values.gr_id) : null,
    member_id_from:
      values.target_type === "member"
        ? null
        : normalizeText(values.member_id_from),
    member_id_to:
      values.target_type === "member"
        ? null
        : normalizeText(values.member_id_to),
    email_contains:
      values.target_type === "member" ? null : normalizeText(values.email_contains),
    mb_ids:
      values.target_type === "member"
        ? Array.from(
            new Set(
              options.selectedMemberIds
                .map((memberId) => memberId.trim())
                .filter((memberId) => memberId.length > 0),
            ),
          )
        : [],
    mailling_only: values.mailling_only,
    dry_run: values.dry_run,
  };
}

function normalizeText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeInteger(value: string): number | null {
  const normalized = value.trim();
  if (normalized === "") {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
