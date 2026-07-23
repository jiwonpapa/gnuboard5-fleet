import type { AdminMemberDetail } from "../../types/AdminMemberDetail";
import type { AdminMemberUpdateInput } from "../../types/AdminMemberUpdateInput";

export type AdminMemberFormValues = {
  mb_1: string;
  mb_2: string;
  mb_3: string;
  mb_4: string;
  mb_5: string;
  mb_6: string;
  mb_7: string;
  mb_8: string;
  mb_9: string;
  mb_10: string;
  mb_name: string;
  mb_nick: string;
  mb_email: string;
  mb_homepage: string;
  mb_hp: string;
  mb_tel: string;
  mb_zip: string;
  mb_addr1: string;
  mb_addr2: string;
  mb_addr3: string;
  mb_addr_jibeon: string;
  mb_memo: string;
  mb_profile: string;
  mb_signature: string;
  mb_password: string;
  mb_certify: string;
  mb_leave_date: string;
  mb_intercept_date: string;
  mb_mailling: boolean;
  mb_sms: boolean;
  mb_marketing_agree: boolean;
  mb_thirdparty_agree: boolean;
  mb_adult: boolean;
  mb_open: boolean;
};

export const emptyAdminMemberFormValues: AdminMemberFormValues = {
  mb_1: "",
  mb_2: "",
  mb_3: "",
  mb_4: "",
  mb_5: "",
  mb_6: "",
  mb_7: "",
  mb_8: "",
  mb_9: "",
  mb_10: "",
  mb_name: "",
  mb_nick: "",
  mb_email: "",
  mb_homepage: "",
  mb_hp: "",
  mb_tel: "",
  mb_zip: "",
  mb_addr1: "",
  mb_addr2: "",
  mb_addr3: "",
  mb_addr_jibeon: "",
  mb_memo: "",
  mb_profile: "",
  mb_signature: "",
  mb_password: "",
  mb_certify: "",
  mb_leave_date: "",
  mb_intercept_date: "",
  mb_mailling: false,
  mb_sms: false,
  mb_marketing_agree: false,
  mb_thirdparty_agree: false,
  mb_adult: false,
  mb_open: false,
};

export function toAdminMemberFormValues(
  member: AdminMemberDetail,
): AdminMemberFormValues {
  return {
    mb_1: member.mb_1 ?? "",
    mb_2: member.mb_2 ?? "",
    mb_3: member.mb_3 ?? "",
    mb_4: member.mb_4 ?? "",
    mb_5: member.mb_5 ?? "",
    mb_6: member.mb_6 ?? "",
    mb_7: member.mb_7 ?? "",
    mb_8: member.mb_8 ?? "",
    mb_9: member.mb_9 ?? "",
    mb_10: member.mb_10 ?? "",
    mb_name: member.mb_name ?? "",
    mb_nick: member.mb_nick ?? "",
    mb_email: member.mb_email ?? "",
    mb_homepage: member.mb_homepage ?? "",
    mb_hp: member.mb_hp ?? "",
    mb_tel: member.mb_tel ?? "",
    mb_zip: member.mb_zip ?? "",
    mb_addr1: member.mb_addr1 ?? "",
    mb_addr2: member.mb_addr2 ?? "",
    mb_addr3: member.mb_addr3 ?? "",
    mb_addr_jibeon: member.mb_addr_jibeon ?? "",
    mb_memo: member.mb_memo ?? "",
    mb_profile: member.mb_profile ?? "",
    mb_signature: member.mb_signature ?? "",
    mb_password: "",
    mb_certify: member.mb_certify ?? "",
    mb_leave_date: member.mb_leave_date ?? "",
    mb_intercept_date: member.mb_intercept_date ?? "",
    mb_mailling: (member.mb_mailling ?? 0) === 1,
    mb_sms: (member.mb_sms ?? 0) === 1,
    mb_marketing_agree: (member.mb_marketing_agree ?? 0) === 1,
    mb_thirdparty_agree: (member.mb_thirdparty_agree ?? 0) === 1,
    mb_adult: (member.mb_adult ?? 0) === 1,
    mb_open: (member.mb_open ?? 0) === 1,
  };
}

export function buildAdminMemberUpdateInput(
  member: AdminMemberDetail,
  values: AdminMemberFormValues,
): AdminMemberUpdateInput | null {
  const input: AdminMemberUpdateInput = {
    mb_id: member.mb_id,
    mb_1: null,
    mb_2: null,
    mb_3: null,
    mb_4: null,
    mb_5: null,
    mb_6: null,
    mb_7: null,
    mb_8: null,
    mb_9: null,
    mb_10: null,
    mb_name: null,
    mb_nick: null,
    mb_email: null,
    mb_homepage: null,
    mb_hp: null,
    mb_tel: null,
    mb_zip: null,
    mb_addr1: null,
    mb_addr2: null,
    mb_addr3: null,
    mb_addr_jibeon: null,
    mb_memo: null,
    mb_profile: null,
    mb_signature: null,
    mb_password: null,
    mb_certify: null,
    mb_leave_date: null,
    mb_intercept_date: null,
    mb_mailling: null,
    mb_sms: null,
    mb_marketing_agree: null,
    mb_thirdparty_agree: null,
    mb_adult: null,
    mb_open: null,
  };

  let changed = false;

  changed = assignText(input, "mb_1", member.mb_1, values.mb_1) || changed;
  changed = assignText(input, "mb_2", member.mb_2, values.mb_2) || changed;
  changed = assignText(input, "mb_3", member.mb_3, values.mb_3) || changed;
  changed = assignText(input, "mb_4", member.mb_4, values.mb_4) || changed;
  changed = assignText(input, "mb_5", member.mb_5, values.mb_5) || changed;
  changed = assignText(input, "mb_6", member.mb_6, values.mb_6) || changed;
  changed = assignText(input, "mb_7", member.mb_7, values.mb_7) || changed;
  changed = assignText(input, "mb_8", member.mb_8, values.mb_8) || changed;
  changed = assignText(input, "mb_9", member.mb_9, values.mb_9) || changed;
  changed = assignText(input, "mb_10", member.mb_10, values.mb_10) || changed;
  changed = assignText(input, "mb_name", member.mb_name, values.mb_name) || changed;
  changed = assignText(input, "mb_nick", member.mb_nick, values.mb_nick) || changed;
  changed = assignText(input, "mb_email", member.mb_email, values.mb_email) || changed;
  changed =
    assignText(input, "mb_homepage", member.mb_homepage, values.mb_homepage) ||
    changed;
  changed = assignText(input, "mb_hp", member.mb_hp, values.mb_hp) || changed;
  changed = assignText(input, "mb_tel", member.mb_tel, values.mb_tel) || changed;
  changed = assignText(input, "mb_zip", member.mb_zip, values.mb_zip) || changed;
  changed = assignText(input, "mb_addr1", member.mb_addr1, values.mb_addr1) || changed;
  changed = assignText(input, "mb_addr2", member.mb_addr2, values.mb_addr2) || changed;
  changed = assignText(input, "mb_addr3", member.mb_addr3, values.mb_addr3) || changed;
  changed =
    assignText(
      input,
      "mb_addr_jibeon",
      member.mb_addr_jibeon,
      values.mb_addr_jibeon,
    ) || changed;
  changed = assignText(input, "mb_memo", member.mb_memo, values.mb_memo) || changed;
  changed =
    assignText(input, "mb_profile", member.mb_profile, values.mb_profile) || changed;
  changed =
    assignText(
      input,
      "mb_signature",
      member.mb_signature,
      values.mb_signature,
    ) || changed;
  changed =
    assignText(input, "mb_certify", member.mb_certify, values.mb_certify) || changed;
  changed =
    assignText(input, "mb_leave_date", member.mb_leave_date, values.mb_leave_date) ||
    changed;
  changed =
    assignText(
      input,
      "mb_intercept_date",
      member.mb_intercept_date,
      values.mb_intercept_date,
    ) || changed;
  changed = assignPassword(input, values.mb_password) || changed;
  changed = assignFlag(input, "mb_mailling", member.mb_mailling, values.mb_mailling) || changed;
  changed = assignFlag(input, "mb_sms", member.mb_sms, values.mb_sms) || changed;
  changed =
    assignFlag(
      input,
      "mb_marketing_agree",
      member.mb_marketing_agree,
      values.mb_marketing_agree,
    ) || changed;
  changed =
    assignFlag(
      input,
      "mb_thirdparty_agree",
      member.mb_thirdparty_agree,
      values.mb_thirdparty_agree,
    ) || changed;
  changed = assignFlag(input, "mb_adult", member.mb_adult, values.mb_adult) || changed;
  changed = assignFlag(input, "mb_open", member.mb_open, values.mb_open) || changed;

  return changed ? input : null;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function assignText(
  input: AdminMemberUpdateInput,
  field: keyof Pick<
    AdminMemberUpdateInput,
    | "mb_name"
    | "mb_1"
    | "mb_2"
    | "mb_3"
    | "mb_4"
    | "mb_5"
    | "mb_6"
    | "mb_7"
    | "mb_8"
    | "mb_9"
    | "mb_10"
    | "mb_nick"
    | "mb_email"
    | "mb_homepage"
    | "mb_hp"
    | "mb_tel"
    | "mb_zip"
    | "mb_addr1"
    | "mb_addr2"
    | "mb_addr3"
    | "mb_addr_jibeon"
    | "mb_memo"
    | "mb_profile"
    | "mb_signature"
    | "mb_certify"
    | "mb_leave_date"
    | "mb_intercept_date"
  >,
  currentValue: string | null | undefined,
  nextValue: string,
): boolean {
  const normalizedCurrent = normalizeText(currentValue);
  const normalizedNext = normalizeText(nextValue);

  if (normalizedCurrent === normalizedNext) {
    return false;
  }

  input[field] = normalizedNext;
  return true;
}

function assignPassword(
  input: AdminMemberUpdateInput,
  nextValue: string,
): boolean {
  const normalizedNext = normalizeText(nextValue);

  if (normalizedNext.length === 0) {
    return false;
  }

  input.mb_password = normalizedNext;
  return true;
}

function assignFlag(
  input: AdminMemberUpdateInput,
  field: keyof Pick<
    AdminMemberUpdateInput,
    | "mb_mailling"
    | "mb_sms"
    | "mb_marketing_agree"
    | "mb_thirdparty_agree"
    | "mb_adult"
    | "mb_open"
  >,
  currentValue: number | null | undefined,
  nextValue: boolean,
): boolean {
  const normalizedCurrent = (currentValue ?? 0) === 1 ? 1 : 0;
  const normalizedNext = nextValue ? 1 : 0;

  if (normalizedCurrent === normalizedNext) {
    return false;
  }

  input[field] = normalizedNext;
  return true;
}
