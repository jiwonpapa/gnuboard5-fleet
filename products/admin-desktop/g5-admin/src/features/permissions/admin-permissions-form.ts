import { z } from "zod";
import type { AdminPermissionItem } from "../../types/AdminPermissionItem";
import type { AdminPermissionSaveInput } from "../../types/AdminPermissionSaveInput";

export const permissionFormSchema = z.object({
  au_auth: z
    .string()
    .trim()
    .min(1, "권한 조합을 입력해 주세요.")
    .refine(
      (value) => normalizePermissionAuth(value) !== null,
      "권한은 r, w, d 조합만 허용합니다.",
    ),
  au_menu: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{1,50}$/, "메뉴 코드는 영문, 숫자, 밑줄만 허용합니다."),
  mb_id: z
    .string()
    .trim()
    .min(3, "회원 ID는 3자 이상이어야 합니다.")
    .regex(/^[A-Za-z0-9_]+$/, "회원 ID는 영문, 숫자, 밑줄만 허용합니다."),
});

export type PermissionFormValues = z.infer<typeof permissionFormSchema>;

export function emptyPermissionFormValues(): PermissionFormValues {
  return {
    au_auth: "",
    au_menu: "",
    mb_id: "",
  };
}

export function toPermissionFormValues(
  permission: AdminPermissionItem | null,
): PermissionFormValues {
  if (permission === null) {
    return emptyPermissionFormValues();
  }

  return {
    au_auth: permission.au_auth,
    au_menu: permission.au_menu,
    mb_id: permission.mb_id,
  };
}

export function buildPermissionSaveInput(
  values: PermissionFormValues,
): AdminPermissionSaveInput | null {
  const mbId = values.mb_id.trim();
  const auMenu = values.au_menu.trim();
  const auAuth = normalizePermissionAuth(values.au_auth);

  if (
    mbId.length < 3 ||
    !/^[A-Za-z0-9_]+$/.test(mbId) ||
    !/^[A-Za-z0-9_]{1,50}$/.test(auMenu) ||
    auAuth === null
  ) {
    return null;
  }

  return {
    mb_id: mbId,
    au_auth: auAuth,
    au_menu: auMenu,
  };
}

export function composePermissionKey(mbId: string, auMenu: string) {
  return `${mbId}::${auMenu}`;
}

function normalizePermissionAuth(value: string): string | null {
  const compact = value.trim().toLowerCase().replace(/[,\s]/g, "");
  if (compact.length === 0) {
    return null;
  }

  if (![...compact].every((token) => token === "r" || token === "w" || token === "d")) {
    return null;
  }

  return ["r", "w", "d"].filter((token) => compact.includes(token)).join("");
}
