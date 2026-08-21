import type { AdminSmsConfig, AdminSmsConfigUpdate } from "../../api/fleet";

export interface AdminSmsConfigDraft {
  cf_sms_use: "" | "icode";
  cf_sms_type: "" | "LMS";
  cf_icode_id: string;
  cf_icode_pw: string;
  cf_icode_server_ip: string;
  cf_icode_server_port: string;
  cf_icode_token_key: string;
  cf_phone: string;
}

export const emptyAdminSmsConfigDraft: AdminSmsConfigDraft = {
  cf_sms_use: "",
  cf_sms_type: "",
  cf_icode_id: "",
  cf_icode_pw: "",
  cf_icode_server_ip: "",
  cf_icode_server_port: "",
  cf_icode_token_key: "",
  cf_phone: "",
};

export function smsConfigToDraft(config: AdminSmsConfig): AdminSmsConfigDraft {
  return {
    cf_sms_use: config.cf_sms_use === "icode" ? "icode" : "",
    cf_sms_type: config.cf_sms_type === "LMS" ? "LMS" : "",
    cf_icode_id: text(config.cf_icode_id),
    cf_icode_pw: "",
    cf_icode_server_ip: text(config.cf_icode_server_ip),
    cf_icode_server_port: text(config.cf_icode_server_port),
    cf_icode_token_key: "",
    cf_phone: text(config.cf_phone),
  };
}

export function buildAdminSmsConfigUpdate(
  baseline: AdminSmsConfig,
  draft: AdminSmsConfigDraft,
): AdminSmsConfigUpdate | null {
  const update: AdminSmsConfigUpdate = {};
  assign(update, "cf_sms_use", draft.cf_sms_use, baseline.cf_sms_use);
  assign(update, "cf_sms_type", draft.cf_sms_type, baseline.cf_sms_type);
  assign(update, "cf_icode_id", draft.cf_icode_id, baseline.cf_icode_id);
  assign(update, "cf_icode_server_ip", draft.cf_icode_server_ip, baseline.cf_icode_server_ip);
  assign(update, "cf_icode_server_port", draft.cf_icode_server_port, baseline.cf_icode_server_port);
  assign(update, "cf_phone", draft.cf_phone, baseline.cf_phone);

  const password = draft.cf_icode_pw.trim();
  const token = draft.cf_icode_token_key.trim();
  if (password) update.cf_icode_pw = password;
  if (token) update.cf_icode_token_key = token;

  return Object.keys(update).length > 0 && validateAdminSmsConfigUpdate(update) === null
    ? update
    : null;
}

export function validateAdminSmsConfigDraft(draft: AdminSmsConfigDraft): string | null {
  const port = draft.cf_icode_server_port.trim();
  if (port && (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535)) {
    return "서버 포트는 1~65535 범위의 숫자로 입력하십시오.";
  }
  if (draft.cf_phone.trim() && !validCallbackPhone(draft.cf_phone)) {
    return "회신번호 형식이 올바르지 않습니다.";
  }
  return null;
}

function validateAdminSmsConfigUpdate(update: AdminSmsConfigUpdate): string | null {
  if (update.cf_icode_server_port !== undefined) {
    const port = update.cf_icode_server_port;
    if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) return "invalid";
  }
  if (update.cf_phone !== undefined && !validCallbackPhone(update.cf_phone)) return "invalid";
  return null;
}

export function validCallbackPhone(value: string): boolean {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length < 8 || digits.length > 12) return false;
  if (digits.startsWith("1588") && digits.length !== 8) return false;
  if (digits.startsWith("02") && ![9, 10].includes(digits.length)) return false;
  if (digits.startsWith("030") && ![10, 11].includes(digits.length)) return false;
  if (/^(010000|02000)/.test(digits)) return false;
  return /^(02|030|070|080|007|01[01356789]|0[3-6]\d|15|16|18)/.test(digits);
}

function assign(
  update: AdminSmsConfigUpdate,
  key: keyof AdminSmsConfigUpdate,
  next: string,
  baseline: string | null,
) {
  const normalized = next.trim();
  if (normalized !== (baseline ?? "").trim()) update[key] = normalized as never;
}

function text(value: string | null): string {
  return value ?? "";
}
