import type { AdminAuthAssignment } from "../../api/fleet";

export interface PermissionDraft {
  mb_id: string;
  au_menu: string;
  au_auth: string;
}

export function normalizePermissionAuth(
  value: string,
  commaSeparated = false,
) {
  const source = value.toLowerCase().replace(/[\s,]/g, "");
  if (!source || /[^rwd]/.test(source)) return null;
  const normalized = ["r", "w", "d"].filter((flag) => source.includes(flag));
  return normalized.join(commaSeparated ? "," : "");
}

export function validatePermissionDraft(
  draft: PermissionDraft,
  numericMenu = false,
) {
  const errors: Partial<Record<keyof PermissionDraft, string>> = {};
  if (!/^[A-Za-z0-9_]{3,20}$/.test(draft.mb_id)) {
    errors.mb_id = "회원 ID는 영문·숫자·밑줄 3~20자여야 합니다.";
  }
  const menuPattern = numericMenu
    ? /^[0-9]{3,6}$/
    : /^[A-Za-z0-9_]{1,50}$/;
  if (!menuPattern.test(draft.au_menu)) {
    errors.au_menu = numericMenu
      ? "메뉴 코드는 숫자 3~6자리여야 합니다."
      : "메뉴 코드는 영문·숫자·밑줄 1~50자여야 합니다.";
  }
  if (!normalizePermissionAuth(draft.au_auth, numericMenu)) {
    errors.au_auth = "권한은 읽기(r), 쓰기(w), 삭제(d) 중 하나 이상이어야 합니다.";
  }
  return errors;
}

export function upsertAuthAssignment(
  current: AdminAuthAssignment[],
  next: AdminAuthAssignment,
) {
  const normalized = normalizePermissionAuth(next.au_auth, true);
  if (!/^[0-9]{3,6}$/.test(next.au_menu) || !normalized) return null;
  return [
    ...current.filter((entry) => entry.au_menu !== next.au_menu),
    { au_menu: next.au_menu, au_auth: normalized },
  ].sort((left, right) => left.au_menu.localeCompare(right.au_menu));
}
