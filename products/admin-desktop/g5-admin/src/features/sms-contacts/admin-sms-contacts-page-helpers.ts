import type { QueryClient } from "@tanstack/react-query";
import type { AdminSmsContactFormValues } from "./admin-sms-contacts-form";
import { emptyAdminSmsContactFormValues } from "./admin-sms-contacts-form";

export function buildSmsContactsPageCopy(
  isFileRoute: boolean,
  isGroupRoute: boolean,
) {
  const title = isFileRoute
    ? "휴대폰번호 파일"
    : isGroupRoute
      ? "휴대폰번호 그룹"
      : "휴대폰번호 관리";

  const description = isFileRoute
    ? "`/admin/sms/contacts/import`와 `/admin/sms/contacts/export`를 중심으로 연락처 파일 작업을 처리합니다. 텍스트 입력과 파일 업로드를 둘 다 지원하고, 내보내기 미리보기도 같은 화면에서 확인합니다."
    : "`/admin/sms/contact-groups`, `/admin/sms/contacts`, `/admin/sms/contacts/import`, `/admin/sms/contacts/export`를 한 작업면으로 연결했습니다. 그룹 구조, 주소록 CRUD, 일괄 허용/거부, 파일 가져오기/내보내기를 함께 점검할 수 있습니다.";

  return { description, title };
}

export async function invalidateSmsContactQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "sms", "contact-groups"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "sms", "contacts"] }),
  ]);
}

export function buildContactResetValues(
  activeGroupId: number | null,
): AdminSmsContactFormValues {
  return {
    ...emptyAdminSmsContactFormValues,
    bg_no: activeGroupId === null ? "1" : String(activeGroupId),
  };
}

export function toggleSmsContactSelection(
  current: number[],
  contactId: number,
  checked: boolean,
) {
  return checked
    ? Array.from(new Set([...current, contactId])).sort((left, right) => left - right)
    : current.filter((value) => value !== contactId);
}
