import type {
  AdminBoard,
  AdminBoardCopy,
  AdminBoardCreate,
  AdminBoardUpdate,
} from "../../api/fleet";

export interface AdminBoardDraft {
  bo_table: string;
  bo_subject: string;
  gr_id: string;
  bo_use_category: boolean;
  bo_category_list: string;
  bo_read_level: string;
  bo_write_level: string;
  bo_comment_level: string;
  bo_download_level: string;
  bo_use_secret: string;
  bo_upload_count: string;
  bo_upload_size: string;
}

export const emptyAdminBoardDraft: AdminBoardDraft = {
  bo_table: "",
  bo_subject: "",
  gr_id: "",
  bo_use_category: false,
  bo_category_list: "",
  bo_read_level: "1",
  bo_write_level: "2",
  bo_comment_level: "2",
  bo_download_level: "2",
  bo_use_secret: "0",
  bo_upload_count: "2",
  bo_upload_size: "1048576",
};

export function boardToDraft(board: AdminBoard): AdminBoardDraft {
  return {
    bo_table: board.bo_table,
    bo_subject: board.bo_subject ?? "",
    gr_id: board.gr_id ?? "",
    bo_use_category: board.bo_use_category ?? false,
    bo_category_list: board.bo_category_list ?? "",
    bo_read_level: String(board.bo_read_level ?? 1),
    bo_write_level: String(board.bo_write_level ?? 2),
    bo_comment_level: String(board.bo_comment_level ?? 2),
    bo_download_level: String(board.bo_download_level ?? 2),
    bo_use_secret: String(board.bo_use_secret ?? 0),
    bo_upload_count: String(board.bo_upload_count ?? 2),
    bo_upload_size: String(board.bo_upload_size ?? 1048576),
  };
}

export function validateAdminBoardDraft(draft: AdminBoardDraft): string[] {
  const errors: string[] = [];
  if (!/^[A-Za-z0-9_]{1,20}$/.test(draft.bo_table.trim())) {
    errors.push("게시판 ID는 영문·숫자·밑줄 1~20자여야 합니다.");
  }
  if (!draft.bo_subject.trim()) errors.push("게시판 제목을 입력하십시오.");
  if (!/^[A-Za-z0-9_]{1,10}$/.test(draft.gr_id.trim())) {
    errors.push("그룹 ID는 영문·숫자·밑줄 1~10자여야 합니다.");
  }
  for (const [label, value] of [
    ["읽기 레벨", draft.bo_read_level],
    ["쓰기 레벨", draft.bo_write_level],
    ["댓글 레벨", draft.bo_comment_level],
    ["다운로드 레벨", draft.bo_download_level],
  ] as const) {
    if (!/^(?:[1-9]|10)$/.test(value.trim())) errors.push(`${label}은 1~10이어야 합니다.`);
  }
  for (const [label, value] of [
    ["업로드 개수", draft.bo_upload_count],
    ["업로드 크기", draft.bo_upload_size],
  ] as const) {
    if (!/^\d+$/.test(value.trim())) errors.push(`${label}는 0 이상의 정수여야 합니다.`);
  }
  if (!/^[0-2]$/.test(draft.bo_use_secret.trim())) errors.push("비밀글 정책이 올바르지 않습니다.");
  if (draft.bo_use_category && !draft.bo_category_list.trim()) {
    errors.push("분류 사용 시 분류 목록을 입력하십시오.");
  }
  return errors;
}

export function buildAdminBoardCreate(draft: AdminBoardDraft): AdminBoardCreate {
  return {
    bo_table: draft.bo_table.trim(),
    bo_subject: draft.bo_subject.trim(),
    gr_id: draft.gr_id.trim(),
    bo_use_category: draft.bo_use_category,
    bo_category_list: draft.bo_category_list.trim(),
    bo_read_level: Number(draft.bo_read_level),
    bo_write_level: Number(draft.bo_write_level),
    bo_comment_level: Number(draft.bo_comment_level),
    bo_download_level: Number(draft.bo_download_level),
    bo_use_secret: Number(draft.bo_use_secret),
    bo_upload_count: Number(draft.bo_upload_count),
    bo_upload_size: Number(draft.bo_upload_size),
  };
}

export function buildAdminBoardUpdate(
  board: AdminBoard,
  draft: AdminBoardDraft,
): AdminBoardUpdate {
  const create = buildAdminBoardCreate(draft);
  const update: AdminBoardUpdate = {};
  for (const field of [
    "bo_subject", "gr_id", "bo_use_category", "bo_category_list", "bo_read_level",
    "bo_write_level", "bo_comment_level", "bo_download_level", "bo_use_secret",
    "bo_upload_count", "bo_upload_size",
  ] as const) {
    const current = board[field];
    const next = create[field];
    if ((current ?? defaultValue(field)) !== next) update[field] = next as never;
  }
  return update;
}

export function buildAdminBoardCopy(
  targetTable: string,
  targetSubject: string,
  copyPosts: boolean,
): AdminBoardCopy | null {
  const table = targetTable.trim();
  const subject = targetSubject.trim();
  if (!/^[A-Za-z0-9_]{1,20}$/.test(table)) return null;
  return {
    target_bo_table: table,
    ...(subject ? { target_bo_subject: subject } : {}),
    copy_posts: copyPosts,
  };
}

export function parseNewPostIds(value: string): number[] | null {
  const tokens = value.split(/[\s,]+/).filter(Boolean);
  if (!tokens.length || tokens.some((token) => !/^\d+$/.test(token) || Number(token) < 1)) {
    return null;
  }
  const ids = tokens.map(Number);
  return new Set(ids).size === ids.length ? ids : null;
}

function defaultValue(field: keyof Omit<AdminBoardCreate, "bo_table">) {
  if (field === "bo_subject" || field === "gr_id" || field === "bo_category_list") return "";
  if (field === "bo_use_category") return false;
  return 0;
}
