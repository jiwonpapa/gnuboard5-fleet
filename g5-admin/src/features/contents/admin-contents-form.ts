import { z } from "zod";
import type { AdminContentCreateInput } from "../../types/AdminContentCreateInput";
import type { AdminContentListQuery } from "../../types/AdminContentListQuery";
import type { AdminContentUpdateInput } from "../../types/AdminContentUpdateInput";

const contentIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{1,20}$/, "co_id는 영문/숫자/_ 20자 이하여야 합니다.");

export const adminContentFormSchema = z.object({
  co_id: contentIdSchema,
  co_subject: z.string().trim().min(1, "제목을 입력해 주십시오."),
  co_html: z.boolean(),
  co_content: z.string().trim().min(1, "본문을 입력해 주십시오."),
  co_mobile_content: z.string().trim(),
  co_include_head: z.string().trim(),
  co_include_tail: z.string().trim(),
  co_tag_filter_use: z.boolean(),
  co_skin: z.string().trim(),
  co_mobile_skin: z.string().trim(),
});

export type AdminContentFormValues = z.infer<typeof adminContentFormSchema>;

export const emptyAdminContentFormValues: AdminContentFormValues = {
  co_id: "",
  co_subject: "",
  co_html: false,
  co_content: "",
  co_mobile_content: "",
  co_include_head: "",
  co_include_tail: "",
  co_tag_filter_use: true,
  co_skin: "",
  co_mobile_skin: "",
};

export function buildAdminContentListQuery(
  search: string,
  page: number,
  perPage: number,
): AdminContentListQuery {
  return {
    page,
    per_page: perPage,
    search: normalizeString(search),
  };
}

export function buildAdminContentCreateInput(
  values: AdminContentFormValues,
): AdminContentCreateInput {
  return {
    co_id: values.co_id.trim(),
    co_subject: values.co_subject.trim(),
    co_html: values.co_html ? 1 : 0,
    co_content: values.co_content.trim(),
    co_mobile_content: normalizeString(values.co_mobile_content),
    co_include_head: normalizeString(values.co_include_head),
    co_include_tail: normalizeString(values.co_include_tail),
    co_tag_filter_use: values.co_tag_filter_use ? 1 : 0,
    co_skin: normalizeString(values.co_skin),
    co_mobile_skin: normalizeString(values.co_mobile_skin),
  };
}

export function buildAdminContentUpdateInput(
  values: AdminContentFormValues,
): AdminContentUpdateInput {
  return {
    co_id: values.co_id.trim(),
    co_subject: values.co_subject.trim(),
    co_html: values.co_html ? 1 : 0,
    co_content: values.co_content.trim(),
    co_mobile_content: normalizeString(values.co_mobile_content),
    co_include_head: normalizeString(values.co_include_head),
    co_include_tail: normalizeString(values.co_include_tail),
    co_tag_filter_use: values.co_tag_filter_use ? 1 : 0,
    co_skin: normalizeString(values.co_skin),
    co_mobile_skin: normalizeString(values.co_mobile_skin),
  };
}

function normalizeString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
