import { z } from "zod";
import type { AdminQaConfig } from "../../types/AdminQaConfig";
import type { AdminQaConfigUpdateInput } from "../../types/AdminQaConfigUpdateInput";

export const qaConfigFields = [
  "qa_title",
  "qa_category",
  "qa_skin",
  "qa_mobile_skin",
  "qa_use_email",
  "qa_req_email",
  "qa_use_hp",
  "qa_req_hp",
  "qa_use_sms",
  "qa_send_number",
  "qa_admin_hp",
  "qa_admin_email",
  "qa_use_editor",
  "qa_subject_len",
  "qa_mobile_subject_len",
  "qa_page_rows",
  "qa_mobile_page_rows",
  "qa_image_width",
  "qa_upload_size",
  "qa_insert_content",
  "qa_include_head",
  "qa_include_tail",
  "qa_content_head",
  "qa_content_tail",
  "qa_mobile_content_head",
  "qa_mobile_content_tail",
] as const;

export type QaConfigField = (typeof qaConfigFields)[number];
export type QaConfigFormValues = Record<QaConfigField, string>;

export const qaConfigTextAreaFields = new Set<QaConfigField>([
  "qa_insert_content",
  "qa_include_head",
  "qa_include_tail",
  "qa_content_head",
  "qa_content_tail",
  "qa_mobile_content_head",
  "qa_mobile_content_tail",
]);

export const qaConfigFieldLabels: Record<QaConfigField, string> = {
  qa_title: "제목",
  qa_category: "카테고리",
  qa_skin: "스킨",
  qa_mobile_skin: "모바일 스킨",
  qa_use_email: "이메일 사용",
  qa_req_email: "이메일 필수",
  qa_use_hp: "휴대폰 사용",
  qa_req_hp: "휴대폰 필수",
  qa_use_sms: "SMS 사용",
  qa_send_number: "발신 번호",
  qa_admin_hp: "관리자 휴대폰",
  qa_admin_email: "관리자 이메일",
  qa_use_editor: "에디터 사용",
  qa_subject_len: "제목 길이",
  qa_mobile_subject_len: "모바일 제목 길이",
  qa_page_rows: "페이지 행 수",
  qa_mobile_page_rows: "모바일 행 수",
  qa_image_width: "이미지 너비",
  qa_upload_size: "업로드 크기",
  qa_insert_content: "기본 본문",
  qa_include_head: "include head",
  qa_include_tail: "include tail",
  qa_content_head: "본문 상단",
  qa_content_tail: "본문 하단",
  qa_mobile_content_head: "모바일 본문 상단",
  qa_mobile_content_tail: "모바일 본문 하단",
};

const qaConfigTextField = z.string().trim();
const qaConfigNumericField = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || /^\d+$/.test(value),
    "숫자만 입력해 주세요.",
  );

const qaConfigFormShape = {
  qa_admin_email: qaConfigTextField,
  qa_admin_hp: qaConfigTextField,
  qa_category: qaConfigTextField,
  qa_content_head: qaConfigTextField,
  qa_content_tail: qaConfigTextField,
  qa_image_width: qaConfigNumericField,
  qa_include_head: qaConfigTextField,
  qa_include_tail: qaConfigTextField,
  qa_insert_content: qaConfigTextField,
  qa_mobile_content_head: qaConfigTextField,
  qa_mobile_content_tail: qaConfigTextField,
  qa_mobile_page_rows: qaConfigNumericField,
  qa_mobile_skin: qaConfigTextField,
  qa_mobile_subject_len: qaConfigNumericField,
  qa_page_rows: qaConfigNumericField,
  qa_req_email: qaConfigTextField,
  qa_req_hp: qaConfigTextField,
  qa_send_number: qaConfigTextField,
  qa_skin: qaConfigTextField,
  qa_subject_len: qaConfigNumericField,
  qa_title: qaConfigTextField,
  qa_upload_size: qaConfigNumericField,
  qa_use_editor: qaConfigTextField,
  qa_use_email: qaConfigTextField,
  qa_use_hp: qaConfigTextField,
  qa_use_sms: qaConfigTextField,
} satisfies Record<QaConfigField, z.ZodTypeAny>;

export const qaConfigFormSchema = z.object(qaConfigFormShape);

export function emptyQaConfigFormValues(): QaConfigFormValues {
  return qaConfigFields.reduce(
    (values, field) => ({ ...values, [field]: "" }),
    {} as QaConfigFormValues,
  );
}

export function toQaConfigFormValues(
  config: AdminQaConfig | null | undefined,
): QaConfigFormValues {
  const values = emptyQaConfigFormValues();

  if (!config) {
    return values;
  }

  for (const field of qaConfigFields) {
    values[field] = config[field] ?? "";
  }

  return values;
}

export function buildQaConfigUpdateInput(
  config: AdminQaConfig,
  values: QaConfigFormValues,
): AdminQaConfigUpdateInput | null {
  const input: AdminQaConfigUpdateInput = {
    qa_title: null,
    qa_category: null,
    qa_skin: null,
    qa_mobile_skin: null,
    qa_use_email: null,
    qa_req_email: null,
    qa_use_hp: null,
    qa_req_hp: null,
    qa_use_sms: null,
    qa_send_number: null,
    qa_admin_hp: null,
    qa_admin_email: null,
    qa_use_editor: null,
    qa_subject_len: null,
    qa_mobile_subject_len: null,
    qa_page_rows: null,
    qa_mobile_page_rows: null,
    qa_image_width: null,
    qa_upload_size: null,
    qa_insert_content: null,
    qa_include_head: null,
    qa_include_tail: null,
    qa_content_head: null,
    qa_content_tail: null,
    qa_mobile_content_head: null,
    qa_mobile_content_tail: null,
  };

  let changed = false;

  for (const field of qaConfigFields) {
    const currentValue = (config[field] ?? "").trim();
    const nextValue = values[field].trim();
    if (currentValue !== nextValue) {
      input[field] = nextValue;
      changed = true;
    }
  }

  return changed ? input : null;
}
