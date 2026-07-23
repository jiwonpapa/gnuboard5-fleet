import type { QueryClient } from "@tanstack/react-query";
import { createSearchParams, type NavigateFunction } from "react-router-dom";
import { z } from "zod";
import type { AdminMemberDetailResponse } from "../../types/AdminMemberDetailResponse";
import { MEMBER_MANAGE_ROUTE } from "../layout/navigation";

export const adminMembersPerPage = 20;

export const adminMemberFormSchema = z.object({
  mb_1: z.string().trim(),
  mb_2: z.string().trim(),
  mb_3: z.string().trim(),
  mb_4: z.string().trim(),
  mb_5: z.string().trim(),
  mb_6: z.string().trim(),
  mb_7: z.string().trim(),
  mb_8: z.string().trim(),
  mb_9: z.string().trim(),
  mb_10: z.string().trim(),
  mb_name: z.string().trim(),
  mb_nick: z.string().trim(),
  mb_email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "올바른 이메일 형식이 아닙니다.",
    ),
  mb_homepage: z.string().trim(),
  mb_hp: z.string().trim(),
  mb_tel: z.string().trim(),
  mb_zip: z.string().trim(),
  mb_addr1: z.string().trim(),
  mb_addr2: z.string().trim(),
  mb_addr3: z.string().trim(),
  mb_addr_jibeon: z.string().trim(),
  mb_memo: z.string().trim(),
  mb_profile: z.string().trim(),
  mb_signature: z.string().trim(),
  mb_password: z.string().trim(),
  mb_certify: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || ["admin", "simple", "hp", "ipin"].includes(value),
      "본인확인 방식 값이 올바르지 않습니다.",
    ),
  mb_leave_date: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{8}$/.test(value),
      "탈퇴일은 YYYYMMDD 형식이어야 합니다.",
    ),
  mb_intercept_date: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{8}$/.test(value),
      "차단일은 YYYYMMDD 형식이어야 합니다.",
    ),
  mb_mailling: z.boolean(),
  mb_sms: z.boolean(),
  mb_marketing_agree: z.boolean(),
  mb_thirdparty_agree: z.boolean(),
  mb_adult: z.boolean(),
  mb_open: z.boolean(),
});

export function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value ?? "");
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function normalizeSearch(value: string | null) {
  const normalized = (value ?? "").trim();
  return normalized.length === 0 ? null : normalized;
}

export function navigateToMembers(
  navigate: NavigateFunction,
  params: {
    mbId?: string | null;
    page: number;
    search: string | null;
  },
) {
  const query = createSearchParams();
  query.set("page", String(params.page));
  if (params.search) {
    query.set("search", params.search);
  }

  navigate({
    pathname: params.mbId ? `${MEMBER_MANAGE_ROUTE}/${params.mbId}` : MEMBER_MANAGE_ROUTE,
    search: query.toString(),
  });
}

export function syncMemberDetail(
  queryClient: QueryClient,
  response: AdminMemberDetailResponse,
) {
  queryClient.setQueryData(
    ["admin", "members", "route", "detail", response.member.mb_id],
    response,
  );
}
