import type { QueryClient } from "@tanstack/react-query";

export async function invalidatePointQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "points", "list"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "points", "summary"] }),
  ]);
}

export function togglePointSelection(current: number[], poId: number) {
  return current.includes(poId)
    ? current.filter((id) => id !== poId)
    : [...current, poId];
}
