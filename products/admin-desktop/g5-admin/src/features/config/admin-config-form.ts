import type { AdminConfig } from "../../types/AdminConfig";
import type { AdminConfigUpdateInput } from "../../types/AdminConfigUpdateInput";
import {
  adminConfigExtraFlagFieldNames,
  adminConfigExtraTextFieldNames,
  type AdminConfigExtraFlagFieldName,
  type AdminConfigExtraTextFieldName,
} from "./config-field-meta";

export type AdminConfigFormValues = {
  cf_title: string;
  cf_admin: string;
  cf_admin_email: string;
  cf_admin_email_name: string;
  cf_register_level: string;
  cf_register_point: string;
  cf_login_point: string;
  cf_write_point: string;
  cf_comment_point: string;
  cf_download_point: string;
  cf_read_point: string;
  cf_memo_send_point: string;
  cf_new_skin: string;
  cf_search_skin: string;
  cf_connect_skin: string;
  cf_faq_skin: string;
  cf_editor: string;
  cf_member_skin: string;
  cf_mobile_member_skin: string;
  cf_captcha: string;
  cf_use_point: boolean;
  cf_use_email_certify: boolean;
  cf_use_homepage: boolean;
  cf_req_homepage: boolean;
  cf_use_tel: boolean;
  cf_req_tel: boolean;
  cf_use_hp: boolean;
  cf_req_hp: boolean;
  cf_use_addr: boolean;
  cf_req_addr: boolean;
  cf_social_login_use: boolean;
  extraFlags: Record<AdminConfigExtraFlagFieldName, boolean>;
  extraTexts: Record<AdminConfigExtraTextFieldName, string>;
};

export const emptyAdminConfigFormValues: AdminConfigFormValues = {
  cf_title: "",
  cf_admin: "",
  cf_admin_email: "",
  cf_admin_email_name: "",
  cf_register_level: "",
  cf_register_point: "",
  cf_login_point: "",
  cf_write_point: "",
  cf_comment_point: "",
  cf_download_point: "",
  cf_read_point: "",
  cf_memo_send_point: "",
  cf_new_skin: "",
  cf_search_skin: "",
  cf_connect_skin: "",
  cf_faq_skin: "",
  cf_editor: "",
  cf_member_skin: "",
  cf_mobile_member_skin: "",
  cf_captcha: "",
  cf_use_point: false,
  cf_use_email_certify: false,
  cf_use_homepage: false,
  cf_req_homepage: false,
  cf_use_tel: false,
  cf_req_tel: false,
  cf_use_hp: false,
  cf_req_hp: false,
  cf_use_addr: false,
  cf_req_addr: false,
  cf_social_login_use: false,
  extraFlags: createEmptyExtraFlags(),
  extraTexts: createEmptyExtraTexts(),
};

export function toAdminConfigFormValues(
  config: AdminConfig,
): AdminConfigFormValues {
  const extraTexts = createEmptyExtraTexts();
  for (const field of adminConfigExtraTextFieldNames) {
    extraTexts[field] = text(config.extra?.[field]);
  }

  const extraFlags = createEmptyExtraFlags();
  for (const field of adminConfigExtraFlagFieldNames) {
    extraFlags[field] = enabled(config.extra?.[field]);
  }

  return {
    cf_title: text(config.cf_title),
    cf_admin: text(config.cf_admin),
    cf_admin_email: text(config.cf_admin_email),
    cf_admin_email_name: text(config.cf_admin_email_name),
    cf_register_level: text(config.cf_register_level),
    cf_register_point: text(config.cf_register_point),
    cf_login_point: text(config.cf_login_point),
    cf_write_point: text(config.cf_write_point),
    cf_comment_point: text(config.cf_comment_point),
    cf_download_point: text(config.cf_download_point),
    cf_read_point: text(config.cf_read_point),
    cf_memo_send_point: text(config.cf_memo_send_point),
    cf_new_skin: text(config.cf_new_skin),
    cf_search_skin: text(config.cf_search_skin),
    cf_connect_skin: text(config.cf_connect_skin),
    cf_faq_skin: text(config.cf_faq_skin),
    cf_editor: text(config.cf_editor),
    cf_member_skin: text(config.cf_member_skin),
    cf_mobile_member_skin: text(config.cf_mobile_member_skin),
    cf_captcha: text(config.cf_captcha),
    cf_use_point: enabled(config.cf_use_point),
    cf_use_email_certify: enabled(config.cf_use_email_certify),
    cf_use_homepage: enabled(config.cf_use_homepage),
    cf_req_homepage: enabled(config.cf_req_homepage),
    cf_use_tel: enabled(config.cf_use_tel),
    cf_req_tel: enabled(config.cf_req_tel),
    cf_use_hp: enabled(config.cf_use_hp),
    cf_req_hp: enabled(config.cf_req_hp),
    cf_use_addr: enabled(config.cf_use_addr),
    cf_req_addr: enabled(config.cf_req_addr),
    cf_social_login_use: enabled(config.cf_social_login_use),
    extraFlags,
    extraTexts,
  };
}

export function buildAdminConfigUpdateInput(
  values: AdminConfigFormValues,
  baseline: AdminConfig,
): Partial<AdminConfigUpdateInput> {
  const payload: Partial<AdminConfigUpdateInput> & {
    extra?: Record<string, string>;
  } = {
    extra: {},
  };

  assignString(payload, "cf_title", values.cf_title, baseline.cf_title);
  assignString(payload, "cf_admin", values.cf_admin, baseline.cf_admin);
  assignString(
    payload,
    "cf_admin_email",
    values.cf_admin_email,
    baseline.cf_admin_email,
  );
  assignString(
    payload,
    "cf_admin_email_name",
    values.cf_admin_email_name,
    baseline.cf_admin_email_name,
  );
  assignString(
    payload,
    "cf_register_level",
    values.cf_register_level,
    baseline.cf_register_level,
  );
  assignString(
    payload,
    "cf_register_point",
    values.cf_register_point,
    baseline.cf_register_point,
  );
  assignString(
    payload,
    "cf_login_point",
    values.cf_login_point,
    baseline.cf_login_point,
  );
  assignString(
    payload,
    "cf_write_point",
    values.cf_write_point,
    baseline.cf_write_point,
  );
  assignString(
    payload,
    "cf_comment_point",
    values.cf_comment_point,
    baseline.cf_comment_point,
  );
  assignString(
    payload,
    "cf_download_point",
    values.cf_download_point,
    baseline.cf_download_point,
  );
  assignString(
    payload,
    "cf_read_point",
    values.cf_read_point,
    baseline.cf_read_point,
  );
  assignString(
    payload,
    "cf_memo_send_point",
    values.cf_memo_send_point,
    baseline.cf_memo_send_point,
  );
  assignString(payload, "cf_new_skin", values.cf_new_skin, baseline.cf_new_skin);
  assignString(
    payload,
    "cf_search_skin",
    values.cf_search_skin,
    baseline.cf_search_skin,
  );
  assignString(
    payload,
    "cf_connect_skin",
    values.cf_connect_skin,
    baseline.cf_connect_skin,
  );
  assignString(payload, "cf_faq_skin", values.cf_faq_skin, baseline.cf_faq_skin);
  assignString(payload, "cf_editor", values.cf_editor, baseline.cf_editor);
  assignString(
    payload,
    "cf_member_skin",
    values.cf_member_skin,
    baseline.cf_member_skin,
  );
  assignString(
    payload,
    "cf_mobile_member_skin",
    values.cf_mobile_member_skin,
    baseline.cf_mobile_member_skin,
  );
  assignString(payload, "cf_captcha", values.cf_captcha, baseline.cf_captcha);
  assignBoolean(payload, "cf_use_point", values.cf_use_point, baseline.cf_use_point);
  assignBoolean(
    payload,
    "cf_use_email_certify",
    values.cf_use_email_certify,
    baseline.cf_use_email_certify,
  );
  assignBoolean(
    payload,
    "cf_use_homepage",
    values.cf_use_homepage,
    baseline.cf_use_homepage,
  );
  assignBoolean(
    payload,
    "cf_req_homepage",
    values.cf_req_homepage,
    baseline.cf_req_homepage,
  );
  assignBoolean(payload, "cf_use_tel", values.cf_use_tel, baseline.cf_use_tel);
  assignBoolean(payload, "cf_req_tel", values.cf_req_tel, baseline.cf_req_tel);
  assignBoolean(payload, "cf_use_hp", values.cf_use_hp, baseline.cf_use_hp);
  assignBoolean(payload, "cf_req_hp", values.cf_req_hp, baseline.cf_req_hp);
  assignBoolean(payload, "cf_use_addr", values.cf_use_addr, baseline.cf_use_addr);
  assignBoolean(payload, "cf_req_addr", values.cf_req_addr, baseline.cf_req_addr);
  assignBoolean(
    payload,
    "cf_social_login_use",
    values.cf_social_login_use,
    baseline.cf_social_login_use,
  );

  const extra: Record<string, string> = {};
  for (const field of adminConfigExtraTextFieldNames) {
    const normalizedNext = normalizeText(values.extraTexts[field]);
    const normalizedPrevious = text(baseline.extra?.[field]);
    if (normalizedNext !== normalizedPrevious) {
      extra[field] = normalizedNext;
    }
  }
  for (const field of adminConfigExtraFlagFieldNames) {
    const normalizedNext = values.extraFlags[field] ? "1" : "0";
    const normalizedPrevious = enabled(baseline.extra?.[field]) ? "1" : "0";
    if (normalizedNext !== normalizedPrevious) {
      extra[field] = normalizedNext;
    }
  }
  payload.extra = extra;

  return payload;
}

export function hasAdminConfigUpdateChanges(
  payload: Partial<AdminConfigUpdateInput>,
) {
  return Object.entries(payload).some(([key, value]) => {
    if (key !== "extra") {
      return value !== undefined;
    }

    return value !== undefined && Object.keys(value as Record<string, string>).length > 0;
  });
}

export function flag(value: boolean) {
  return value ? "ON" : "OFF";
}

export function isEnabled(value: string | null | undefined) {
  return enabled(value);
}

function assignString(
  payload: Partial<AdminConfigUpdateInput>,
  key: keyof AdminConfigUpdateInput,
  next: string,
  previous: string | null | undefined,
) {
  const normalizedNext = normalizeText(next);
  const normalizedPrevious = text(previous);

  if (normalizedNext !== normalizedPrevious) {
    payload[key] = normalizedNext as never;
  }
}

function assignBoolean(
  payload: Partial<AdminConfigUpdateInput>,
  key: keyof AdminConfigUpdateInput,
  next: boolean,
  previous: string | null | undefined,
) {
  const normalizedNext = next ? "1" : "0";
  const normalizedPrevious = enabled(previous) ? "1" : "0";

  if (normalizedNext !== normalizedPrevious) {
    payload[key] = normalizedNext as never;
  }
}

function text(value: string | null | undefined) {
  return (value ?? "").trim();
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function enabled(value: string | null | undefined) {
  return ["1", "true", "on", "yes", "y"].includes(text(value).toLowerCase());
}

function createEmptyExtraTexts(): Record<AdminConfigExtraTextFieldName, string> {
  return Object.fromEntries(
    adminConfigExtraTextFieldNames.map((field) => [field, ""]),
  ) as Record<AdminConfigExtraTextFieldName, string>;
}

function createEmptyExtraFlags(): Record<AdminConfigExtraFlagFieldName, boolean> {
  return Object.fromEntries(
    adminConfigExtraFlagFieldNames.map((field) => [field, false]),
  ) as Record<AdminConfigExtraFlagFieldName, boolean>;
}
