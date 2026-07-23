import type { QueryClient } from "@tanstack/react-query";

export type DeleteMemberTarget = {
  gr_id: string;
  mb_id: string;
} | null;

export async function invalidateBoardGroupQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "board-groups", "list"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "board-groups", "detail"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "board-groups", "members"] }),
  ]);
}

export async function invalidateBoardGroupMembers(
  queryClient: QueryClient,
  selectedGroupId: string | null,
) {
  await queryClient.invalidateQueries({
    queryKey: ["admin", "board-groups", "members", selectedGroupId],
  });
}
