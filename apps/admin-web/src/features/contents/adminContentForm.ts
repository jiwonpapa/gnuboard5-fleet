import type {
  AdminContent,
  AdminContentCreate,
  AdminContentUpdate,
} from "../../api/fleet";

export interface AdminContentDraft {
  co_id: string;
  co_subject: string;
  co_html: "0" | "1" | "2";
  co_content: string;
  co_mobile_content: string;
  co_include_head: string;
  co_include_tail: string;
  co_tag_filter_use: boolean;
  co_skin: string;
  co_mobile_skin: string;
}

export const emptyAdminContentDraft: AdminContentDraft = {
  co_id: "",
  co_subject: "",
  co_html: "0",
  co_content: "",
  co_mobile_content: "",
  co_include_head: "",
  co_include_tail: "",
  co_tag_filter_use: true,
  co_skin: "",
  co_mobile_skin: "",
};

export function contentToDraft(content: AdminContent): AdminContentDraft {
  return {
    co_id: content.co_id,
    co_subject: content.co_subject,
    co_html: String(content.co_html) as AdminContentDraft["co_html"],
    co_content: content.co_content,
    co_mobile_content: content.co_mobile_content,
    co_include_head: content.co_include_head,
    co_include_tail: content.co_include_tail,
    co_tag_filter_use: content.co_tag_filter_use === 1,
    co_skin: content.co_skin,
    co_mobile_skin: content.co_mobile_skin,
  };
}

export function validateAdminContentDraft(draft: AdminContentDraft): string[] {
  const errors: string[] = [];
  if (!/^[A-Za-z0-9_]{1,20}$/.test(draft.co_id.trim())) {
    errors.push("내용 ID는 영문·숫자·밑줄 1~20자여야 합니다.");
  }
  if (!draft.co_subject.trim()) errors.push("제목을 입력하십시오.");
  if (!draft.co_content.trim()) errors.push("공통 본문을 입력하십시오.");
  if (!/^[0-2]$/.test(draft.co_html)) errors.push("HTML 모드가 올바르지 않습니다.");
  return errors;
}

export function buildAdminContentCreate(draft: AdminContentDraft): AdminContentCreate {
  return {
    co_id: draft.co_id.trim(),
    co_subject: draft.co_subject.trim(),
    co_html: Number(draft.co_html) as 0 | 1 | 2,
    co_content: draft.co_content.trim(),
    co_mobile_content: draft.co_mobile_content,
    co_include_head: draft.co_include_head.trim(),
    co_include_tail: draft.co_include_tail.trim(),
    co_tag_filter_use: draft.co_tag_filter_use ? 1 : 0,
    co_skin: draft.co_skin.trim(),
    co_mobile_skin: draft.co_mobile_skin.trim(),
  };
}

export function buildAdminContentUpdate(
  content: AdminContent,
  draft: AdminContentDraft,
): AdminContentUpdate {
  const next = buildAdminContentCreate(draft);
  const update: AdminContentUpdate = {};
  for (const field of [
    "co_subject", "co_html", "co_content", "co_mobile_content", "co_include_head",
    "co_include_tail", "co_tag_filter_use", "co_skin", "co_mobile_skin",
  ] as const) {
    if (content[field] !== next[field]) update[field] = next[field] as never;
  }
  return update;
}
