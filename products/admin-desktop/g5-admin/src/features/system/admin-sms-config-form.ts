import type { AdminSmsConfig } from "../../types/AdminSmsConfig";
import type { AdminSmsConfigUpdateInput } from "../../types/AdminSmsConfigUpdateInput";

export type AdminSmsConfigFormValues = {
  cf_sms_use: "" | "icode";
  cf_sms_type: "" | "LMS";
  cf_icode_id: string;
  cf_icode_pw: string;
  cf_icode_server_ip: string;
  cf_icode_server_port: string;
  cf_icode_token_key: string;
  cf_phone: string;
};

export const emptyAdminSmsConfigFormValues: AdminSmsConfigFormValues = {
  cf_sms_use: "",
  cf_sms_type: "",
  cf_icode_id: "",
  cf_icode_pw: "",
  cf_icode_server_ip: "",
  cf_icode_server_port: "",
  cf_icode_token_key: "",
  cf_phone: "",
};

export function toAdminSmsConfigFormValues(
  config: AdminSmsConfig,
): AdminSmsConfigFormValues {
  return {
    cf_sms_use: enumValue(config.cf_sms_use, ["", "icode"]),
    cf_sms_type: enumValue(config.cf_sms_type, ["", "LMS"]),
    cf_icode_id: text(config.cf_icode_id),
    cf_icode_pw: text(config.cf_icode_pw),
    cf_icode_server_ip: text(config.cf_icode_server_ip),
    cf_icode_server_port: text(config.cf_icode_server_port),
    cf_icode_token_key: text(config.cf_icode_token_key),
    cf_phone: text(config.cf_phone),
  };
}

export function buildAdminSmsConfigUpdateInput(
  values: AdminSmsConfigFormValues,
  baseline: AdminSmsConfig,
): Partial<AdminSmsConfigUpdateInput> {
  const payload: Partial<AdminSmsConfigUpdateInput> = {};

  assignString(payload, "cf_sms_use", values.cf_sms_use, baseline.cf_sms_use);
  assignString(payload, "cf_sms_type", values.cf_sms_type, baseline.cf_sms_type);
  assignString(payload, "cf_icode_id", values.cf_icode_id, baseline.cf_icode_id);
  assignString(payload, "cf_icode_pw", values.cf_icode_pw, baseline.cf_icode_pw);
  assignString(
    payload,
    "cf_icode_server_ip",
    values.cf_icode_server_ip,
    baseline.cf_icode_server_ip,
  );
  assignString(
    payload,
    "cf_icode_server_port",
    values.cf_icode_server_port,
    baseline.cf_icode_server_port,
    normalizeSmsServerPort,
  );
  assignString(
    payload,
    "cf_icode_token_key",
    values.cf_icode_token_key,
    baseline.cf_icode_token_key,
  );
  assignString(payload, "cf_phone", values.cf_phone, baseline.cf_phone);

  return payload;
}

export function validateAdminSmsConfigUpdateInput(
  payload: Partial<AdminSmsConfigUpdateInput>,
) {
  const errors: Partial<Record<keyof AdminSmsConfigFormValues, string>> = {};

  if (Object.prototype.hasOwnProperty.call(payload, "cf_icode_server_port")) {
    const port = normalizeSmsServerPort(payload.cf_icode_server_port);
    if (!isValidSmsServerPort(port)) {
      errors.cf_icode_server_port = "포트는 숫자만 입력해야 합니다.";
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "cf_phone")) {
    const phone = normalizeText(payload.cf_phone);
    if (!isValidSmsCallbackPhone(phone)) {
      errors.cf_phone = "회신번호 형식이 올바르지 않습니다.";
    }
  }

  return errors;
}

export function isValidSmsServerPort(value: string): boolean {
  return normalizeSmsServerPort(value) !== "";
}

export function isValidSmsCallbackPhone(value: string): boolean {
  const digits = normalizePhoneDigits(value);
  if (digits === "") {
    return false;
  }

  if (digits.startsWith("1588") && digits.length !== 8) {
    return false;
  }

  if (digits.startsWith("02") && ![9, 10].includes(digits.length)) {
    return false;
  }

  if (digits.startsWith("030") && ![10, 11].includes(digits.length)) {
    return false;
  }

  const mainPattern = /^(02|0[3-6]\d|01(0|1|3|5|6|7|8|9)|070|080|007)\d{7,9}$/;
  const shortPattern = /^(15|16|18)\d{6,7}$/;
  const blockedPattern = /^(02|0[3-6]\d|01(0|1|3|5|6|7|8|9)|070|080)0{3,4}\d{4}$/;

  if (!mainPattern.test(digits) && !shortPattern.test(digits)) {
    return false;
  }

  return !blockedPattern.test(digits);
}

function assignString(
  payload: Partial<AdminSmsConfigUpdateInput>,
  key: keyof AdminSmsConfigUpdateInput,
  nextValue: string,
  baselineValue: string | null | undefined,
  normalize: (value: string | null | undefined) => string = normalizeText,
) {
  const normalizedNextValue = normalize(nextValue);
  const normalizedBaselineValue = normalize(baselineValue);

  if (normalizedNextValue !== normalizedBaselineValue) {
    payload[key] = normalizedNextValue;
  }
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function enumValue<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T {
  return allowed.includes((normalizeText(value) ?? "") as T)
    ? ((normalizeText(value) ?? "") as T)
    : allowed[0];
}

function normalizePhoneDigits(value: string | null | undefined): string {
  return normalizeText(value).replace(/[^0-9]/g, "");
}

function normalizeSmsServerPort(value: string | null | undefined): string {
  return normalizePhoneDigits(value);
}

function text(value: string | null | undefined): string {
  return value ?? "";
}
