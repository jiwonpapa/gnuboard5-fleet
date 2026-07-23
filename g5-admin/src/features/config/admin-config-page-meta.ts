import { z } from "zod";
import {
  adminConfigExtraFlagFieldNames,
  adminConfigExtraTextFieldNames,
  type AdminConfigExtraFlagFieldName,
  type AdminConfigExtraTextFieldName,
} from "./config-field-meta";

export const adminConfigExtraFieldNameSet = new Set<string>([
  ...adminConfigExtraTextFieldNames,
  ...adminConfigExtraFlagFieldNames,
]);

export const adminConfigKey = ["admin", "config", "general"] as const;

const emailField = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "올바른 이메일 형식이 아닙니다.",
  );

const adminConfigExtraFlagShape = Object.fromEntries(
  adminConfigExtraFlagFieldNames.map((field) => [field, z.boolean()]),
) as Record<AdminConfigExtraFlagFieldName, z.ZodBoolean>;

const adminConfigExtraTextShape = Object.fromEntries(
  adminConfigExtraTextFieldNames.map((field) => [field, z.string()]),
) as Record<AdminConfigExtraTextFieldName, z.ZodString>;

export const adminConfigSchema = z.object({
  cf_title: z.string().trim(),
  cf_admin: z.string().trim(),
  cf_admin_email: emailField,
  cf_admin_email_name: z.string().trim(),
  cf_register_level: z.string().trim(),
  cf_register_point: z.string().trim(),
  cf_login_point: z.string().trim(),
  cf_write_point: z.string().trim(),
  cf_comment_point: z.string().trim(),
  cf_download_point: z.string().trim(),
  cf_read_point: z.string().trim(),
  cf_memo_send_point: z.string().trim(),
  cf_new_skin: z.string().trim(),
  cf_search_skin: z.string().trim(),
  cf_connect_skin: z.string().trim(),
  cf_faq_skin: z.string().trim(),
  cf_editor: z.string().trim(),
  cf_member_skin: z.string().trim(),
  cf_mobile_member_skin: z.string().trim(),
  cf_captcha: z.string().trim(),
  cf_use_point: z.boolean(),
  cf_use_email_certify: z.boolean(),
  cf_use_homepage: z.boolean(),
  cf_req_homepage: z.boolean(),
  cf_use_tel: z.boolean(),
  cf_req_tel: z.boolean(),
  cf_use_hp: z.boolean(),
  cf_req_hp: z.boolean(),
  cf_use_addr: z.boolean(),
  cf_req_addr: z.boolean(),
  cf_social_login_use: z.boolean(),
  extraFlags: z.object(adminConfigExtraFlagShape),
  extraTexts: z.object(adminConfigExtraTextShape),
});
