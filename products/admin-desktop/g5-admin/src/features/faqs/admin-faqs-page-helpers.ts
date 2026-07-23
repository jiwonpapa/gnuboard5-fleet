import type { QueryClient } from "@tanstack/react-query";

export async function invalidateFaqQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "faq-masters"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "faqs"] }),
  ]);
}
