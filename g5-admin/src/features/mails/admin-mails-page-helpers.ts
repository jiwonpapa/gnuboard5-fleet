import type { Dispatch, SetStateAction } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { AdminMailComposeFormValues } from "./admin-mails-form";
import type { AdminMailDetailResponse } from "../../types/AdminMailDetailResponse";
import type { AdminMailRecipientListResponse } from "../../types/AdminMailRecipientListResponse";

export const targetTypeOptions: Array<{ label: string; value: string }> = [
  { label: "직접 선택 회원", value: "member" },
  { label: "전체 회원", value: "all" },
  { label: "레벨 범위", value: "level" },
  { label: "회원그룹", value: "group" },
];

export const EMPTY_RECIPIENTS: AdminMailRecipientListResponse["recipients"] = [];

export function renderTargetType(targetType: AdminMailComposeFormValues["target_type"]) {
  switch (targetType) {
    case "all":
      return "전체 회원";
    case "level":
      return "레벨 범위";
    case "group":
      return "회원그룹";
    case "member":
      return "직접 선택 회원";
  }
}

export function formatLastOption(
  lastOption: AdminMailDetailResponse["mail"]["last_option"]
) {
  return [
    `level=${lastOption.mb_level_from}-${lastOption.mb_level_to}`,
    `gr_id=${lastOption.gr_id || "-"}`,
    `range=${lastOption.mb_id1_from || "-"} ~ ${lastOption.mb_id1_to || "-"}`,
    `email=${lastOption.mb_email || "-"}`,
    `mailling=${lastOption.mb_mailling === 1 ? "1" : "0"}`,
  ].join(" | ");
}

export function summarizePreviewHtml(previewHtml: string | null | undefined) {
  if (!previewHtml) {
    return "-";
  }

  const summary = previewHtml.replace(/\s+/g, " ").trim();
  return summary.length > 240 ? `${summary.slice(0, 240)}...` : summary;
}

export function toggleRecipientSelection(
  mbId: string,
  setSelectedRecipientIds: Dispatch<SetStateAction<string[]>>
) {
  setSelectedRecipientIds((current) =>
    current.includes(mbId)
      ? current.filter((memberId) => memberId !== mbId)
      : [...current, mbId]
  );
}

export async function invalidateMailQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "mails", "templates"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "mails", "template"] }),
  ]);
}
