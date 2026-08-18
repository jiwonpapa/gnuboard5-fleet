import type {
  AdminMenu,
  AdminMenuCreate,
  AdminMenuReorder,
  AdminMenuUpdate,
} from "../../api/fleet";

export interface AdminMenuDraft {
  me_code: string;
  me_name: string;
  me_link: string;
  me_target: string;
  me_order: string;
  me_use: boolean;
  me_mobile_use: boolean;
}

export function emptyAdminMenuDraft(nextOrder = 0): AdminMenuDraft {
  return {
    me_code: "",
    me_name: "",
    me_link: "",
    me_target: "_self",
    me_order: String(nextOrder),
    me_use: true,
    me_mobile_use: true,
  };
}

export function menuToDraft(menu: AdminMenu): AdminMenuDraft {
  return {
    me_code: menu.me_code,
    me_name: menu.me_name,
    me_link: menu.me_link,
    me_target: menu.me_target || "_self",
    me_order: String(menu.me_order),
    me_use: menu.me_use === 1,
    me_mobile_use: menu.me_mobile_use === 1,
  };
}

export function validateAdminMenuDraft(draft: AdminMenuDraft): string[] {
  const errors: string[] = [];
  if (!draft.me_code.trim()) errors.push("메뉴 코드를 입력하십시오.");
  if (!draft.me_name.trim()) errors.push("메뉴 이름을 입력하십시오.");
  if (!draft.me_link.trim()) errors.push("메뉴 링크를 입력하십시오.");
  if (!draft.me_target.trim()) errors.push("링크 target을 입력하십시오.");
  if (parseMenuOrder(draft.me_order) === null) errors.push("정렬 순서는 0 이상의 정수여야 합니다.");
  return errors;
}

export function buildAdminMenuCreate(draft: AdminMenuDraft): AdminMenuCreate {
  return {
    me_code: draft.me_code.trim(),
    me_name: draft.me_name.trim(),
    me_link: draft.me_link.trim(),
    me_target: draft.me_target.trim(),
    me_order: parseMenuOrder(draft.me_order) ?? 0,
    me_use: draft.me_use ? 1 : 0,
    me_mobile_use: draft.me_mobile_use ? 1 : 0,
  };
}

export function buildAdminMenuUpdate(menu: AdminMenu, draft: AdminMenuDraft): AdminMenuUpdate {
  const create = buildAdminMenuCreate(draft);
  const update: AdminMenuUpdate = {};
  for (const field of [
    "me_code",
    "me_name",
    "me_link",
    "me_target",
    "me_order",
    "me_use",
    "me_mobile_use",
  ] as const) {
    if (menu[field] !== create[field]) update[field] = create[field] as never;
  }
  return update;
}

export function buildAdminMenuReorder(
  menus: AdminMenu[],
  orderDrafts: Record<number, string>,
): AdminMenuReorder | null {
  const orders = menus.map((menu) => {
    const me_order = parseMenuOrder(orderDrafts[menu.me_id] ?? String(menu.me_order));
    return me_order === null ? null : { me_id: menu.me_id, me_order };
  });
  if (orders.some((order) => order === null)) return null;
  const typedOrders = orders as AdminMenuReorder["orders"];
  return typedOrders.some((order) => {
    const baseline = menus.find((menu) => menu.me_id === order.me_id);
    return baseline?.me_order !== order.me_order;
  }) ? { orders: typedOrders } : null;
}

export function countChangedMenuOrders(
  menus: AdminMenu[],
  orderDrafts: Record<number, string>,
): number {
  return menus.reduce((count, menu) => {
    const order = parseMenuOrder(orderDrafts[menu.me_id] ?? String(menu.me_order));
    return order !== null && order !== menu.me_order ? count + 1 : count;
  }, 0);
}

function parseMenuOrder(value: string): number | null {
  const normalized = value.trim();
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
}
