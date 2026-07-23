import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteAdminPermission,
  getAdminPermissionList,
  saveAdminPermission,
  type CommandError,
} from "../../api/client";
import {
  buildPermissionSaveInput,
  composePermissionKey,
  emptyPermissionFormValues,
  permissionFormSchema,
  toPermissionFormValues,
  type PermissionFormValues,
} from "./admin-permissions-form";
import type { AdminPermissionItem } from "../../types/AdminPermissionItem";
import type { AdminPermissionListResponse } from "../../types/AdminPermissionListResponse";
import type { AdminPermissionSaveResponse } from "../../types/AdminPermissionSaveResponse";

const permissionsPerPage = 20;

export function useAdminPermissionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filterInput, setFilterInput] = useState("");
  const [submittedFilter, setSubmittedFilter] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPermissionItem | null>(null);

  const form = useForm<PermissionFormValues>({
    defaultValues: emptyPermissionFormValues(),
    resolver: zodResolver(permissionFormSchema),
  });

  const watchedValues = useWatch({ control: form.control });
  const formValues = {
    ...emptyPermissionFormValues(),
    ...(watchedValues ?? {}),
  };

  const permissionsQuery = useQuery<AdminPermissionListResponse, CommandError>({
    queryFn: () =>
      getAdminPermissionList({
        mb_id: submittedFilter,
        page,
        per_page: permissionsPerPage,
      }),
    queryKey: ["admin", "permissions", page, submittedFilter ?? ""],
    retry: false,
  });

  const selectedPermission =
    permissionsQuery.data?.permissions.find(
      (permission) =>
        composePermissionKey(permission.mb_id, permission.au_menu) === selectedKey,
    ) ?? null;

  useEffect(() => {
    const permissions = permissionsQuery.data?.permissions ?? [];

    if (permissions.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Async list hydration must clear stale selection when the result set becomes empty.
      setSelectedKey(null);
      form.reset(emptyPermissionFormValues());
      return;
    }

    const matchedPermission =
      selectedKey === null
        ? null
        : permissions.find(
            (permission) =>
              composePermissionKey(permission.mb_id, permission.au_menu) === selectedKey,
          ) ?? null;

    const nextPermission = matchedPermission ?? permissions[0];
    const nextSelectedKey = composePermissionKey(
      nextPermission.mb_id,
      nextPermission.au_menu,
    );

    if (nextSelectedKey !== selectedKey) {
      setSelectedKey(nextSelectedKey);
    }

    form.reset(toPermissionFormValues(nextPermission));
  }, [form, permissionsQuery.data, selectedKey]);

  const saveMutation = useMutation<
    AdminPermissionSaveResponse,
    CommandError,
    PermissionFormValues
  >({
    mutationFn: async (values) =>
      saveAdminPermission(buildPermissionSaveInput(values)!),
    onSuccess: async (response) => {
      const nextSelectedKey = composePermissionKey(
        response.permission.mb_id,
        response.permission.au_menu,
      );
      setSelectedKey(nextSelectedKey);
      form.reset(toPermissionFormValues(response.permission));
      await queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
      toast.success("권한을 저장했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminPermission,
    onSuccess: async () => {
      setDeleteTarget(null);
      setSelectedKey(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
      toast.success("권한을 삭제했습니다.");
    },
    onError: (error: CommandError) => {
      toast.error(error.message);
    },
  });

  const error =
    permissionsQuery.error ??
    (saveMutation.error instanceof Error && !("request_id" in saveMutation.error)
      ? null
      : (saveMutation.error as CommandError | null)) ??
    deleteMutation.error ??
    null;

  return {
    deleteMutation,
    deleteTarget,
    error,
    filterInput,
    form,
    isBusy:
      permissionsQuery.isLoading ||
      permissionsQuery.isFetching ||
      saveMutation.isPending ||
      deleteMutation.isPending,
    page,
    pagination: permissionsQuery.data?.pagination,
    permissions: permissionsQuery.data?.permissions ?? [],
    saveMutation,
    savePayload: buildPermissionSaveInput(formValues),
    selectedKey,
    selectedPermission,
    setDeleteTarget,
    setFilterInput,
    setPage,
    setSubmittedFilter,
    submittedFilter,
    submitFilter() {
      setPage(1);
      setSubmittedFilter(normalizeFilter(filterInput));
    },
    syncSelection(permission: AdminPermissionItem) {
      setSelectedKey(composePermissionKey(permission.mb_id, permission.au_menu));
      form.reset(toPermissionFormValues(permission));
    },
    resetToBlank() {
      setSelectedKey(null);
      form.reset(emptyPermissionFormValues());
    },
    resetToSelected() {
      if (selectedPermission) {
        form.reset(toPermissionFormValues(selectedPermission));
      }
    },
  };
}

function normalizeFilter(value: string) {
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}
