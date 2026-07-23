import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAdminMenu,
  deleteAdminMenu,
  getAdminMenu,
  getAdminMenuList,
  reorderAdminMenus,
  updateAdminMenu,
  type CommandError,
} from "../../api/client";
import type { AdminMenu } from "../../types/AdminMenu";
import type { AdminMenuDetailResponse } from "../../types/AdminMenuDetailResponse";
import type { AdminMenuListResponse } from "../../types/AdminMenuListResponse";
import type { AdminMenuReorderResponse } from "../../types/AdminMenuReorderResponse";
import {
  buildMenuCreateInput,
  buildMenuReorderInput,
  buildMenuUpdateInput,
  countChangedMenuOrders,
  emptyMenuFormValues,
  menuFormSchema,
  toMenuFormValues,
  type MenuFormValues,
} from "./admin-menus-form";

const menusListKey = ["admin", "menus", "list"] as const;

export function useAdminMenusPage() {
  const queryClient = useQueryClient();
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMenu | null>(null);
  const [orderDrafts, setOrderDrafts] = useState<Record<number, string>>({});

  const createForm = useForm<MenuFormValues>({
    defaultValues: emptyMenuFormValues(),
    resolver: zodResolver(menuFormSchema),
  });
  const editForm = useForm<MenuFormValues>({
    defaultValues: emptyMenuFormValues(),
    resolver: zodResolver(menuFormSchema),
  });

  const createValues = {
    ...emptyMenuFormValues(),
    ...(useWatch({ control: createForm.control }) ?? {}),
  };
  const editValues = {
    ...emptyMenuFormValues(),
    ...(useWatch({ control: editForm.control }) ?? {}),
  };

  const menusQuery = useQuery<AdminMenuListResponse, CommandError>({
    queryFn: getAdminMenuList,
    queryKey: menusListKey,
    retry: false,
  });
  const menus = useMemo(() => menusQuery.data?.menus ?? [], [menusQuery.data]);

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      menus.map((menu) => [menu.me_id, String(menu.me_order)]),
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Async menu list hydration must refresh local reorder drafts from the latest server ordering.
    setOrderDrafts(nextDrafts);

    if (menus.length === 0) {
      setSelectedMenuId(null);
      return;
    }

    const hasSelected =
      selectedMenuId !== null && menus.some((menu) => menu.me_id === selectedMenuId);

    if (!hasSelected) {
      setSelectedMenuId(menus[0].me_id);
    }
  }, [menus, selectedMenuId]);

  const menuDetailQuery = useQuery<AdminMenuDetailResponse, CommandError>({
    enabled: selectedMenuId !== null,
    queryFn: () => getAdminMenu(selectedMenuId ?? 0),
    queryKey: ["admin", "menus", "detail", selectedMenuId ?? 0],
    retry: false,
  });

  useEffect(() => {
    editForm.reset(toMenuFormValues(menuDetailQuery.data?.menu));
  }, [editForm, menuDetailQuery.data]);

  const createMutation = useMutation<
    AdminMenuDetailResponse,
    CommandError,
    MenuFormValues
  >({
    mutationFn: async (values) => createAdminMenu(buildMenuCreateInput(values)!),
    onSuccess: async (response) => {
      const nextOrder = (menusQuery.data?.menus.length ?? 0) + 1;
      createForm.reset(emptyMenuFormValues(nextOrder));
      setSelectedMenuId(response.menu.me_id);
      queryClient.setQueryData(
        ["admin", "menus", "detail", response.menu.me_id],
        response,
      );
      await queryClient.invalidateQueries({ queryKey: menusListKey });
      toast.success("메뉴를 생성했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation<
    AdminMenuDetailResponse,
    CommandError,
    MenuFormValues
  >({
    mutationFn: async (values) =>
      updateAdminMenu(buildMenuUpdateInput(menuDetailQuery.data!.menu, values)!),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        ["admin", "menus", "detail", response.menu.me_id],
        response,
      );
      editForm.reset(toMenuFormValues(response.menu));
      await queryClient.invalidateQueries({ queryKey: menusListKey });
      toast.success("메뉴를 저장했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminMenu,
    onSuccess: async () => {
      const deletedKey = deleteTarget?.me_id ?? selectedMenuId ?? 0;
      setDeleteTarget(null);
      setSelectedMenuId(null);
      queryClient.removeQueries({ queryKey: ["admin", "menus", "detail", deletedKey] });
      await queryClient.invalidateQueries({ queryKey: menusListKey });
      toast.success("메뉴를 삭제했습니다.");
    },
    onError: (error: CommandError) => {
      toast.error(error.message);
    },
  });

  const reorderMutation = useMutation<
    AdminMenuReorderResponse,
    CommandError,
    Record<number, string>
  >({
    mutationFn: async (drafts) => reorderAdminMenus(buildMenuReorderInput(menus, drafts)!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: menusListKey });
      toast.success("메뉴 순서를 저장했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const orderedMenus = useMemo(
    () => sortMenusByDraftOrder(menus, orderDrafts),
    [menus, orderDrafts],
  );
  const selectedMenu =
    menuDetailQuery.data?.menu ??
    menus.find((menu) => menu.me_id === selectedMenuId) ??
    null;
  const reorderPayload = buildMenuReorderInput(menus, orderDrafts);

  return {
    createForm,
    createMutation,
    createPayload: buildMenuCreateInput(createValues),
    deleteMutation,
    deleteTarget,
    detailLoading: menuDetailQuery.isLoading,
    editForm,
    error:
      menusQuery.error ??
      menuDetailQuery.error ??
      (createMutation.error instanceof Error && !("request_id" in createMutation.error)
        ? null
        : (createMutation.error as CommandError | null)) ??
      (updateMutation.error instanceof Error && !("request_id" in updateMutation.error)
        ? null
        : (updateMutation.error as CommandError | null)) ??
      reorderMutation.error ??
      deleteMutation.error ??
      null,
    isBusy:
      menusQuery.isLoading ||
      menusQuery.isFetching ||
      menuDetailQuery.isFetching ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      reorderMutation.isPending,
    menus: orderedMenus,
    orderDraftFor(meId: number) {
      return orderDrafts[meId] ?? "";
    },
    pendingOrderChanges: countChangedMenuOrders(menus, orderDrafts),
    resetEdit() {
      editForm.reset(toMenuFormValues(selectedMenu));
    },
    resetOrderDrafts() {
      setOrderDrafts(
        Object.fromEntries(menus.map((menu) => [menu.me_id, String(menu.me_order)])),
      );
    },
    reorderPayload,
    saveOrderDrafts() {
      if (!reorderPayload) {
        toast("변경된 메뉴 순서가 없습니다.");
        return;
      }

      reorderMutation.mutate(orderDrafts);
    },
    selectedMenu,
    selectedMenuId,
    setDeleteTarget,
    setMenuOrderDraft(meId: number, value: string) {
      setOrderDrafts((current) => ({
        ...current,
        [meId]: value,
      }));
    },
    setSelectedMenuId,
    total: menusQuery.data?.pagination.total ?? menus.length,
    updateMutation,
    updatePayload:
      selectedMenu === null ? null : buildMenuUpdateInput(selectedMenu, editValues),
  };
}

function sortMenusByDraftOrder(
  menus: AdminMenu[],
  orderDrafts: Record<number, string>,
) {
  return [...menus].sort((left, right) => {
    const leftOrder = parseDraftOrder(orderDrafts[left.me_id], left.me_order);
    const rightOrder = parseDraftOrder(orderDrafts[right.me_id], right.me_order);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.me_id - right.me_id;
  });
}

function parseDraftOrder(value: string | undefined, fallback: number) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return fallback;
  }

  return Number(normalized);
}
