import type {
  AdminSmsDeliveryListQuery,
  AdminSmsMessageBatchDetailQuery,
  AdminSmsMessageBatchListQuery,
  AdminSmsResendRequest,
} from "../../api/fleet";

export function buildSmsBatchListQuery(page: number, search: string): AdminSmsMessageBatchListQuery {
  return { page: positivePage(page), per_page: 20, ...(search.trim() ? { search: search.trim() } : {}) };
}

export function buildSmsBatchDetailQuery(
  wrRenum: number,
  page: number,
  searchField: "name" | "hp",
  search: string,
): AdminSmsMessageBatchDetailQuery {
  return {
    wr_renum: Math.max(0, Math.trunc(wrRenum)),
    page: positivePage(page),
    per_page: 20,
    search_field: searchField,
    ...(search.trim() ? { search: search.trim() } : {}),
  };
}

export function buildSmsDeliveryListQuery(
  page: number,
  searchField: "name" | "hp" | "bk_no",
  search: string,
): AdminSmsDeliveryListQuery {
  return {
    page: positivePage(page),
    per_page: 20,
    search_field: searchField,
    ...(search.trim() ? { search: search.trim() } : {}),
  };
}

export function buildSmsResendRequest(wrRenum: number, bookingAt: string): AdminSmsResendRequest {
  return {
    wr_renum: Math.max(0, Math.trunc(wrRenum)),
    ...(bookingAt.trim() ? { booking_at: bookingAt.trim() } : {}),
  };
}

function positivePage(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 1;
}
