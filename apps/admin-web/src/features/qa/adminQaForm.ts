import type { AdminQaConfig, AdminQaConfigUpdate } from "../../api/fleet";

export const qaConfigFields = [
  "qa_title", "qa_category", "qa_skin", "qa_mobile_skin",
  "qa_use_email", "qa_req_email", "qa_use_hp", "qa_req_hp", "qa_use_sms",
  "qa_send_number", "qa_admin_hp", "qa_admin_email", "qa_use_editor",
  "qa_subject_len", "qa_mobile_subject_len", "qa_page_rows", "qa_mobile_page_rows",
  "qa_image_width", "qa_upload_size", "qa_insert_content", "qa_include_head",
  "qa_include_tail", "qa_content_head", "qa_content_tail", "qa_mobile_content_head",
  "qa_mobile_content_tail", "qa_1_subj", "qa_2_subj", "qa_3_subj", "qa_4_subj",
  "qa_5_subj", "qa_1", "qa_2", "qa_3", "qa_4", "qa_5",
] as const;

export type QaConfigField = (typeof qaConfigFields)[number];
export type QaConfigDraft = Record<QaConfigField, string>;

export const qaFlagFields = new Set<QaConfigField>([
  "qa_use_email", "qa_req_email", "qa_use_hp", "qa_req_hp", "qa_use_sms", "qa_use_editor",
]);

export const qaNumericFields = new Set<QaConfigField>([
  "qa_subject_len", "qa_mobile_subject_len", "qa_page_rows", "qa_mobile_page_rows",
  "qa_image_width", "qa_upload_size",
]);

export const qaTextAreaFields = new Set<QaConfigField>([
  "qa_insert_content", "qa_include_head", "qa_include_tail", "qa_content_head",
  "qa_content_tail", "qa_mobile_content_head", "qa_mobile_content_tail",
  "qa_1", "qa_2", "qa_3", "qa_4", "qa_5",
]);

export const qaBaseFields: readonly QaConfigField[] = [
  "qa_title", "qa_category", "qa_skin", "qa_mobile_skin", "qa_subject_len",
  "qa_mobile_subject_len", "qa_page_rows", "qa_mobile_page_rows", "qa_image_width", "qa_upload_size",
];

export const qaContactFields: readonly QaConfigField[] = [
  "qa_use_email", "qa_req_email", "qa_use_hp", "qa_req_hp", "qa_use_sms",
  "qa_send_number", "qa_admin_hp", "qa_admin_email", "qa_use_editor",
];

export const qaContentFields: readonly QaConfigField[] = [
  "qa_insert_content", "qa_include_head", "qa_include_tail", "qa_content_head",
  "qa_content_tail", "qa_mobile_content_head", "qa_mobile_content_tail",
];

export const qaExtraFields: readonly QaConfigField[] = [
  "qa_1_subj", "qa_1", "qa_2_subj", "qa_2", "qa_3_subj", "qa_3",
  "qa_4_subj", "qa_4", "qa_5_subj", "qa_5",
];

export const qaFieldLabels: Record<QaConfigField, string> = {
  qa_title: "문의 화면 제목",
  qa_category: "카테고리 목록",
  qa_skin: "PC 스킨",
  qa_mobile_skin: "모바일 스킨",
  qa_use_email: "이메일 입력 사용",
  qa_req_email: "이메일 필수",
  qa_use_hp: "휴대폰 입력 사용",
  qa_req_hp: "휴대폰 필수",
  qa_use_sms: "SMS 알림 사용",
  qa_send_number: "SMS 발신 번호",
  qa_admin_hp: "관리자 휴대폰",
  qa_admin_email: "관리자 이메일",
  qa_use_editor: "에디터 사용",
  qa_subject_len: "PC 제목 길이",
  qa_mobile_subject_len: "모바일 제목 길이",
  qa_page_rows: "PC 페이지 행 수",
  qa_mobile_page_rows: "모바일 페이지 행 수",
  qa_image_width: "본문 이미지 너비",
  qa_upload_size: "첨부파일 최대 바이트",
  qa_insert_content: "문의 기본 본문",
  qa_include_head: "상단 include 경로",
  qa_include_tail: "하단 include 경로",
  qa_content_head: "PC 본문 상단",
  qa_content_tail: "PC 본문 하단",
  qa_mobile_content_head: "모바일 본문 상단",
  qa_mobile_content_tail: "모바일 본문 하단",
  qa_1_subj: "추가 필드 1 제목",
  qa_2_subj: "추가 필드 2 제목",
  qa_3_subj: "추가 필드 3 제목",
  qa_4_subj: "추가 필드 4 제목",
  qa_5_subj: "추가 필드 5 제목",
  qa_1: "추가 필드 1 값",
  qa_2: "추가 필드 2 값",
  qa_3: "추가 필드 3 값",
  qa_4: "추가 필드 4 값",
  qa_5: "추가 필드 5 값",
};

export function toQaConfigDraft(config: AdminQaConfig): QaConfigDraft {
  return Object.fromEntries(qaConfigFields.map((field) => [field, config[field]])) as QaConfigDraft;
}

export function buildQaConfigUpdate(
  config: AdminQaConfig,
  draft: QaConfigDraft,
): AdminQaConfigUpdate | null {
  const update: AdminQaConfigUpdate = {};
  for (const field of qaConfigFields) {
    const nextValue = draft[field];
    if (nextValue.length > 65_535) return null;
    if (qaNumericFields.has(field) && nextValue !== "" && !/^\d+$/.test(nextValue)) return null;
    if (nextValue !== config[field]) update[field] = nextValue;
  }
  return Object.keys(update).length ? update : null;
}

export function parseQaIds(value: string): number[] | null {
  const tokens = value.split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) return null;
  const ids = tokens.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) return null;
  if (new Set(ids).size !== ids.length) return null;
  return ids;
}
