import type {
  AdminReportListQuery,
  AdminReportStatus,
  AdminReportTargetType,
  AdminReportUpdate,
} from "../../api/fleet";

export interface AdminReportFilterDraft {
  status: "" | AdminReportStatus;
  targetType: "" | AdminReportTargetType;
}

export interface AdminReportUpdateDraft {
  status: AdminReportStatus;
  adminMemo: string;
}

export const emptyReportFilter: AdminReportFilterDraft = { status: "", targetType: "" };

export function buildReportListQuery(
  draft: AdminReportFilterDraft,
  page: number,
  perPage = 20,
): AdminReportListQuery | null {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) return null;
  if (!Number.isSafeInteger(perPage) || perPage < 1 || perPage > 100) return null;
  return {
    page,
    per_page: perPage,
    ...(draft.status ? { status: draft.status } : {}),
    ...(draft.targetType ? { target_type: draft.targetType } : {}),
  };
}

export function buildReportUpdate(draft: AdminReportUpdateDraft): AdminReportUpdate | null {
  if (!["pending", "approved", "rejected", "hold"].includes(draft.status)) return null;
  const memo = draft.adminMemo.trim();
  if (memo.length > 65_535) return null;
  return { status: draft.status, ...(memo ? { admin_memo: memo } : {}) };
}

export function reportStatusLabel(status: string | null): string {
  return ({ pending: "대기", approved: "승인", rejected: "반려", hold: "보류" } as Record<string, string>)[status ?? ""] ?? "미정";
}

export function reportTargetLabel(target: string | null): string {
  return ({ post: "게시글", comment: "댓글", member: "회원" } as Record<string, string>)[target ?? ""] ?? "기타";
}
