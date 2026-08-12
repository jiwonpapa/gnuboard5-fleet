import type {
  AdminBoardGroup,
  AdminBoardGroupCreate,
  AdminBoardGroupUpdate,
} from "../../api/fleet";

export interface AdminBoardGroupDraft {
  gr_id: string;
  gr_subject: string;
  gr_admin: string;
  gr_device: "both" | "pc" | "mobile";
  gr_use_access: boolean;
}

export const emptyAdminBoardGroupDraft: AdminBoardGroupDraft = {
  gr_id: "",
  gr_subject: "",
  gr_admin: "",
  gr_device: "both",
  gr_use_access: false,
};

export function groupToDraft(group: AdminBoardGroup): AdminBoardGroupDraft {
  return {
    gr_id: group.gr_id,
    gr_subject: group.gr_subject,
    gr_admin: group.gr_admin,
    gr_device: group.gr_device,
    gr_use_access: group.gr_use_access === 1,
  };
}

export function validateAdminBoardGroupDraft(draft: AdminBoardGroupDraft): string[] {
  const errors: string[] = [];
  if (!/^[A-Za-z0-9_]{1,10}$/.test(draft.gr_id.trim())) {
    errors.push("그룹 ID는 영문·숫자·밑줄 10자 이하여야 합니다.");
  }
  if (!draft.gr_subject.trim()) errors.push("그룹 제목을 입력하십시오.");
  return errors;
}

export function buildAdminBoardGroupCreate(
  draft: AdminBoardGroupDraft,
): AdminBoardGroupCreate {
  return {
    gr_id: draft.gr_id.trim(),
    gr_subject: draft.gr_subject.trim(),
    gr_admin: draft.gr_admin.trim(),
    gr_device: draft.gr_device,
    gr_use_access: draft.gr_use_access ? 1 : 0,
  };
}

export function buildAdminBoardGroupUpdate(
  draft: AdminBoardGroupDraft,
): AdminBoardGroupUpdate {
  return {
    gr_subject: draft.gr_subject.trim(),
    gr_admin: draft.gr_admin.trim(),
    gr_device: draft.gr_device,
    gr_use_access: draft.gr_use_access ? 1 : 0,
  };
}
