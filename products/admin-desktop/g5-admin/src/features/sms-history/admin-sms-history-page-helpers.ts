import type { QueryClient } from "@tanstack/react-query";

export function buildSmsHistoryCopy(isDeliveryRoute: boolean) {
  return {
    title: isDeliveryRoute ? "전송내역-번호별" : "전송내역-건별",
    description: isDeliveryRoute
      ? "`/admin/sms/history/deliveries` 기준 번호별 전송 로그를 조회합니다. 이름/번호/주소록 번호 검색이 가능합니다."
      : "`/admin/sms/history/batches`와 배치 상세, 실패/전체 재전송을 한 화면에서 다룹니다.",
  };
}

export function formatSmsHistorySelectedBatch(
  selectedBatch: { wr_no: number; wr_renum: number } | null,
) {
  return selectedBatch === null ? "-" : `${selectedBatch.wr_no}/${selectedBatch.wr_renum}`;
}

export async function invalidateSmsHistoryQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "sms", "history", "batches"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "sms", "history", "batch-detail"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "sms", "history", "deliveries"] }),
  ]);
}
