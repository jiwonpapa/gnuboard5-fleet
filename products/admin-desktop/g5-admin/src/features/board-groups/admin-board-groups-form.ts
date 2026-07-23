import { z } from "zod";
import type { AdminBoardGroupCreateInput } from "../../types/AdminBoardGroupCreateInput";
import type { AdminBoardGroupMemberAddInput } from "../../types/AdminBoardGroupMemberAddInput";
import type { AdminBoardGroupUpdateInput } from "../../types/AdminBoardGroupUpdateInput";

const groupIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]{1,10}$/, "gr_id는 영문/숫자/_ 10자 이하여야 합니다.");

const memberIdSchema = z.string().trim().min(1, "회원 아이디를 입력해 주십시오.");

export const adminBoardGroupFormSchema = z.object({
  gr_id: groupIdSchema,
  gr_subject: z.string().trim().min(1, "그룹 제목을 입력해 주십시오."),
  gr_admin: z.string().trim(),
  gr_device: z.enum(["both", "pc", "mobile"]),
  gr_use_access: z.boolean(),
});

export type AdminBoardGroupFormValues = z.infer<typeof adminBoardGroupFormSchema>;

export const emptyAdminBoardGroupFormValues: AdminBoardGroupFormValues = {
  gr_id: "",
  gr_subject: "",
  gr_admin: "",
  gr_device: "both",
  gr_use_access: false,
};

export const adminBoardGroupMemberFormSchema = z.object({
  mb_id: memberIdSchema,
});

export type AdminBoardGroupMemberFormValues = z.infer<
  typeof adminBoardGroupMemberFormSchema
>;

export const emptyAdminBoardGroupMemberFormValues: AdminBoardGroupMemberFormValues = {
  mb_id: "",
};

export function buildAdminBoardGroupCreateInput(
  values: AdminBoardGroupFormValues,
): AdminBoardGroupCreateInput {
  return {
    gr_id: values.gr_id.trim(),
    gr_subject: values.gr_subject.trim(),
    gr_admin: normalizeString(values.gr_admin),
    gr_device: values.gr_device,
    gr_use_access: values.gr_use_access ? 1 : 0,
  };
}

export function buildAdminBoardGroupUpdateInput(
  values: AdminBoardGroupFormValues,
): AdminBoardGroupUpdateInput {
  return {
    gr_id: values.gr_id.trim(),
    gr_subject: values.gr_subject.trim(),
    gr_admin: normalizeString(values.gr_admin),
    gr_device: values.gr_device,
    gr_use_access: values.gr_use_access ? 1 : 0,
  };
}

export function buildAdminBoardGroupMemberAddInput(
  grId: string,
  values: AdminBoardGroupMemberFormValues,
): AdminBoardGroupMemberAddInput {
  return {
    gr_id: grId.trim(),
    mb_id: values.mb_id.trim(),
  };
}

function normalizeString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
