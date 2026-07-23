import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAdminPopup,
  deleteAdminPopup,
  getAdminPopup,
  getAdminPopupList,
  updateAdminPopup,
  type CommandError,
} from "../../api/client";
import {
  buildPopupCreateInput,
  buildPopupUpdateInput,
  emptyPopupFormValues,
  popupFormSchema,
  toPopupFormValues,
  type PopupFormValues,
} from "./admin-popups-form";
import type { AdminPopup } from "../../types/AdminPopup";
import type { AdminPopupDetailResponse } from "../../types/AdminPopupDetailResponse";
import type { AdminPopupListResponse } from "../../types/AdminPopupListResponse";

const popupsPerPage = 20;

export function useAdminPopupsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedPopupId, setSelectedPopupId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPopup | null>(null);

  const createForm = useForm<PopupFormValues>({
    defaultValues: emptyPopupFormValues(),
    resolver: zodResolver(popupFormSchema),
  });
  const editForm = useForm<PopupFormValues>({
    defaultValues: emptyPopupFormValues(),
    resolver: zodResolver(popupFormSchema),
  });

  const createValues = {
    ...emptyPopupFormValues(),
    ...(useWatch({ control: createForm.control }) ?? {}),
  };
  const editValues = {
    ...emptyPopupFormValues(),
    ...(useWatch({ control: editForm.control }) ?? {}),
  };

  const popupsQuery = useQuery<AdminPopupListResponse, CommandError>({
    queryFn: () =>
      getAdminPopupList({
        page,
        per_page: popupsPerPage,
      }),
    queryKey: ["admin", "popups", "list", page],
    retry: false,
  });

  useEffect(() => {
    const popups = popupsQuery.data?.popups ?? [];

    if (popups.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Async list hydration must clear stale popup selection when the current page has no rows.
      setSelectedPopupId(null);
      return;
    }

    const hasSelected =
      selectedPopupId !== null &&
      popups.some((popup) => popup.nw_id === selectedPopupId);

    if (!hasSelected) {
      setSelectedPopupId(popups[0].nw_id);
    }
  }, [popupsQuery.data, selectedPopupId]);

  const popupDetailQuery = useQuery<AdminPopupDetailResponse, CommandError>({
    enabled: selectedPopupId !== null,
    queryFn: () => getAdminPopup(selectedPopupId ?? 0),
    queryKey: ["admin", "popups", "detail", selectedPopupId ?? 0],
    retry: false,
  });

  useEffect(() => {
    editForm.reset(toPopupFormValues(popupDetailQuery.data?.popup));
  }, [editForm, popupDetailQuery.data]);

  const createMutation = useMutation<
    AdminPopupDetailResponse,
    CommandError,
    PopupFormValues
  >({
    mutationFn: async (values) => createAdminPopup(buildPopupCreateInput(values)!),
    onSuccess: async (response) => {
      createForm.reset(emptyPopupFormValues());
      setSelectedPopupId(response.popup.nw_id);
      queryClient.setQueryData(
        ["admin", "popups", "detail", response.popup.nw_id],
        response,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "popups", "list"] });
      toast.success("팝업을 생성했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation<
    AdminPopupDetailResponse,
    CommandError,
    PopupFormValues
  >({
    mutationFn: async (values) =>
      updateAdminPopup(buildPopupUpdateInput(popupDetailQuery.data!.popup, values)!),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        ["admin", "popups", "detail", response.popup.nw_id],
        response,
      );
      editForm.reset(toPopupFormValues(response.popup));
      await queryClient.invalidateQueries({ queryKey: ["admin", "popups", "list"] });
      toast.success("팝업을 저장했습니다.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminPopup,
    onSuccess: async () => {
      const deletedId = deleteTarget?.nw_id ?? selectedPopupId ?? 0;
      setDeleteTarget(null);
      setSelectedPopupId(null);
      queryClient.removeQueries({ queryKey: ["admin", "popups", "detail", deletedId] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "popups", "list"] });
      toast.success("팝업을 삭제했습니다.");
    },
    onError: (error: CommandError) => {
      toast.error(error.message);
    },
  });

  const selectedPopup = popupDetailQuery.data?.popup ?? null;

  return {
    createForm,
    createMutation,
    createPayload: buildPopupCreateInput(createValues),
    deleteMutation,
    deleteTarget,
    detailLoading: popupDetailQuery.isLoading,
    editForm,
    error:
      popupsQuery.error ??
      popupDetailQuery.error ??
      (createMutation.error instanceof Error && !("request_id" in createMutation.error)
        ? null
        : (createMutation.error as CommandError | null)) ??
      (updateMutation.error instanceof Error && !("request_id" in updateMutation.error)
        ? null
        : (updateMutation.error as CommandError | null)) ??
      deleteMutation.error ??
      null,
    isBusy:
      popupsQuery.isLoading ||
      popupsQuery.isFetching ||
      popupDetailQuery.isFetching ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    page,
    pagination: popupsQuery.data?.pagination,
    popups: popupsQuery.data?.popups ?? [],
    selectedPopup,
    selectedPopupId,
    setDeleteTarget,
    setPage,
    setSelectedPopupId,
    resetEdit() {
      editForm.reset(toPopupFormValues(selectedPopup));
    },
    updateMutation,
    updatePayload:
      selectedPopup === null ? null : buildPopupUpdateInput(selectedPopup, editValues),
  };
}
