import { z } from "zod";
import type { AdminMenu } from "../../types/AdminMenu";
import type { AdminMenuCreateInput } from "../../types/AdminMenuCreateInput";
import type { AdminMenuReorderInput } from "../../types/AdminMenuReorderInput";
import type { AdminMenuUpdateInput } from "../../types/AdminMenuUpdateInput";

const menuOrderSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "0 이상의 정수만 입력해 주세요.");

export const menuFormSchema = z.object({
  me_code: z.string().trim().min(1, "메뉴 코드를 입력해 주세요."),
  me_link: z.string().trim().min(1, "메뉴 링크를 입력해 주세요."),
  me_mobile_use: z.boolean(),
  me_name: z.string().trim().min(1, "메뉴 이름을 입력해 주세요."),
  me_order: menuOrderSchema,
  me_target: z.string().trim().min(1, "링크 target을 입력해 주세요."),
  me_use: z.boolean(),
});

export type MenuFormValues = z.infer<typeof menuFormSchema>;

export function emptyMenuFormValues(nextOrder = 0): MenuFormValues {
  return {
    me_code: "",
    me_link: "",
    me_mobile_use: true,
    me_name: "",
    me_order: String(nextOrder),
    me_target: "_self",
    me_use: true,
  };
}

export function toMenuFormValues(
  menu: AdminMenu | null | undefined,
): MenuFormValues {
  if (!menu) {
    return emptyMenuFormValues();
  }

  return {
    me_code: menu.me_code ?? "",
    me_link: menu.me_link ?? "",
    me_mobile_use: (menu.me_mobile_use ?? 0) === 1,
    me_name: menu.me_name ?? "",
    me_order: String(menu.me_order ?? 0),
    me_target: menu.me_target ?? "_self",
    me_use: (menu.me_use ?? 0) === 1,
  };
}

export function buildMenuCreateInput(
  values: MenuFormValues,
): AdminMenuCreateInput | null {
  const meCode = values.me_code.trim();
  const meName = values.me_name.trim();
  const meLink = values.me_link.trim();
  const meTarget = values.me_target.trim();
  const meOrder = parseMenuOrder(values.me_order);

  if (
    meCode.length === 0 ||
    meName.length === 0 ||
    meLink.length === 0 ||
    meTarget.length === 0 ||
    meOrder === null
  ) {
    return null;
  }

  return {
    me_code: meCode,
    me_link: meLink,
    me_mobile_use: values.me_mobile_use ? 1 : 0,
    me_name: meName,
    me_order: meOrder,
    me_target: meTarget,
    me_use: values.me_use ? 1 : 0,
  };
}

export function buildMenuUpdateInput(
  menu: AdminMenu,
  values: MenuFormValues,
): AdminMenuUpdateInput | null {
  const meOrder = parseMenuOrder(values.me_order);
  if (meOrder === null) {
    return null;
  }

  const input: AdminMenuUpdateInput = {
    me_code: null,
    me_id: menu.me_id,
    me_link: null,
    me_mobile_use: null,
    me_name: null,
    me_order: null,
    me_target: null,
    me_use: null,
  };

  let changed = false;

  if ((menu.me_code ?? "").trim() !== values.me_code.trim()) {
    input.me_code = values.me_code.trim();
    changed = true;
  }

  if ((menu.me_name ?? "").trim() !== values.me_name.trim()) {
    input.me_name = values.me_name.trim();
    changed = true;
  }

  if ((menu.me_link ?? "").trim() !== values.me_link.trim()) {
    input.me_link = values.me_link.trim();
    changed = true;
  }

  if ((menu.me_target ?? "_self").trim() !== values.me_target.trim()) {
    input.me_target = values.me_target.trim();
    changed = true;
  }

  if ((menu.me_order ?? 0) !== meOrder) {
    input.me_order = meOrder;
    changed = true;
  }

  const meUse = values.me_use ? 1 : 0;
  if ((menu.me_use ?? 0) !== meUse) {
    input.me_use = meUse;
    changed = true;
  }

  const meMobileUse = values.me_mobile_use ? 1 : 0;
  if ((menu.me_mobile_use ?? 0) !== meMobileUse) {
    input.me_mobile_use = meMobileUse;
    changed = true;
  }

  return changed ? input : null;
}

export function buildMenuReorderInput(
  menus: AdminMenu[],
  orderDrafts: Record<number, string>,
): AdminMenuReorderInput | null {
  const orders = menus
    .map((menu) => {
      const meOrder = parseMenuOrder(orderDrafts[menu.me_id] ?? String(menu.me_order));
      if (meOrder === null) {
        return null;
      }

      return {
        me_id: menu.me_id,
        me_order: meOrder,
      };
    })
    .filter((item): item is { me_id: number; me_order: number } => item !== null);

  if (orders.length !== menus.length) {
    return null;
  }

  const changed = orders.some((item) => {
    const baseline = menus.find((menu) => menu.me_id === item.me_id);
    return baseline ? baseline.me_order !== item.me_order : false;
  });

  return changed ? { orders } : null;
}

export function countChangedMenuOrders(
  menus: AdminMenu[],
  orderDrafts: Record<number, string>,
) {
  return menus.reduce((count, menu) => {
    const meOrder = parseMenuOrder(orderDrafts[menu.me_id] ?? String(menu.me_order));
    if (meOrder === null) {
      return count;
    }

    return menu.me_order !== meOrder ? count + 1 : count;
  }, 0);
}

function parseMenuOrder(value: string) {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
}
