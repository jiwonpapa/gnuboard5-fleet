import type { AdminSmsBatchResendInput } from "../../types/AdminSmsBatchResendInput";
import type { AdminSmsDeliveryListQuery } from "../../types/AdminSmsDeliveryListQuery";
import type { AdminSmsMessageBatchDetailQuery } from "../../types/AdminSmsMessageBatchDetailQuery";
import type { AdminSmsMessageBatchListQuery } from "../../types/AdminSmsMessageBatchListQuery";

export const adminSmsDeliverySearchFieldOptions = [
  { label: "이름", value: "name" },
  { label: "번호", value: "hp" },
  { label: "주소록 번호", value: "bk_no" },
] as const;

export const adminSmsBatchDetailSearchFieldOptions = [
  { label: "이름", value: "name" },
  { label: "번호", value: "hp" },
] as const;

export function buildAdminSmsMessageBatchListQuery(
  page: number,
  perPage: number,
  search: string,
): AdminSmsMessageBatchListQuery {
  return {
    page,
    per_page: perPage,
    search: normalizeString(search),
  };
}

export function buildAdminSmsMessageBatchDetailQuery(
  wrNo: number,
  wrRenum: number,
  page: number,
  perPage: number,
  searchField: string,
  search: string,
): AdminSmsMessageBatchDetailQuery {
  return {
    wr_no: wrNo,
    wr_renum: wrRenum,
    page,
    per_page: perPage,
    search_field: normalizeString(searchField),
    search: normalizeString(search),
  };
}

export function buildAdminSmsDeliveryListQuery(
  page: number,
  perPage: number,
  searchField: string,
  search: string,
): AdminSmsDeliveryListQuery {
  return {
    page,
    per_page: perPage,
    search_field: normalizeString(searchField),
    search: normalizeString(search),
  };
}

export function buildAdminSmsBatchResendInput(
  wrNo: number,
  wrRenum: number,
  bookingAt: string,
): AdminSmsBatchResendInput {
  return {
    wr_no: wrNo,
    wr_renum: wrRenum,
    booking_at: normalizeString(bookingAt),
  };
}

function normalizeString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
