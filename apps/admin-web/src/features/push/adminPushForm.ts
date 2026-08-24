import type { AdminPushMessageRequest } from "../../api/fleet";

export type PushTargetMode = "all" | "members";

export interface AdminPushDraft {
  title: string;
  body: string;
  type: string;
  targetMode: PushTargetMode;
  memberIds: string;
}

export const emptyAdminPushDraft: AdminPushDraft = {
  title: "",
  body: "",
  type: "manual",
  targetMode: "members",
  memberIds: "",
};

export function parsePushMemberIds(value: string): string[] {
  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}

export function validateAdminPushDraft(draft: AdminPushDraft): string {
  if (!draft.title.trim()) return "제목을 입력해 주세요.";
  if (draft.title.trim().length > 255) return "제목은 255자 이하여야 합니다.";
  if (!draft.body.trim()) return "본문을 입력해 주세요.";
  if (draft.body.length > 65_535) return "본문이 허용 길이를 초과했습니다.";
  if (draft.type.trim().length > 64) return "타입은 64자 이하여야 합니다.";
  const memberIds = parsePushMemberIds(draft.memberIds);
  if (draft.targetMode === "members" && memberIds.length === 0) {
    return "대상 회원 ID를 한 개 이상 입력해 주세요.";
  }
  if (memberIds.some((memberId) => memberId.length > 20)) {
    return "회원 ID는 각각 20자 이하여야 합니다.";
  }
  return "";
}

export function buildAdminPushRequest(draft: AdminPushDraft): AdminPushMessageRequest {
  const common = {
    title: draft.title.trim(),
    body: draft.body.trim(),
    ...(draft.type.trim() ? { type: draft.type.trim() } : {}),
  };
  return draft.targetMode === "all"
    ? { ...common, target: "all" }
    : { ...common, member_ids: parsePushMemberIds(draft.memberIds) };
}
